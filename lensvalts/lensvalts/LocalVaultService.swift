import Foundation
import SwiftUI
import PhotosUI

struct VaultAsset: Identifiable {
    let id = UUID()
    let url: URL
    let isVideo: Bool
}

class LocalVaultService {
    static let shared = LocalVaultService()
    
    private var vaultDirectory: URL {
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        let vaultPath = paths[0].appendingPathComponent("LensVaultLocal")
        
        if !FileManager.default.fileExists(atPath: vaultPath.path) {
            try? FileManager.default.createDirectory(at: vaultPath, withIntermediateDirectories: true, attributes: nil)
        }
        return vaultPath
    }
    
    func fetchLocalAssets() -> [VaultAsset] {
        guard let files = try? FileManager.default.contentsOfDirectory(at: vaultDirectory, includingPropertiesForKeys: [.creationDateKey]) else {
            return []
        }
        
        // Sort files by creation date (newest first)
        let sortedFiles = files.sorted { u1, u2 in
            let date1 = (try? u1.resourceValues(forKeys: [.creationDateKey]))?.creationDate ?? Date.distantPast
            let date2 = (try? u2.resourceValues(forKeys: [.creationDateKey]))?.creationDate ?? Date.distantPast
            return date1 > date2
        }
        
        return sortedFiles.map { url in
            let isVideo = ["mp4", "mov", "m4v"].contains(url.pathExtension.lowercased())
            return VaultAsset(url: url, isVideo: isVideo)
        }
    }
    
    func saveMedia(from items: [PhotosPickerItem], completion: @escaping () -> Void) {
        Task {
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    let isVideo = item.supportedContentTypes.contains { type in
                        type.identifier.contains("movie") || type.identifier.contains("video") || type.identifier.contains("mp4")
                    }
                    let ext = isVideo ? "mp4" : "jpg"
                    let destURL = self.vaultDirectory.appendingPathComponent(UUID().uuidString + "." + ext)
                    try? data.write(to: destURL)
                    print("Saved item to vault: \(destURL.lastPathComponent)")
                    
                    var lat: Double? = nil
                    var lon: Double? = nil
                    
                    if let identifier = item.itemIdentifier {
                        let result = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
                        if let asset = result.firstObject, let location = asset.location {
                            lat = location.coordinate.latitude
                            lon = location.coordinate.longitude
                        }
                    }
                    
                    // Sync up to the backend
                    PhotoService.uploadPhoto(fileURL: destURL, latitude: lat, longitude: lon) { media in
                        if let media = media {
                            print("Synced \(media.id) to backend with location (\(lat ?? 0), \(lon ?? 0))")
                            NotificationCenter.default.post(name: NSNotification.Name("CameraUploadDidComplete"), object: nil)
                        } else {
                            print("Failed to sync \(destURL.lastPathComponent)")
                        }
                    }
                }
            }
            
            DispatchQueue.main.async {
                completion()
            }
        }
    }
    
    func saveMedia(fromURLs urls: [URL], completion: @escaping () -> Void) {
        for url in urls {
            guard url.startAccessingSecurityScopedResource() else { continue }
            defer { url.stopAccessingSecurityScopedResource() }
            
            let destURL = self.vaultDirectory.appendingPathComponent(UUID().uuidString + "." + url.pathExtension)
            do {
                if FileManager.default.fileExists(atPath: destURL.path) {
                    try FileManager.default.removeItem(at: destURL)
                }
                try FileManager.default.copyItem(at: url, to: destURL)
                print("Saved Mac file to vault: \(destURL.lastPathComponent)")
            } catch {
                print("Copy error: \(error.localizedDescription)")
            }
        }
        
        DispatchQueue.main.async {
            completion()
        }
    }
}

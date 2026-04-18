import Foundation
import SwiftUI
import Combine

struct Album: Identifiable, Codable {
    let id: UUID
    var name: String
    var assetIdentifiers: [String]
}

class AlbumsManager: ObservableObject {
    static let shared = AlbumsManager()
    
    @Published var albums: [Album] = []
    
    private let albumsKey = "LensVault_Albums"
    
    private init() {
        loadAlbums()
        if albums.isEmpty {
            createAlbum(name: "Trip")
            createAlbum(name: "Friends")
        }
    }
    
    func loadAlbums() {
        if let data = UserDefaults.standard.data(forKey: albumsKey),
           let decoded = try? JSONDecoder().decode([Album].self, from: data) {
            albums = decoded
        }
    }
    
    func saveAlbums() {
        if let encoded = try? JSONEncoder().encode(albums) {
            UserDefaults.standard.set(encoded, forKey: albumsKey)
        }
    }
    
    func createAlbum(name: String) {
        let newAlbum = Album(id: UUID(), name: name, assetIdentifiers: [])
        albums.append(newAlbum)
        saveAlbums()
    }
    
    func addAsset(to albumID: UUID, assetIdentifier: String) {
        if let index = albums.firstIndex(where: { $0.id == albumID }) {
            if !albums[index].assetIdentifiers.contains(assetIdentifier) {
                albums[index].assetIdentifiers.append(assetIdentifier)
                saveAlbums()
            }
        }
    }
    
    func removeAsset(from albumID: UUID, assetIdentifier: String) {
        if let index = albums.firstIndex(where: { $0.id == albumID }) {
            albums[index].assetIdentifiers.removeAll { $0 == assetIdentifier }
            saveAlbums()
        }
    }
}

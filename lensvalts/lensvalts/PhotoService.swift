import Foundation
import Photos

struct PhotoListResponse: Codable, Sendable {
    let photos: [VaultMedia]
    let total: Int
    let page: Int
    let pages: Int
}

class PhotoService {
    static let BASE_URL = "http://10.238.118.148:8000"
    
    static func getAuthRequest(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        if let token = AuthService.shared.getAuthHeader() {
            request.setValue(token, forHTTPHeaderField: "Authorization")
        }
        return request
    }
    
    static func fetchPhotos(completion: @escaping ([VaultMedia]) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/photos/") else {
            completion([])
            return
        }
        
        URLSession.shared.dataTask(with: getAuthRequest(url: url)) { data, response, error in
            if let error = error {
                print("❌ Network error:", error)
                DispatchQueue.main.async { completion([]) }
                return
            }
            guard let data = data else {
                DispatchQueue.main.async { completion([]) }
                return
            }
            do {
                let resp = try JSONDecoder().decode(PhotoListResponse.self, from: data)
                DispatchQueue.main.async { completion(resp.photos) }
            } catch {
                print("❌ Decode error:", error)
                DispatchQueue.main.async { completion([]) }
            }
        }.resume()
    }
    
    static func fetchAssets() -> [PHAsset] {
        let fetchResult = PHAsset.fetchAssets(with: nil)
        var assets: [PHAsset] = []
        fetchResult.enumerateObjects { asset, _, _ in
            assets.append(asset)
        }
        return assets
    }
    
    static func uploadPhoto(fileURL: URL, latitude: Double? = nil, longitude: Double? = nil, completion: @escaping (VaultMedia?) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/photos/upload") else {
            completion(nil)
            return
        }
        var request = getAuthRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        let filename = fileURL.lastPathComponent
        let mimeType = filename.lowercased().hasSuffix("mp4") ? "video/mp4" : "image/jpeg"
        
        if let fileData = try? Data(contentsOf: fileURL) {
            if let lat = latitude, let lon = longitude {
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"latitude\"\r\n\r\n".data(using: .utf8)!)
                body.append("\(lat)\r\n".data(using: .utf8)!)
                
                body.append("--\(boundary)\r\n".data(using: .utf8)!)
                body.append("Content-Disposition: form-data; name=\"longitude\"\r\n\r\n".data(using: .utf8)!)
                body.append("\(lon)\r\n".data(using: .utf8)!)
            }
            
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
            body.append(fileData)
            body.append("\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let data = data, let httpResp = response as? HTTPURLResponse, (200...202).contains(httpResp.statusCode) {
                let media = try? JSONDecoder().decode(VaultMedia.self, from: data)
                DispatchQueue.main.async { completion(media) }
            } else {
                DispatchQueue.main.async { completion(nil) }
            }
        }.resume()
    }
}

import Foundation
import SwiftUI
import Combine

import Foundation
import SwiftUI
import Combine

struct AlbumServer: Identifiable, Codable {
    let id: String
    var name: String
    var description: String?
    var cover_photo_id: String?
    var photo_count: Int?
    var is_public: Bool?
    var share_token: String?
    var cover_url: String?
}

struct AlbumDetailResponse: Codable {
    let id: String
    var name: String
    var photo_count: Int?
    var photos: [VaultMedia]
}

class AlbumsManager: ObservableObject {
    static let shared = AlbumsManager()
    
    @Published var albums: [AlbumServer] = []
    
    // We keep this init private, but don't call anything synchronously
    private init() {}
    
    func loadAlbums() {
        guard let token = AuthService.shared.getToken(),
              let url = URL(string: "\(PhotoService.BASE_URL)/api/albums/") else { return }
        
        var request = URLRequest(url: url)
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data {
                if let decoded = try? JSONDecoder().decode([AlbumServer].self, from: data) {
                    DispatchQueue.main.async {
                        self.albums = decoded
                    }
                }
            }
        }.resume()
    }
    
    func createAlbum(name: String) {
        guard let token = AuthService.shared.getToken(),
              let url = URL(string: "\(PhotoService.BASE_URL)/api/albums/") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["name": name, "description": ""]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { _, _, _ in
            self.loadAlbums()
        }.resume()
    }
    
    func addPhotos(albumId: String, photoIds: [String]) {
         guard let token = AuthService.shared.getToken(),
               let url = URL(string: "\(PhotoService.BASE_URL)/api/albums/\(albumId)/photos") else { return }
         
         var request = URLRequest(url: url)
         request.httpMethod = "POST"
         request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
         request.addValue("application/json", forHTTPHeaderField: "Content-Type")
         
         let body: [String: Any] = ["photo_ids": photoIds]
         request.httpBody = try? JSONSerialization.data(withJSONObject: body)
         
         URLSession.shared.dataTask(with: request) { _, _, _ in
             self.loadAlbums()
         }.resume()
    }
}

import SwiftUI
import PhotosUI

struct AlbumDetailView: View {
    var album: AlbumServer
    @State private var albumPhotos: [VaultMedia] = []
    let columns = [GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2)]
    
    var body: some View {
        ScrollView {
            if albumPhotos.isEmpty {
                VStack {
                    Spacer()
                    Text("No photos in \(album.name)")
                        .foregroundColor(.gray)
                    Spacer()
                }
                .frame(minHeight: 200)
            } else {
                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(albumPhotos) { photo in
                        NavigationLink(destination: VaultDetailPagerView(photos: albumPhotos, selectedPhotoID: photo.id)) {
                            VaultMediaCell(media: photo)
                        }
                    }
                }
            }
        }
        .navigationTitle(album.name)
        .onAppear {
            loadAssets()
        }
    }
    
    private func loadAssets() {
        guard let token = AuthService.shared.getToken(),
              let url = URL(string: "\(PhotoService.BASE_URL)/api/albums/\(album.id)") else { return }
        
        var request = URLRequest(url: url)
        request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            if let data = data {
                if let decoded = try? JSONDecoder().decode(AlbumDetailResponse.self, from: data) {
                    DispatchQueue.main.async {
                        self.albumPhotos = decoded.photos
                    }
                }
            }
        }.resume()
    }
}

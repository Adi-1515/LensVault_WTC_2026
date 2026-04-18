import SwiftUI
import AVKit

struct VaultMediaCell: View {
    var media: VaultMedia
    @State private var image: UIImage?
    
    var isVideo: Bool {
        guard let urlString = media.url?.lowercased() else { return false }
        return urlString.hasSuffix(".mp4") || urlString.hasSuffix(".mov") || urlString.hasSuffix(".m4v")
    }
    
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            
            if let img = image {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
            } else {
                Color.gray
                    .overlay(ProgressView())
            }
            
            if isVideo {
                HStack(spacing: 4) {
                    Image(systemName: "video.fill")
                        .font(.caption2)
                }
                .padding(4)
                .background(Color.black.opacity(0.6))
                .foregroundColor(.white)
                .cornerRadius(4)
                .padding(4)
            }
        }
        .frame(height: 120)
        .clipped()
        .onAppear {
            loadThumbnail()
        }
    }
    
    func loadThumbnail() {
        let path = media.thumbnail_url ?? "/api/photos/\(media.id)/thumbnail/small"
        let fullURLString = path.hasPrefix("http") ? path : PhotoService.BASE_URL + path
        let urlWithToken = fullURLString + (fullURLString.contains("?") ? "&" : "?") + "token=\(AuthService.shared.getToken() ?? "")"
        guard let url = URL(string: urlWithToken) else { return }
        
        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data = data, let uiImage = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.image = uiImage
                }
            }
        }.resume()
    }
}

struct VaultDetailView: View {
    var media: VaultMedia
    @State private var player: AVPlayer?
    @State private var image: UIImage?
    
    var isVideo: Bool {
        guard let urlString = media.url?.lowercased() else { return false }
        return urlString.hasSuffix(".mp4") || urlString.hasSuffix(".mov") || urlString.hasSuffix(".m4v")
    }
    
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            
            if isVideo {
                if let player = player {
                    VideoPlayer(player: player)
                        .onAppear { player.play() }
                        .onDisappear { player.pause() }
                } else {
                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            } else {
                if let img = image {
                    Image(uiImage: img)
                        .resizable()
                        .scaledToFit()
                } else {
                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            }
        }
        .onAppear {
            loadAsset()
        }
    }
    
    func loadAsset() {
        let path = isVideo ? (media.url ?? "") : "/api/photos/\(media.id)/thumbnail/large"
        guard !path.isEmpty else { return }
        
        let fullURLString = path.hasPrefix("http") ? path : PhotoService.BASE_URL + path
        let urlWithToken = fullURLString + (fullURLString.contains("?") ? "&" : "?") + "token=\(AuthService.shared.getToken() ?? "")"
        guard let url = URL(string: urlWithToken) else { return }
        
        if isVideo {
            self.player = AVPlayer(url: url)
        } else {
            URLSession.shared.dataTask(with: url) { data, _, _ in
                if let data = data, let uiImage = UIImage(data: data) {
                    DispatchQueue.main.async {
                        self.image = uiImage
                    }
                }
            }.resume()
        }
    }
}

struct VaultDetailPagerView: View {
    let photos: [VaultMedia]
    @State var selectedPhotoID: String
    
    var body: some View {
        TabView(selection: $selectedPhotoID) {
            ForEach(photos) { photo in
                VaultDetailView(media: photo)
                    .tag(photo.id)
            }
        }
        .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
        .ignoresSafeArea()
        .toolbar(.hidden, for: .tabBar)
    }
}

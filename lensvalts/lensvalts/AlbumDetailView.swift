import SwiftUI
import Photos
import PhotosUI
import Combine

struct AlbumDetailView: View {
    var album: Album
    @StateObject private var albumsManager = AlbumsManager.shared
    @State private var showPhotoPicker = false
    @State private var selectedItems: [PhotosPickerItem] = []
    
    @State private var assets: [PHAsset] = []
    let columns = [GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2), GridItem(.flexible(), spacing: 2)]
    
    var body: some View {
        ScrollView {
            let currentAlbum = albumsManager.albums.first(where: { $0.id == album.id }) ?? album
            let albumAssets = assets.filter { currentAlbum.assetIdentifiers.contains($0.localIdentifier) }
            
            if albumAssets.isEmpty {
                VStack {
                    Spacer()
                    Text("No photos in \(album.name)")
                        .foregroundColor(.gray)
                    Spacer()
                }
                .frame(minHeight: 200)
            } else {
                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(albumAssets, id: \.localIdentifier) { asset in
                        NavigationLink(destination: PhotoDetailView(asset: asset)) {
                            PhotoCell(asset: asset)
                        }
                    }
                }
            }
        }
        .navigationTitle(album.name)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                PhotosPicker(selection: $selectedItems, matching: .any(of: [.images, .videos]), photoLibrary: .shared()) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
            }
        }
        .onAppear {
            AppState.shared.isFullScreen = true
            loadAssets()
        }
        .onDisappear {
            AppState.shared.isFullScreen = false
        }
        .onChange(of: selectedItems) { newItems in
            var currentList = UserDefaults.standard.stringArray(forKey: "Imported_PHAssets") ?? []
            for item in newItems {
                if let identifier = item.itemIdentifier {
                    if !currentList.contains(identifier) {
                        currentList.append(identifier)
                    }
                    albumsManager.addAsset(to: album.id, assetIdentifier: identifier)
                }
            }
            UserDefaults.standard.set(currentList, forKey: "Imported_PHAssets")
            
            // Reload assets to capture the newly imported items
            loadAssets()
            
            // Kick off local media save asynchronously matching the main LocalVault sync
            LocalVaultService.shared.saveMedia(from: newItems) { }
            
            selectedItems.removeAll()
        }
    }
    
    private func loadAssets() {
        let imported = UserDefaults.standard.stringArray(forKey: "Imported_PHAssets") ?? []
        assets = PhotoService.fetchAssets().filter { imported.contains($0.localIdentifier) }
    }
}

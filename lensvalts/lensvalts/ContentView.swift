import SwiftUI
import Photos
import AVKit
import PhotosUI
import Combine

class AppState: ObservableObject {
    static let shared = AppState()
    @Published var isFullScreen = false
}

struct ContentView: View {
    @State private var persons: [Person] = []
    @State private var clusters: [Cluster] = []
    @State private var personPhotos: [String: [VaultMedia]] = [:]
    @State private var serverPhotos: [VaultMedia] = []
    @State private var assets: [PHAsset] = []
    @State private var selectedTab: Int = 0
    @State private var searchText: String = ""
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var vaultAssets: [VaultAsset] = []
    @State private var isUploading = false
    @State private var previousTab: Int = 0
    @StateObject private var appState = AppState.shared
    
    
    @State private var collectionMode: Int = 0
    @StateObject private var favoritesManager = FavoritesManager.shared
    @StateObject private var albumsManager = AlbumsManager.shared
    
    @State private var isCreatingAlbum = false
    @State private var newAlbumName = ""
    @State private var showAssignCluster: Cluster? = nil
    @State private var assignNameInput: String = ""

    let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]
    
    
    var body: some View {
        ZStack {
            
            NavigationView {
                VStack(spacing: 0) {
                    
                    headerView()
                    
                    TabView(selection: $selectedTab) {
                        libraryView()
                            .tabItem { Label("Library", systemImage: "photo.fill.on.rectangle.fill") }
                            .tag(0)
                        
                        collectionScreen()
                            .tabItem { Label("Collection", systemImage: "rectangle.stack.fill") }
                            .tag(1)
                        
                        groupingView()
                            .tabItem { Label("Grouping", systemImage: "square.grid.2x2.fill") }
                            .tag(2)
                        
                        searchView()
                            .tabItem { Label("Search", systemImage: "magnifyingglass") }
                            .tag(3)
                    }
                }
                .navigationBarHidden(true)
            }
        }

        .onAppear {
            loadFaces()
            
            PhotoService.fetchPhotos { photos in
                self.serverPhotos = photos
            }
        }
        .onChange(of: selectedItems) { newItems in
            guard !newItems.isEmpty else { return }
            isUploading = true
            
            var currentList = UserDefaults.standard.stringArray(forKey: "Imported_PHAssets") ?? []
            for item in newItems {
                if let identifier = item.itemIdentifier, !currentList.contains(identifier) {
                    currentList.append(identifier)
                }
            }
            UserDefaults.standard.set(currentList, forKey: "Imported_PHAssets")
            
            LocalVaultService.shared.saveMedia(from: newItems) {
                isUploading = false
                selectedItems.removeAll()
                loadVaultAssets()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("CameraUploadDidComplete"))) { _ in
            refreshData()
        }
    }
    
    func loadVaultAssets() {
        vaultAssets = LocalVaultService.shared.fetchLocalAssets()
        
        let imported = UserDefaults.standard.stringArray(forKey: "Imported_PHAssets") ?? []
        let allAssets = PhotoService.fetchAssets()
        assets = allAssets.filter { imported.contains($0.localIdentifier) }
    }
    func loadFaces() {
        FaceService.fetchPersons { data in
            self.persons = data
            for person in data {
                FaceService.fetchPersonPhotos(personId: person.id) { photos in
                    self.personPhotos[person.id] = photos
                }
            }
        }
        FaceService.fetchClusters { data in
            self.clusters = data
        }
    }
    func refreshData() {
        PhotoService.fetchPhotos { photos in
            self.serverPhotos = photos
        }
        loadFaces()
        albumsManager.loadAlbums()
    }
}
extension ContentView {
    
    struct ServerAssetGroup: Identifiable {
        let id = UUID()
        let title: String
        let photos: [VaultMedia]
    }
    
    var libraryGroupedServerPhotos: [ServerAssetGroup] {
        let calendar = Calendar.current
        var dict: [Date: [VaultMedia]] = [:]
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        let formatterNoFrac = ISO8601DateFormatter()
        formatterNoFrac.formatOptions = [.withInternetDateTime]
        
        for photo in serverPhotos {
            var creationDate = Date()
            if let dateStr = photo.canonical_date {
                if let d = formatter.date(from: dateStr) ?? formatterNoFrac.date(from: dateStr) {
                    creationDate = d
                }
            }
            let startOfDay = calendar.startOfDay(for: creationDate)
            dict[startOfDay, default: []].append(photo)
        }
        
        let sortedDates = dict.keys.sorted(by: >)
        return sortedDates.map { date in
            let title: String
            if calendar.isDateInToday(date) {
                title = "Today"
            } else if calendar.isDateInYesterday(date) {
                title = "Yesterday"
            } else {
                let formatter = DateFormatter()
                formatter.dateStyle = .medium
                title = formatter.string(from: date)
            }
            return ServerAssetGroup(title: title, photos: dict[date]!)
        }
    }
    
    func libraryView() -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                ForEach(libraryGroupedServerPhotos) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(group.title)
                            .font(.headline)
                            .padding(.horizontal)
                        
                        LazyVGrid(columns: columns, spacing: 2) {
                            ForEach(group.photos) { photo in
                                NavigationLink(destination: VaultDetailPagerView(photos: serverPhotos, selectedPhotoID: photo.id)) {
                                    VaultMediaCell(media: photo)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.bottom, 100)
        }
        .refreshable {
            refreshData()
        }
    }
    
    func collectionScreen() -> some View {
        VStack(spacing: 0) {
            Picker("Mode", selection: $collectionMode) {
                Text("Favorites").tag(0)
                Text("Albums").tag(1)
                Text("Maps").tag(2)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()
            
            if collectionMode == 0 {
                favoritesView()
            } else if collectionMode == 1 {
                albumsView()
            } else {
                VaultMapView(photos: serverPhotos)
            }
        }
        .alert("New Album", isPresented: $isCreatingAlbum) {
            TextField("Album Name", text: $newAlbumName)
            Button("Create", action: {
                if !newAlbumName.isEmpty {
                    albumsManager.createAlbum(name: newAlbumName)
                }
            })
            Button("Cancel", role: .cancel, action: {})
        }
    }
    
    func favoritesView() -> some View {
        let favoriteAssets = serverPhotos.filter { $0.is_favourite == true }
        return ScrollView {
            if favoriteAssets.isEmpty {
                VStack {
                    Spacer()
                    Text("No Favorites yet")
                        .foregroundColor(.gray)
                    Spacer()
                }
                .frame(minHeight: 300)
            } else {
                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(favoriteAssets) { photo in
                        NavigationLink(destination: VaultDetailPagerView(photos: favoriteAssets, selectedPhotoID: photo.id)) {
                            VaultMediaCell(media: photo)
                        }
                    }
                }
            }
        }
    }
    func groupingView() -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                
                Button(action: {
                    FaceService.triggerClustering {
                        loadFaces()
                    }
                }) {
                    Text("Trigger Face Scan")
                        .font(.subheadline)
                        .padding(8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
                .padding(.horizontal)
                
                if !clusters.isEmpty {
                    Text("Unassigned Clusters (\(clusters.count))")
                        .font(.title2).bold().padding(.horizontal)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(clusters) { cluster in
                                VStack {
                                    if let faceId = cluster.sample_face_id {
                                        AsyncImage(url: URL(string: "\(PhotoService.BASE_URL)/api/faces/\(faceId)/image?token=\(AuthService.shared.getToken() ?? "")")) { img in
                                            img.resizable().scaledToFill()
                                        } placeholder: {
                                            Color.gray
                                        }
                                        .frame(width: 80, height: 80)
                                        .clipShape(Circle())
                                    } else {
                                        Circle().fill(Color.gray).frame(width: 80, height: 80)
                                    }
                                    Text("\(cluster.face_count) photos")
                                        .font(.caption)
                                    Button("Name it") {
                                        showAssignCluster = cluster
                                    }
                                    .font(.caption2)
                                    .buttonStyle(.borderedProminent)
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                
                if persons.isEmpty {
                    Text("No people yet")
                        .foregroundColor(.gray)
                        .padding()
                }
                
                ForEach(persons) { person in
                    let photos = personPhotos[person.id] ?? []
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            if let faceId = person.sample_face_id {
                                AsyncImage(url: URL(string: "\(PhotoService.BASE_URL)/api/faces/\(faceId)/image?token=\(AuthService.shared.getToken() ?? "")")) { img in
                                    img.resizable().scaledToFill()
                                } placeholder: {
                                    Color.gray
                                }
                                .frame(width: 40, height: 40)
                                .clipShape(Circle())
                            }
                            Text(person.name)
                                .font(.headline)
                        }
                        .padding(.horizontal)
                        
                        if photos.isEmpty {
                            Text("No photos")
                                .foregroundColor(.gray)
                                .padding(.horizontal)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 4) {
                                    ForEach(photos) { photo in
                                        NavigationLink(destination: VaultDetailPagerView(photos: photos, selectedPhotoID: photo.id)) {
                                            if let urlStr = photo.url, let assetUrl = URL(string: urlStr) {
                                                AsyncImage(url: URL(string: "\(PhotoService.BASE_URL)/api/photos/\(photo.id)/thumbnail/small?token=\(AuthService.shared.getToken() ?? "")")) { img in
                                                    img.resizable().scaledToFill()
                                                } placeholder: {
                                                    Color.gray
                                                }
                                                .frame(width: 100, height: 100)
                                                .clipped()
                                            } else {
                                                // Fallback if local asset is referenced, or just standard box
                                                AsyncImage(url: URL(string: "\(PhotoService.BASE_URL)/api/photos/\(photo.id)/thumbnail/small?token=\(AuthService.shared.getToken() ?? "")")) { img in
                                                    img.resizable().scaledToFill()
                                                } placeholder: {
                                                    Color.gray
                                                }
                                                .frame(width: 100, height: 100)
                                                .clipped()
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                    .padding(.bottom, 12)
                }
            }
            .padding(.top)
        }
        .alert("Who is this?", isPresented: Binding(
            get: { showAssignCluster != nil },
            set: { if !$0 { showAssignCluster = nil } }
        )) {
            TextField("Name", text: $assignNameInput)
            Button("Save") {
                if let cluster = showAssignCluster, !assignNameInput.isEmpty {
                    FaceService.assignCluster(clusterId: cluster.cluster_id, name: assignNameInput) { _ in
                        assignNameInput = ""
                        loadFaces()
                    }
                }
            }
            Button("Cancel", role: .cancel) { assignNameInput = "" }
        }
    }
    func searchView() -> some View {
        let filtered = serverPhotos.filter { photo in
            if searchText.isEmpty { return true }
            return photo.filename?.localizedCaseInsensitiveContains(searchText) == true
        }
        
        return VStack {
            TextField("Search...", text: $searchText)
                .padding(10)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(10)
                .padding(.horizontal)
            
            ScrollView {
                if filtered.isEmpty {
                    Text("No results found in your Vault.")
                        .foregroundColor(.gray)
                        .padding()
                } else {
                    LazyVGrid(columns: columns, spacing: 2) {
                        ForEach(filtered) { photo in
                            NavigationLink(destination: VaultDetailPagerView(photos: serverPhotos, selectedPhotoID: photo.id)) {
                                VaultMediaCell(media: photo)
                            }
                        }
                    }
                }
            }
        }
    }
    
    func albumsView() -> some View {
            ZStack(alignment: .bottomTrailing) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        ForEach(albumsManager.albums) { album in
                            NavigationLink(destination: AlbumDetailView(album: album)) {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        if let urlStr = album.cover_url, let url = URL(string: "\(PhotoService.BASE_URL)\(urlStr)?token=\(AuthService.shared.getToken() ?? "")") {
                                            AsyncImage(url: url) { img in
                                                img.resizable().scaledToFill()
                                            } placeholder: {
                                                Color.gray
                                            }
                                            .frame(width: 80, height: 80)
                                            .cornerRadius(8)
                                            .clipped()
                                        } else {
                                            Color.gray
                                                .frame(width: 80, height: 80)
                                                .cornerRadius(8)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(album.name)
                                                .font(.headline)
                                                .foregroundColor(.primary)
                                            Text("\(album.photo_count ?? 0) photos")
                                                .font(.subheadline)
                                                .foregroundColor(.gray)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .foregroundColor(.gray)
                                    }
                                    .padding(.horizontal)
                                    .padding(.vertical, 8)
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.top)
                    .padding(.bottom, 100)
                }
                .refreshable {
                    refreshData()
                }
                
                Button(action: {
                    newAlbumName = ""
                    isCreatingAlbum = true
                }) {
                    Image(systemName: "plus")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(width: 56, height: 56)
                        .background(Color.blue)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.3), radius: 6, x: 0, y: 4)
                }
                .padding(.trailing, 24)
                .padding(.bottom, 100)
            }
        }
        
        var headerTitle: String {
            switch selectedTab {
            case 0: return "LensVault"
            case 1: return "Collection"
            case 2: return "Grouping"
            case 3: return "Search"
            default: return "LensVault"
            }
        }
        
        func headerView() -> some View {
            HStack {
                Text(headerTitle)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                if selectedTab == 0 {
                    PhotosPicker(selection: $selectedItems, matching: .any(of: [.images, .videos]), photoLibrary: .shared()) {
                        if isUploading {
                            ProgressView()
                                .padding(8)
                                .background(Color.gray.opacity(0.1))
                                .clipShape(Circle())
                        } else {
                            Image(systemName: "plus")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundColor(.black)
                                .padding(10)
                                .background(Color.gray.opacity(0.1))
                                .clipShape(Circle())
                        }
                    }
                }
            }
            .padding()
        }
    func tabBar() -> some View {
        Group {
            if selectedTab == 3 {
                searchTabBar()
            } else {
                mainTabBar()
            }
        }
    }
    
    func mainTabBar() -> some View {
        HStack(spacing: 16) {
            
            // Main Pill
            HStack(spacing: 0) {
                tabItem(icon: "photo.on.rectangle", label: "Library", index: 0)
                tabItem(icon: "rectangle.stack", label: "Collection", index: 1)
                tabItem(icon: "square.grid.2x2", label: "Grouping", index: 2)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 8)
            .background(.regularMaterial)
            .clipShape(Capsule())
            .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 4)
            
            // Separate Search Circle
            Button(action: {
                withAnimation(.spring()) {
                    previousTab = selectedTab
                    selectedTab = 3
                }
            }) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(.primary)
                    .frame(width: 60, height: 60)
                    .background(.regularMaterial)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 4)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 16)
    }

    var previousTabIcon: String {
        switch previousTab {
        case 0: return "photo.on.rectangle"
        case 1: return "rectangle.stack"
        case 2: return "square.grid.2x2"
        default: return "photo.on.rectangle"
        }
    }

    func searchTabBar() -> some View {
        HStack(spacing: 16) {
            
            // Revert-To-Previous Button
            Button(action: {
                withAnimation(.spring()) {
                    selectedTab = previousTab
                }
            }) {
                Image(systemName: previousTabIcon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.primary)
                    .frame(width: 60, height: 60)
                    .background(.regularMaterial)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 4)
            }
            
            // Search Bar Pill
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.title2)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                TextField("Games, Apps and More", text: $searchText)
                    .font(.system(size: 17))
                    .foregroundColor(.primary)
                
                Image(systemName: "mic")
                    .font(.title3)
                    .foregroundColor(.primary)
            }
            .padding(.horizontal, 16)
            .frame(height: 60)
            .background(.regularMaterial)
            .clipShape(Capsule())
            .shadow(color: Color.black.opacity(0.15), radius: 10, x: 0, y: 4)
        }
        .padding(.horizontal)
        .padding(.bottom, 16)
    }
    
    func tabItem(icon: String, label: String, index: Int) -> some View {
        Button(action: {
            withAnimation(.spring()) {
                selectedTab = index
            }
        }) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: selectedTab == index ? .semibold : .regular))
                    .foregroundColor(selectedTab == index ? .blue : .primary)
                
                Text(label)
                    .font(.system(size: 11, weight: selectedTab == index ? .semibold : .medium))
                    .foregroundColor(selectedTab == index ? .blue : .primary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                ZStack {
                    if selectedTab == index {
                        Capsule()
                            .fill(Color.gray.opacity(0.15))
                            .padding(.horizontal, 4)
                    }
                }
            )
        }
    }
}

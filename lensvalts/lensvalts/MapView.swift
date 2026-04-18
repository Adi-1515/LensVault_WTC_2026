import SwiftUI
import MapKit
import Photos
import CoreLocation

struct PhotoLocation: Identifiable {
    let id = UUID()
    let asset: PHAsset
    let coordinate: CLLocationCoordinate2D
}

struct LocationGroup: Identifiable {
    let id = UUID()
    var title: String
    let assets: [PHAsset]
    let centerCoordinate: CLLocationCoordinate2D
}

struct VaultMapView: View {
    var assets: [PHAsset]
    
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    
    @State private var photoLocations: [PhotoLocation] = []
    @State private var locationGroups: [LocationGroup] = []
    
    var body: some View {
        VStack(spacing: 0) {
            Map(coordinateRegion: $region, annotationItems: photoLocations) { item in
                MapAnnotation(coordinate: item.coordinate) {
                    NavigationLink(destination: PhotoDetailView(asset: item.asset)) {
                        PhotoCell(asset: item.asset)
                            .frame(width: 50, height: 50)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                            .shadow(radius: 3)
                    }
                }
            }
            .frame(height: 300)
            .cornerRadius(12)
            .padding()
            
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 20) {
                    if locationGroups.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            Text("No photos with location data found.")
                                .foregroundColor(.gray)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                    }
                    
                    ForEach(locationGroups) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(group.title)
                                        .font(.headline)
                                    Text("\(group.assets.count) photos")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                                
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        region.center = group.centerCoordinate
                                        region.span = MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                                    }
                                }) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "location.fill")
                                        Text("Center")
                                    }
                                    .font(.subheadline.bold())
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(20)
                                }
                            }
                            .padding(.horizontal)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 4) {
                                    ForEach(group.assets, id: \.localIdentifier) { asset in
                                        NavigationLink(destination: PhotoDetailView(asset: asset)) {
                                            PhotoCell(asset: asset)
                                                .frame(width: 110, height: 110)
                                                .cornerRadius(8)
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
        }
        .onAppear {
            processLocations()
        }
    }
    
    func processLocations() {
        var locations: [PhotoLocation] = []
        var groupDict: [String: [PHAsset]] = [:]
        var coordDict: [String: CLLocationCoordinate2D] = [:]
        
        for asset in assets {
            if let loc = asset.location {
                locations.append(PhotoLocation(asset: asset, coordinate: loc.coordinate))
                
                // Group by rounding coordinates to 1 decimal place (~11km)
                let latRound = String(format: "%.1f", loc.coordinate.latitude)
                let lonRound = String(format: "%.1f", loc.coordinate.longitude)
                let key = "\(latRound),\(lonRound)"
                
                groupDict[key, default: []].append(asset)
                coordDict[key] = loc.coordinate
            }
        }
        
        self.photoLocations = locations
        
        // Initial group setup
        var newGroups = groupDict.map { key, assets in
            LocationGroup(title: "Locating...", assets: assets, centerCoordinate: coordDict[key]!)
        }
        
        self.locationGroups = newGroups
        
        // Geocode each group asynchronously
        let geocoder = CLGeocoder()
        for i in 0..<newGroups.count {
            let group = newGroups[i]
            let location = CLLocation(latitude: group.centerCoordinate.latitude, longitude: group.centerCoordinate.longitude)
            
            geocoder.reverseGeocodeLocation(location) { placemarks, error in
                DispatchQueue.main.async {
                    if let placemark = placemarks?.first {
                        let city = placemark.locality ?? placemark.subAdministrativeArea ?? placemark.name ?? "Unknown"
                        let state = placemark.administrativeArea ?? ""
                        let title = state.isEmpty ? city : "\(city), \(state)"
                        
                        if i < self.locationGroups.count {
                            self.locationGroups[i].title = title
                        }
                    } else {
                        if i < self.locationGroups.count {
                            self.locationGroups[i].title = "Unknown Location"
                        }
                    }
                }
            }
        }
        
        if let first = locations.first {
            region.center = first.coordinate
        }
    }
}

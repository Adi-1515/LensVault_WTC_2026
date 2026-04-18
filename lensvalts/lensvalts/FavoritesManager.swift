import Foundation
import SwiftUI
import Combine

class FavoritesManager: ObservableObject {
    static let shared = FavoritesManager()
    
    @Published var favorites: Set<String> = []
    
    private let favoritesKey = "LensVault_Favorites"
    
    private init() {
        loadFavorites()
    }
    
    func loadFavorites() {
        if let stored = UserDefaults.standard.stringArray(forKey: favoritesKey) {
            favorites = Set(stored)
        }
    }
    
    func saveFavorites() {
        UserDefaults.standard.set(Array(favorites), forKey: favoritesKey)
    }
    
    func toggleFavorite(for localIdentifier: String) {
        if favorites.contains(localIdentifier) {
            favorites.remove(localIdentifier)
        } else {
            favorites.insert(localIdentifier)
        }
        saveFavorites()
    }
    
    func isFavorite(localIdentifier: String) -> Bool {
        return favorites.contains(localIdentifier)
    }
}

//
//  lensvaltsApp.swift
//  lensvalts
//
//  Created by Pawan Bisht on 18/04/26.
//

import SwiftUI

@main
struct lensvaltsApp: App {
    @StateObject private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            if authService.isAuthenticated {
                ContentView()
                    .environmentObject(authService)
            } else {
                LoginView()
                    .environmentObject(authService)
            }
        }
    }
}

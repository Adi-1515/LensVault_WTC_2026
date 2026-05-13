import Foundation
import Combine
import SwiftUI

class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var isAuthenticated: Bool = false
    
    private let tokenKey = "jwt_token"
    private let BASE_URL = "http://10.238.118.148:8000" // Use your laptop's local IP
    
    init() {
        checkToken()
    }
    
    func checkToken() {
        if let token = UserDefaults.standard.string(forKey: tokenKey), !token.isEmpty {
            isAuthenticated = true
        } else {
            isAuthenticated = false
        }
    }
    
    func getToken() -> String? {
        return UserDefaults.standard.string(forKey: tokenKey)
    }
    
    func login(email: String, password: String, completion: @escaping (Bool, String?) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/auth/token") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let bodyString = "username=\(email.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&password=\(password.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        request.httpBody = bodyString.data(using: .utf8)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                DispatchQueue.main.async { completion(false, error.localizedDescription) }
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200, let data = data {
                do {
                    let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
                    if let token = json?["access_token"] as? String {
                        UserDefaults.standard.set(token, forKey: self.tokenKey)
                        DispatchQueue.main.async {
                            self.isAuthenticated = true
                            completion(true, nil)
                        }
                        return
                    }
                } catch {
                    DispatchQueue.main.async { completion(false, "Failed to parse response") }
                }
            } else {
                DispatchQueue.main.async { completion(false, "Invalid credentials") }
            }
        }.resume()
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
        isAuthenticated = false
    }
    
    func getAuthHeader() -> String? {
        guard let token = getToken() else { return nil }
        return "Bearer \(token)"
    }
}

import Foundation

class FaceService {
    static let BASE_URL = "http://10.238.118.148:8000"
    
    static func getAuthRequest(url: URL) -> URLRequest {
        var request = URLRequest(url: url)
        if let token = AuthService.shared.getAuthHeader() {
            request.setValue(token, forHTTPHeaderField: "Authorization")
        }
        return request
    }
    
    static func fetchPersons(completion: @escaping ([Person]) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/faces/persons") else { return }
        URLSession.shared.dataTask(with: getAuthRequest(url: url)) { data, response, _ in
            if let data = data, let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                let persons = try? JSONDecoder().decode([Person].self, from: data)
                DispatchQueue.main.async { completion(persons ?? []) }
            } else {
                DispatchQueue.main.async { completion([]) }
            }
        }.resume()
    }
    
    static func fetchClusters(completion: @escaping ([Cluster]) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/faces/clusters") else { return }
        URLSession.shared.dataTask(with: getAuthRequest(url: url)) { data, response, _ in
            if let data = data, let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                let clusters = try? JSONDecoder().decode([Cluster].self, from: data)
                DispatchQueue.main.async { completion(clusters ?? []) }
            } else {
                DispatchQueue.main.async { completion([]) }
            }
        }.resume()
    }
    
    static func fetchPersonPhotos(personId: String, completion: @escaping ([VaultMedia]) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/faces/persons/\(personId)/photos") else { return }
        URLSession.shared.dataTask(with: getAuthRequest(url: url)) { data, response, _ in
            if let data = data, let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                let resp = try? JSONDecoder().decode(PersonPhotosResponse.self, from: data)
                DispatchQueue.main.async { completion(resp?.photos ?? []) }
            } else {
                DispatchQueue.main.async { completion([]) }
            }
        }.resume()
    }
    
    static func assignCluster(clusterId: Int, name: String, completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/faces/clusters/\(clusterId)/assign") else { return }
        var request = getAuthRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["name": name]
        request.httpBody = try? JSONEncoder().encode(body)
        
        URLSession.shared.dataTask(with: request) { data, response, _ in
            if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 200 {
                DispatchQueue.main.async { completion(true) }
            } else {
                DispatchQueue.main.async { completion(false) }
            }
        }.resume()
    }
    
    static func triggerClustering(completion: @escaping () -> Void) {
        guard let url = URL(string: "\(BASE_URL)/api/faces/cluster") else { return }
        var request = getAuthRequest(url: url)
        request.httpMethod = "POST"
        URLSession.shared.dataTask(with: request) { _, _, _ in
            DispatchQueue.main.async { completion() }
        }.resume()
    }
}

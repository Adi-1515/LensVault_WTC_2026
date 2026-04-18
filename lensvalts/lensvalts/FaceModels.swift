import Foundation

struct Person: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let sample_face_id: String?
}

struct Cluster: Codable, Identifiable, Sendable {
    let id: String // Use cluster_id as the view id
    let cluster_id: Int
    let face_count: Int
    let sample_face_id: String?
    
    enum CodingKeys: String, CodingKey {
        case cluster_id, face_count, sample_face_id
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        cluster_id = try container.decode(Int.self, forKey: .cluster_id)
        face_count = try container.decode(Int.self, forKey: .face_count)
        sample_face_id = try container.decodeIfPresent(String.self, forKey: .sample_face_id)
        id = String(cluster_id)
    }
}

struct PersonPhotosResponse: Codable, Sendable {
    let person: Person
    let photos: [VaultMedia]
    let total: Int
}

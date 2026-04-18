import Foundation

struct VaultMedia: Codable, Identifiable, Sendable {
    let id: String
    let filename: String?
    let mime_type: String?
    let is_favourite: Bool?
    let canonical_date: String?
    let url: String?
    let thumbnail_url: String?
}

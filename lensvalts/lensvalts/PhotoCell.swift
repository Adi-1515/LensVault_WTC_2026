//
//  PhotoCell.swift
//  lensvalts
//
//  Created by Pawan Bisht on 18/04/26.
//

import SwiftUI
import Photos

struct PhotoCell: View {
    
    var asset: PHAsset
    @State private var image: UIImage?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            
            if let img = image {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFill()
            } else {
                Color.gray
            }
            
            // 🎥 Video indicator
            if asset.mediaType == .video {
                HStack(spacing: 4) {
                    Image(systemName: "video.fill")
                        .font(.caption2)
                    
                    Text(formatDuration(asset.duration))
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
            loadImage()
        }
    }

    func loadImage() {
        let manager = PHImageManager.default()

        manager.requestImage(
            for: asset,
            targetSize: CGSize(width: 300, height: 300),
            contentMode: .aspectFill,
            options: nil
        ) { img, _ in
            self.image = img
        }
    }
}

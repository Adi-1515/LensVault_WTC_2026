//
//  Utils.swift
//  lensvalts
//
//  Created by Pawan Bisht on 18/04/26.
//

import Foundation

func formatDuration(_ duration: Double) -> String {
    let minutes = Int(duration) / 60
    let seconds = Int(duration) % 60
    return String(format: "%d:%02d", minutes, seconds)
}

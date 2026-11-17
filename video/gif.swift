// Encode a folder of PNG frames into a looping animated GIF with ImageIO (no ffmpeg needed).
//   swift video/gif.swift <framesDir> <out.gif> [fps] [holdLastSeconds]
import Foundation
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 3 else { print("usage: gif.swift framesDir out.gif [fps] [holdLast]"); exit(2) }
let dir = a[1], out = a[2]
let fps = Double(a.count > 3 ? a[3] : "12") ?? 12
let holdLast = Double(a.count > 4 ? a[4] : "1.6") ?? 1.6
let files = try FileManager.default.contentsOfDirectory(atPath: dir).filter { $0.hasSuffix(".png") }.sorted()
guard !files.isEmpty else { print("no frames"); exit(1) }

// collapse runs of identical frames into one longer frame: smaller file, same playback
var frames: [(CGImage, Double)] = []
var lastData: Data? = nil
for f in files {
  let url = URL(fileURLWithPath: dir + "/" + f)
  let data = try Data(contentsOf: url)
  guard let src = CGImageSourceCreateWithData(data as CFData, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
  if let l = lastData, l == data, !frames.isEmpty { frames[frames.count - 1].1 += 1 / fps }
  else { frames.append((img, 1 / fps)) }
  lastData = data
}
frames[frames.count - 1].1 += holdLast

let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.gif.identifier as CFString, frames.count, nil)!
CGImageDestinationSetProperties(dest, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
for (img, d) in frames {
  CGImageDestinationAddImage(dest, img, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: d, kCGImagePropertyGIFUnclampedDelayTime: d]] as CFDictionary)
}
guard CGImageDestinationFinalize(dest) else { print("could not write gif"); exit(1) }
let size = (try FileManager.default.attributesOfItem(atPath: out)[.size] as? Int) ?? 0
print("wrote \(out) · \(frames.count) frames from \(files.count) · \(size / 1024) KB")

import { writeFileSync } from "fs"

// A simulated canvas pixel buffer test
function runBmpTest() {
  const width = 800 * 4
  const height = 120 * 4
  const size = width * height * 4
  const data = new Uint8ClampedArray(size)

  // 1. Fill with white (255, 255, 255, 255)
  for (let i = 0; i < size; i += 4) {
    data[i] = 255     // R
    data[i + 1] = 255 // G
    data[i + 2] = 255 // B
    data[i + 3] = 255 // A
  }

  // 2. Draw a black square in the middle (e.g. at x=1000..2000, y=100..300)
  for (let y = 100; y < 300; y++) {
    for (let x = 1000; x < 2000; x++) {
      const idx = (y * width + x) * 4
      data[idx] = 0     // R
      data[idx + 1] = 0 // G
      data[idx + 2] = 0 // B
      data[idx + 3] = 255 // A
    }
  }

  // 3. BMP Row bytes padding
  const rowBytes = Math.ceil(width / 32) * 4
  const pixelDataSize = rowBytes * height
  const fileSize = 62 + pixelDataSize
  
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  
  // File Header (14 bytes)
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4D) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true) // Reserved
  view.setUint32(10, 62, true) // Offset to pixel data
  
  // DIB Header (40 bytes)
  view.setUint32(14, 40, true) // DIB header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // Bottom-to-top
  view.setUint16(26, 1, true) // Planes
  view.setUint16(28, 1, true) // Bits per pixel (1-bit monochrome)
  view.setUint32(30, 0, true) // BI_RGB (no compression)
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 0, true)
  view.setInt32(42, 0, true)
  view.setUint32(46, 2, true) // Colors in palette
  view.setUint32(50, 2, true) // Important colors
  
  // Color Palette (8 bytes)
  // Color 0: Black (0, 0, 0, 255)
  view.setUint32(54, 0xFF000000, true)
  // Color 1: White (255, 255, 255, 255)
  view.setUint32(58, 0xFFFFFFFF, true)
  
  // Pixel Data (bottom-to-top)
  let blackCount = 0
  let whiteCount = 0

  for (let y = height - 1; y >= 0; y--) {
    const rowStart = 62 + (height - 1 - y) * rowBytes
    let currentByte = 0
    let bitCount = 0
    
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b
      const alphaFactor = a / 255
      const effectiveBrightness = brightness * alphaFactor + 255 * (1 - alphaFactor)
      
      const bit = effectiveBrightness < 180 ? 0 : 1
      if (bit === 0) blackCount++
      else whiteCount++
      
      currentByte = (currentByte << 1) | bit
      bitCount++
      
      if (bitCount === 8) {
        view.setUint8(rowStart + Math.floor(x / 8), currentByte)
        currentByte = 0
        bitCount = 0
      }
    }
    
    if (bitCount > 0) {
      currentByte = currentByte << (8 - bitCount)
      view.setUint8(rowStart + Math.floor(width / 8), currentByte)
    }
  }

  console.log(`Generated BMP byte counts: Black pixels = ${blackCount}, White pixels = ${whiteCount}`)
  writeFileSync("scratch/test.bmp", Buffer.from(buffer))
  console.log("BMP file written to scratch/test.bmp successfully")
}

runBmpTest()

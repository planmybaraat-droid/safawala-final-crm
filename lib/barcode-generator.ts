import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

export const generateQRCode = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return ''
  }
}

// Synchronous — returns canvas PNG data URL for display in <img> tags
export const generateBarcode = (text: string): string => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 200
    JsBarcode(canvas, text || 'www.safawala.com', {
      format: 'CODE128',
      width: 4,
      height: 120,
      displayValue: false,
      margin: 8,
      background: '#FFFFFF',
      lineColor: '#000000',
    })
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error generating barcode:', error)
    return ''
  }
}

export interface BarcodeLabelOptions {
  barcodeText: string
  variationName?: string
  mrp?: number
}

// Synchronous — returns canvas PNG for download / legacy print
export const generateBarcodeLabel = (options: BarcodeLabelOptions): string => {
  try {
    const barcodeCanvas = document.createElement('canvas')
    barcodeCanvas.width = 800
    barcodeCanvas.height = 200
    JsBarcode(barcodeCanvas, options.barcodeText || 'www.safawala.com', {
      format: 'CODE128',
      width: 4,
      height: 120,
      displayValue: false,
      margin: 8,
      background: '#FFFFFF',
      lineColor: '#000000',
    })

    const padding = 20
    const labelWidth = Math.max(barcodeCanvas.width + padding * 2, 320)
    const lineH = 24
    const smallH = 18

    let textH = 0
    if (options.variationName) textH += lineH
    textH += smallH
    if (options.mrp !== undefined) textH += lineH
    textH += 10

    const labelHeight = padding + textH + barcodeCanvas.height + smallH + padding

    const canvas = document.createElement('canvas')
    canvas.width = labelWidth
    canvas.height = labelHeight
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, labelWidth, labelHeight)

    let y = padding

    if (options.variationName) {
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(options.variationName, labelWidth / 2, y + 16)
      y += lineH
    }

    ctx.fillStyle = '#000000'
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('www.safawala.com', labelWidth / 2, y + 13)
    y += smallH

    if (options.mrp !== undefined) {
      ctx.fillStyle = '#000000'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`MRP - ₹${options.mrp}/-`, labelWidth / 2, y + 14)
      y += lineH
    }

    y += 10
    ctx.drawImage(barcodeCanvas, (labelWidth - barcodeCanvas.width) / 2, y)
    y += barcodeCanvas.height + 4

    ctx.fillStyle = '#444444'
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(options.barcodeText, labelWidth / 2, y + 12)

    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error generating barcode label:', error)
    return ''
  }
}

export const downloadQRCode = (dataURL: string, filename: string) => {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const printQRCode = (dataURL: string) => {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(`<html><head><title>QR Code</title><style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}img{max-width:100%;height:auto;}</style></head><body><img src="${dataURL}"/></body></html>`)
    win.document.close()
    win.print()
  }
}

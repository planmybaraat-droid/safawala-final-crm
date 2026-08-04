const express = require("express")
const cors = require("cors")
const fs = require("fs")
const path = require("path")
const os = require("os")
const { exec } = require("child_process")

const config = require("./config.json")
const app = express()

app.use(cors({ origin: "*" }))
app.use(express.json())

app.get("/status", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", service: "Safawala BarTender Bridge" })
})

app.post("/print", (req, res) => {
  const {
    barcode,
    productName,
    salePrice,
    regularPrice,
    color,
    size,
    material,
    quantity = 1,
    templatePath,
  } = req.body

  if (!barcode) return res.status(400).json({ error: "barcode is required" })

  const template = templatePath || config.defaultTemplatePath
  if (!template) return res.status(400).json({ error: "No template path configured in config.json" })

  if (!fs.existsSync(config.bartendExePath)) {
    return res.status(500).json({
      error: `BarTender not found at: ${config.bartendExePath}. Update bartendExePath in config.json`,
    })
  }

  if (!fs.existsSync(template)) {
    return res.status(500).json({
      error: `Template not found at: ${template}. Update defaultTemplatePath in config.json`,
    })
  }

  const escapeCSV = (val) => {
    if (val === undefined || val === null) return ""
    const str = String(val)
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headers = "Barcode,ProductName,RegularPrice,SalePrice,Color,Size,Material"
  const rowData = [barcode, productName, regularPrice ?? "", salePrice ?? "", color ?? "", size ?? "", material ?? ""]
    .map(escapeCSV)
    .join(",")

  // Repeat the row for the requested quantity
  const rows = Array(Math.max(1, parseInt(quantity) || 1))
    .fill(rowData)
    .join("\n")

  const csvContent = `${headers}\n${rows}`
  const tmpFile = path.join(os.tmpdir(), `safawala_bt_${Date.now()}.csv`)

  try {
    fs.writeFileSync(tmpFile, csvContent, "utf8")
  } catch (err) {
    return res.status(500).json({ error: "Failed to write temp CSV: " + err.message })
  }

  const cmd = `"${config.bartendExePath}" /F="${template}" /D="${tmpFile}" /P /X`
  console.log(`[print] Running: ${cmd}`)

  exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
    try { fs.unlinkSync(tmpFile) } catch {}

    if (error) {
      console.error("[print] Error:", error.message)
      return res.status(500).json({ error: "BarTender failed: " + error.message })
    }

    console.log(`[print] OK — ${quantity} label(s) for ${barcode}`)
    res.json({ success: true, printed: quantity })
  })
})

const port = config.port || 9200
app.listen(port, "127.0.0.1", () => {
  console.log(`\nSafawala BarTender Bridge running on http://localhost:${port}`)
  console.log(`Template : ${config.defaultTemplatePath}`)
  console.log(`BarTender: ${config.bartendExePath}\n`)
})

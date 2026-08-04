const Service = require("node-windows").Service
const path = require("path")

const svc = new Service({
  name: "Safawala BarTender Bridge",
  description: "Local HTTP bridge between Safawala CRM and BarTender Basic. Runs on localhost:9200.",
  script: path.join(__dirname, "server.js"),
  nodeOptions: [],
  env: [{ name: "NODE_ENV", value: "production" }],
})

svc.on("install", () => {
  svc.start()
  console.log("Service installed and started!")
  console.log("The bridge will now start automatically on every Windows boot.")
})

svc.on("error", (err) => {
  console.error("Service error:", err)
})

svc.install()

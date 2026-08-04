const Service = require("node-windows").Service
const path = require("path")

const svc = new Service({
  name: "Safawala BarTender Bridge",
  script: path.join(__dirname, "server.js"),
})

svc.on("uninstall", () => {
  console.log("Service uninstalled successfully.")
})

svc.uninstall()

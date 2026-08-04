const CACHE_NAME = "safawala-v1"
const SHELL = ["/", "/portal/booking", "/portal/warehouse", "/portal/qc", "/portal/delivery", "/portal/styling", "/portal/accounts", "/portal/admin", "/portal/manager", "/portal/franchise"]

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return
  if (e.request.url.includes("/api/")) return

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()))
        return res
      }).catch(() => cached)
      return cached || fresh
    })
  )
})

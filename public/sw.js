const CACHE_NAME = "feuerwehr-mobile-v3.0.0"
const STATIC_CACHE = "feuerwehr-static-v3.0.0"
const DYNAMIC_CACHE = "feuerwehr-dynamic-v3.0.0"

// Statische Ressourcen
const STATIC_ASSETS = [
  "/mobile",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/app/globals.css",
  "/offline.html",
]

// Dynamische Ressourcen
const DYNAMIC_ASSETS = ["/api/", "/data/"]

// Installation
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker v3.0.0")

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[SW] Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      }),
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log("[SW] Dynamic cache ready")
        return Promise.resolve()
      }),
    ]),
  )

  self.skipWaiting()
})

// Aktivierung
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating Service Worker v3.0.0")

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log("[SW] Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )

  self.clients.claim()
})

// Fetch mit intelligenter Cache-Strategie
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Statische Assets - Cache First
  if (STATIC_ASSETS.some((asset) => url.pathname.includes(asset))) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          return (
            response ||
            fetch(request).then((fetchResponse) => {
              return caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, fetchResponse.clone())
                return fetchResponse
              })
            })
          )
        })
        .catch(() => {
          if (request.destination === "document") {
            return caches.match("/offline.html")
          }
        }),
    )
    return
  }

  // API Calls - Network First mit Cache Fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request)
        }),
    )
    return
  }

  // Alle anderen Requests - Network First
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then((response) => {
        return response || caches.match("/offline.html")
      })
    }),
  )
})

// Push-Benachrichtigungen mit erweiterten Features
self.addEventListener("push", (event) => {
  console.log("[SW] Push received")

  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : "Neue Benachrichtigung" }
  }

  const options = {
    body: data.body || "Neue Feuerwehr-Benachrichtigung",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: data.image || null,
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    sound: data.sound || "/sounds/alarm.mp3",
    timestamp: Date.now(),
    requireInteraction: data.requireInteraction || true,
    silent: data.silent || false,
    renotify: data.renotify || true,
    tag: data.tag || "feuerwehr-notification",
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || Date.now(),
      url: data.url || "/mobile",
      action: data.action || "open",
      emergencyLevel: data.emergencyLevel || "normal",
    },
    actions: [
      {
        action: "open",
        title: "Öffnen",
        icon: "/icon-192.png",
      },
      {
        action: "acknowledge",
        title: "Bestätigen",
        icon: "/icon-192.png",
      },
      {
        action: "close",
        title: "Schließen",
        icon: "/icon-192.png",
      },
    ],
  }

  // Titel basierend auf Priorität
  let title = "🚨 Feuerwehr Alarmierung"
  if (data.emergencyLevel === "high") {
    title = "🚨🚨 DRINGEND - Feuerwehr Alarmierung"
  } else if (data.emergencyLevel === "medium") {
    title = "🚨 Feuerwehr Alarmierung"
  } else if (data.type === "status") {
    title = "📡 Statusmeldung"
  } else if (data.type === "message") {
    title = "💬 Nachricht"
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification Click mit erweiterten Aktionen
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  const { data } = event.notification
  const url = data.url || "/mobile"

  // Verschiedene Aktionen
  switch (event.action) {
    case "acknowledge":
      // Bestätigung an Server senden
      fetch("/api/notifications/acknowledge", {
        method: "POST",
        body: JSON.stringify({ id: data.primaryKey }),
        headers: { "Content-Type": "application/json" },
      }).catch(console.error)
      return

    case "close":
      return

    case "open":
    default:
      // App öffnen oder fokussieren
      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          // Prüfen ob App bereits offen ist
          for (const client of clientList) {
            if (client.url.includes("/mobile") && "focus" in client) {
              return client.focus()
            }
          }

          // Neue Instanz öffnen
          if (clients.openWindow) {
            return clients.openWindow(url)
          }
        }),
      )
      break
  }
})

// Background Sync für Offline-Funktionalität
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync())
  } else if (event.tag === "status-sync") {
    event.waitUntil(syncStatusUpdates())
  }
})

// Periodische Background Sync
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "status-check") {
    event.waitUntil(checkForUpdates())
  }
})

// Hilfsfunktionen
async function doBackgroundSync() {
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      body: JSON.stringify({
        timestamp: Date.now(),
        type: "background-sync",
      }),
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      throw new Error("Sync failed")
    }

    console.log("[SW] Background sync successful")
  } catch (error) {
    console.error("[SW] Background sync failed:", error)
    // Retry später
    return self.registration.sync.register("background-sync")
  }
}

async function syncStatusUpdates() {
  try {
    // Pending status updates aus IndexedDB holen und senden
    const pendingUpdates = await getPendingStatusUpdates()

    for (const update of pendingUpdates) {
      await fetch("/api/status/update", {
        method: "POST",
        body: JSON.stringify(update),
        headers: { "Content-Type": "application/json" },
      })
    }

    await clearPendingStatusUpdates()
    console.log("[SW] Status sync successful")
  } catch (error) {
    console.error("[SW] Status sync failed:", error)
  }
}

async function checkForUpdates() {
  try {
    const response = await fetch("/api/updates/check")
    const data = await response.json()

    if (data.hasUpdates) {
      self.registration.showNotification("📱 App-Update verfügbar", {
        body: "Eine neue Version der Feuerwehr-App ist verfügbar.",
        icon: "/icon-192.png",
        actions: [
          { action: "update", title: "Aktualisieren" },
          { action: "later", title: "Später" },
        ],
      })
    }
  } catch (error) {
    console.error("[SW] Update check failed:", error)
  }
}

// IndexedDB Hilfsfunktionen (vereinfacht)
async function getPendingStatusUpdates() {
  // Implementierung für IndexedDB
  return []
}

async function clearPendingStatusUpdates() {
  // Implementierung für IndexedDB
}

// Error Handling
self.addEventListener("error", (event) => {
  console.error("[SW] Error:", event.error)
})

self.addEventListener("unhandledrejection", (event) => {
  console.error("[SW] Unhandled rejection:", event.reason)
})

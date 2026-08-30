// Deliberately minimal: Bounce is a live matchmaking/WebRTC app with no
// meaningful offline mode, and caching HTML/JS here risks serving stale
// signaling code after a deploy. This exists only to satisfy PWA
// installability criteria (a registered service worker + fetch handler).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

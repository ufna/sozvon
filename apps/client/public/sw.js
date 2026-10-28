/* eslint-disable */
const APP_VERSION = new URL(self.location).searchParams.get("v") || "dev";
const CACHE_NAME = "sozvon-" + APP_VERSION;

const PRECACHE_URLS = [
	"/",
	"/favicon.svg?v=graphite-3",
	"/icon-192.png?v=graphite-3",
	"/icon-512.png?v=graphite-3",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const url = new URL(event.request.url);

	// Don't cache API calls or WebSocket upgrades
	if (url.pathname.startsWith("/room/") || url.pathname.startsWith("/rtc/")) return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				if (response.ok && url.origin === self.location.origin) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				}
				return response;
			})
			.catch(() => caches.match(event.request))
	);
});

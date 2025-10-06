const CACHE_NAME = "dacars-third-party-v1";
const CACHEABLE_HOSTS = ["connect.facebook.net"];

const isCacheableRequest = (request) => {
    if (request.method !== "GET") {
        return false;
    }

    try {
        const url = new URL(request.url);
        if (!CACHEABLE_HOSTS.includes(url.hostname)) {
            return false;
        }

        if (url.pathname.endsWith("/tr")) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
};

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            try {
                const cacheKeys = await caches.keys();
                await Promise.all(
                    cacheKeys
                        .filter((key) => key !== CACHE_NAME)
                        .map((outdatedKey) => caches.delete(outdatedKey))
                );
            } catch (error) {
                console.warn("Nu am putut curăța cache-ul vechi", error);
            }
            await self.clients.claim();
        })()
    );
});

const revalidate = async (request) => {
    try {
        const response = await fetch(request);
        if (!response) {
            return;
        }

        if (response.ok || response.type === "opaque") {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
    } catch (error) {
        console.warn("Nu am putut actualiza resursa Meta Pixel din rețea", error);
    }
};

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (!isCacheableRequest(request)) {
        return;
    }

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(request);

            if (cachedResponse) {
                event.waitUntil(revalidate(request));
                return cachedResponse;
            }

            try {
                const networkResponse = await fetch(request);
                if (networkResponse && (networkResponse.ok || networkResponse.type === "opaque")) {
                    await cache.put(request, networkResponse.clone());
                }
                return networkResponse;
            } catch (error) {
                console.warn("Nu am putut prelua resursa Meta Pixel din rețea", error);
                if (cachedResponse) {
                    return cachedResponse;
                }
                throw error;
            }
        })()
    );
});

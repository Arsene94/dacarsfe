const META_PIXEL_HOSTNAME = "connect.facebook.net";
const META_PIXEL_PATH_SUFFIX = "/fbevents.js";
const META_PIXEL_FALLBACK_SCRIPT = `/* Meta Pixel indisponibil: răspuns fallback din service worker */\nif (typeof self !== 'undefined' && !self.fbq) {\n  const queue = [];\n  const fbqFallback = function fbqFallback() {\n    queue.push(Array.prototype.slice.call(arguments));\n  };\n  fbqFallback.loaded = false;\n  fbqFallback.version = '2.0';\n  fbqFallback.queue = queue;\n  self.fbq = fbqFallback;\n}`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.destination && request.destination !== "script") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  const isMetaPixelRequest =
    url.hostname === META_PIXEL_HOSTNAME &&
    url.pathname.endsWith(META_PIXEL_PATH_SUFFIX);

  if (!isMetaPixelRequest) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (!response || response.status === 0) {
          throw new Error("Empty Meta Pixel response");
        }
        return response;
      } catch (error) {
        return new Response(META_PIXEL_FALLBACK_SCRIPT, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
    })(),
  );
});

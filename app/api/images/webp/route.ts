import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import imageFormatsConfig from "@/config/image-formats.json";
import { getProxyRoutePath, isHostAllowed } from "@/lib/imageProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";
const WEBP_CONTENT_TYPE = "image/webp";
const WEBP_OPTIONS = {
  quality: 82,
  effort: 5,
};

const sourceExtensions = Array.isArray(imageFormatsConfig?.sourceExtensions)
  ? imageFormatsConfig.sourceExtensions
  : [];

const SUPPORTED_EXTENSIONS = new Set(
  sourceExtensions
    .map((ext) => String(ext).replace(/^\./, "").toLowerCase())
    .filter((ext) => ext.length > 0)
);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/tiff": "tiff",
  "image/tif": "tif",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

type HandlerMode = "GET" | "HEAD";

export async function GET(request: NextRequest) {
  return handleRequest(request, "GET");
}

export async function HEAD(request: NextRequest) {
  return handleRequest(request, "HEAD");
}

async function handleRequest(request: NextRequest, mode: HandlerMode) {
  const remoteUrl = parseRemoteUrl(request.nextUrl.searchParams.get("url"));

  if (!remoteUrl) {
    return NextResponse.json({ error: "Parametrul url este invalid sau lipsă." }, { status: 400 });
  }

  if (!isHostAllowed(remoteUrl.hostname)) {
    return NextResponse.json({ error: "Domeniul nu este permis pentru proxy." }, { status: 403 });
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(remoteUrl.toString(), {
      headers: buildUpstreamHeaders(request),
      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json({ error: "A apărut o eroare la descărcarea imaginii." }, { status: 502 });
  }

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { error: `Nu s-a putut descărca resursa (${upstreamResponse.status}).` },
      { status: upstreamResponse.status }
    );
  }

  const upstreamContentType = normalizeContentType(upstreamResponse.headers.get("content-type"));
  const acceptsWebp = clientAcceptsWebp(request);
  const convertible = acceptsWebp && mode === "GET" && canConvertToWebp(upstreamContentType, remoteUrl.pathname);

  const headers = collectResponseHeaders(upstreamResponse.headers, convertible);

  if (!convertible) {
    if (mode === "HEAD") {
      return new NextResponse(null, { status: 200, headers });
    }
    const originalBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    headers.set("Content-Type", upstreamContentType ?? "application/octet-stream");
    headers.set("Content-Length", originalBuffer.length.toString());
    return new NextResponse(originalBuffer, { status: 200, headers });
  }

  const originalBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

  try {
    const converted = await sharp(originalBuffer).webp(WEBP_OPTIONS).toBuffer();
    headers.set("Content-Type", WEBP_CONTENT_TYPE);
    headers.set("Content-Length", converted.length.toString());
    const varyWithAccept = appendVary(headers.get("Vary"), "Accept");
    if (varyWithAccept) {
      headers.set("Vary", varyWithAccept);
    }

    return new NextResponse(converted, { status: 200, headers });
  } catch (error) {
    // Dacă conversia eșuează revenim la fișierul original.
    headers.set("Content-Type", upstreamContentType ?? "application/octet-stream");
    headers.set("Content-Length", originalBuffer.length.toString());
    const etag = upstreamResponse.headers.get("etag");
    if (etag) {
      headers.set("ETag", etag);
    }
    return new NextResponse(originalBuffer, { status: 200, headers });
  }
}

function parseRemoteUrl(value: string | null): URL | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      candidates.push(decoded);
    }
  } catch (error) {
    // Ignorăm URL-urile care nu se pot decoda.
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (!/^https?:$/i.test(url.protocol)) {
        continue;
      }
      if (url.pathname.startsWith(getProxyRoutePath())) {
        return null;
      }
      return url;
    } catch (error) {
      continue;
    }
  }

  return null;
}

function buildUpstreamHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};
  const accept = request.headers.get("accept");
  if (accept) {
    headers["accept"] = accept;
  }
  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers["user-agent"] = userAgent;
  }
  return headers;
}

function collectResponseHeaders(upstreamHeaders: Headers, stripEtag: boolean): Headers {
  const headers = new Headers();
  const cacheControl = upstreamHeaders.get("cache-control") ?? DEFAULT_CACHE_CONTROL;
  headers.set("Cache-Control", cacheControl);
  const vary = appendVary(upstreamHeaders.get("vary"), "Accept");
  if (vary) {
    headers.set("Vary", vary);
  }

  const lastModified = upstreamHeaders.get("last-modified");
  if (lastModified) {
    headers.set("Last-Modified", lastModified);
  }
  if (!stripEtag) {
    const etag = upstreamHeaders.get("etag");
    if (etag) {
      headers.set("ETag", etag);
    }
  }

  return headers;
}

function appendVary(existing: string | null, value: string | null): string | null {
  const varyValues = new Set<string>();
  if (existing) {
    for (const part of existing.split(",")) {
      const normalized = part.trim();
      if (normalized) {
        varyValues.add(normalized);
      }
    }
  }
  if (value) {
    varyValues.add(value);
  }
  if (varyValues.size === 0) {
    return null;
  }
  return Array.from(varyValues).join(", ");
}

function clientAcceptsWebp(request: NextRequest): boolean {
  const accept = request.headers.get("accept");
  if (!accept) {
    return false;
  }
  return accept.toLowerCase().includes("image/webp");
}

function normalizeContentType(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.split(";")[0]?.trim().toLowerCase() ?? null;
}

function canConvertToWebp(contentType: string | null, pathname: string): boolean {
  if (contentType === WEBP_CONTENT_TYPE) {
    return false;
  }
  const extension = inferExtension(contentType, pathname);
  if (!extension) {
    return false;
  }
  return SUPPORTED_EXTENSIONS.has(extension);
}

function inferExtension(contentType: string | null, pathname: string): string | null {
  if (contentType) {
    const normalized = contentType.trim().toLowerCase();
    const mapped = MIME_EXTENSION_MAP[normalized];
    if (mapped) {
      return mapped;
    }
  }
  const match = /\.([a-z0-9]+)$/.exec(pathname.toLowerCase());
  return match ? match[1] : null;
}

import { NextRequest, NextResponse } from "next/server";
import imageFormatsConfig from "@/config/image-formats.json";
import webpManifest from "@/config/webp-manifest.json";

const sourceExtensions = Array.isArray(imageFormatsConfig?.sourceExtensions)
  ? imageFormatsConfig.sourceExtensions.map((ext) => String(ext).replace(/^\./, "").toLowerCase())
  : [];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

const sourceExtensionPattern =
  sourceExtensions.length > 0
    ? new RegExp(`\\.(${sourceExtensions.map((ext) => escapeRegex(ext)).join("|")})$`, "i")
    : null;

const webpManifestEntries = Array.isArray(webpManifest)
  ? webpManifest.map((entry) => normalizeManifestEntry(entry)).filter(Boolean)
  : [];
const webpManifestSet = new Set(webpManifestEntries);

function normalizeManifestEntry(entry: unknown): string {
  if (typeof entry !== "string") {
    return "";
  }
  return entry.replace(/\\\\/g, "/").replace(/^\/+/, "");
}

function acceptsWebp(request: NextRequest): boolean {
  const accept = request.headers.get("accept");
  if (!accept) {
    return false;
  }
  return accept.toLowerCase().includes("image/webp");
}

function isSupportedSource(pathname: string): boolean {
  return sourceExtensionPattern ? sourceExtensionPattern.test(pathname) : false;
}

function normalizeWebpKey(pathname: string): string {
  return pathname.replace(/^\/+/, "").replace(/\\\\/g, "/");
}

export function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!isSupportedSource(pathname)) {
    return NextResponse.next();
  }

  if (!acceptsWebp(request)) {
    return NextResponse.next();
  }

  const webpPath = pathname.replace(sourceExtensionPattern ?? /$/, ".webp");
  const manifestKey = normalizeWebpKey(webpPath);

  if (!manifestKey || !webpManifestSet.has(manifestKey)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${manifestKey}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};

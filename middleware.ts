import { NextRequest, NextResponse } from "next/server";
import imageFormatsConfig from "@/config/image-formats.json";
import webpManifest from "@/config/webp-manifest.json";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "@/lib/i18n/config";
import {
  normalizeLocaleCandidate,
  parseAcceptLanguage,
  pickSupportedLocale,
} from "@/lib/i18n/localeDetection";

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

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;
const LOCALE_REDIRECT_SKIP_PREFIXES = ["/_next", "/api"];

type LocaleExtractionResult =
  | { type: "rewrite"; locale: Locale; restPath: string }
  | { type: "redirect"; locale: Locale; restPath: string }
  | null;

function extractLocaleFromPath(pathname: string): LocaleExtractionResult {
  const segments = pathname.split("/");
  const rawLocale = segments[1];
  if (!rawLocale) {
    return null;
  }

  const normalizedLocale = normalizeLocaleCandidate(rawLocale);
  if (!normalizedLocale) {
    return null;
  }

  const restSegments = segments.slice(2);
  const restPath = restSegments.join("/");
  const normalizedRestPath = restPath ? `/${restPath}` : "/";
  const normalizedRaw = rawLocale.trim().toLowerCase();

  if (rawLocale === normalizedLocale && normalizedRaw === normalizedLocale) {
    return { type: "rewrite", locale: normalizedLocale, restPath: normalizedRestPath };
  }

  return { type: "redirect", locale: normalizedLocale, restPath: normalizedRestPath };
}

function buildLocalePath(locale: Locale, restPath: string): string {
  if (!restPath || restPath === "/") {
    return `/${locale}`;
  }
  return `/${locale}${restPath.startsWith("/") ? restPath : `/${restPath}`}`;
}

function shouldSkipLocaleHandling(pathname: string): boolean {
  return LOCALE_REDIRECT_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function resolvePreferredLocale(request: NextRequest): Locale {
  const cookieLocale = normalizeLocaleCandidate(request.cookies.get(LOCALE_STORAGE_KEY)?.value);
  if (cookieLocale) {
    return cookieLocale;
  }

  const acceptedLocales = parseAcceptLanguage(request.headers.get("accept-language"));
  return pickSupportedLocale(acceptedLocales, DEFAULT_LOCALE);
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set({
    name: LOCALE_STORAGE_KEY,
    value: locale,
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

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

function handleImageRewrite(request: NextRequest, pathname: string): NextResponse | null {
  if (!isSupportedSource(pathname)) {
    return null;
  }

  if (!acceptsWebp(request)) {
    return null;
  }

  const webpPath = pathname.replace(sourceExtensionPattern ?? /$/, ".webp");
  const manifestKey = normalizeWebpKey(webpPath);

  if (!manifestKey || !webpManifestSet.has(manifestKey)) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${manifestKey}`;
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }

  const originalUrl = request.nextUrl.clone();
  const originalPathname = originalUrl.pathname;

  if (shouldSkipLocaleHandling(originalPathname)) {
    const assetResponse = handleImageRewrite(request, originalPathname);
    return assetResponse ?? NextResponse.next();
  }

  const hasFileExtension = PUBLIC_FILE_PATTERN.test(originalPathname);
  const localeInfo = extractLocaleFromPath(originalPathname);

  if (localeInfo && localeInfo.type === "redirect") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = buildLocalePath(localeInfo.locale, localeInfo.restPath);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    setLocaleCookie(redirectResponse, localeInfo.locale);
    return redirectResponse;
  }

  if (!localeInfo && !hasFileExtension) {
    const preferredLocale = resolvePreferredLocale(request);
    const redirectUrl = request.nextUrl.clone();
    const suffix = originalPathname === "/" ? "" : originalPathname;
    redirectUrl.pathname = `/${preferredLocale}${suffix}`;
    const redirectResponse = NextResponse.redirect(redirectUrl);
    setLocaleCookie(redirectResponse, preferredLocale);
    return redirectResponse;
  }

  const normalizedPathname = localeInfo ? localeInfo.restPath : originalPathname;
  let response: NextResponse | null = null;

  if (localeInfo && localeInfo.type === "rewrite") {
    request.cookies.set(LOCALE_STORAGE_KEY, localeInfo.locale);
    response = handleImageRewrite(request, normalizedPathname);
    if (!response) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = normalizedPathname;
      response = NextResponse.rewrite(rewriteUrl);
    }
    setLocaleCookie(response, localeInfo.locale);
    return response;
  }

  const imageResponse = handleImageRewrite(request, normalizedPathname);
  if (imageResponse) {
    return imageResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_BASE_URL, API_STATIC_KEY } from "@/lib/api/config";

const PUBLIC_FILE = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|txt|xml|json|map)$/i;
const DEFAULT_ALLOWED_PREFIXES = ["/admin", "/api", "/_next", "/_vercel", "/static", "/images", "/fonts"];
const ALWAYS_ALLOWED_PATHS = new Set([
    "/maintenance",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.json",
]);

type MaintenanceState = {
    enabled: boolean;
    allowPaths: string[];
};

const parseAllowPaths = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0);
};

const normalizeState = (payload: unknown): MaintenanceState => {
    if (!payload || typeof payload !== "object") {
        return { enabled: false, allowPaths: [] };
    }

    const candidate = payload as { enabled?: unknown; allow_paths?: unknown };

    return {
        enabled: Boolean(candidate.enabled),
        allowPaths: parseAllowPaths(candidate.allow_paths),
    };
};

const fetchMaintenanceState = async (): Promise<MaintenanceState> => {
    if (!API_BASE_URL) {
        return { enabled: false, allowPaths: [] };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/settings/maintenance`, {
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": API_STATIC_KEY,
            },
            method: "GET",
            cache: "no-store",
            next: { revalidate: 30 },
        });

        if (!response.ok) {
            return { enabled: false, allowPaths: [] };
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return { enabled: false, allowPaths: [] };
        }

        const body = (await response.json()) as { data?: unknown } | null;
        return normalizeState(body?.data ?? null);
    } catch (error) {
        console.error("Nu s-a putut verifica starea de mentenanță", error);
        return { enabled: false, allowPaths: [] };
    }
};

const isPrefixAllowed = (pathname: string): boolean =>
    DEFAULT_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isExplicitlyAllowed = (pathname: string, allowPaths: string[]): boolean => {
    if (ALWAYS_ALLOWED_PATHS.has(pathname)) {
        return true;
    }

    return allowPaths.some((allowedPath) => {
        if (!allowedPath) return false;
        if (allowedPath.endsWith("*")) {
            const base = allowedPath.slice(0, -1);
            return base.length === 0 || pathname.startsWith(base);
        }
        if (pathname === allowedPath) {
            return true;
        }
        return pathname.startsWith(`${allowedPath}/`);
    });
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (request.method !== "GET" && request.method !== "HEAD") {
        return NextResponse.next();
    }

    if (PUBLIC_FILE.test(pathname)) {
        return NextResponse.next();
    }

    if (isPrefixAllowed(pathname)) {
        return NextResponse.next();
    }

    const state = await fetchMaintenanceState();

    if (!state.enabled) {
        return NextResponse.next();
    }

    if (isExplicitlyAllowed(pathname, state.allowPaths)) {
        return NextResponse.next();
    }

    const maintenanceUrl = request.nextUrl.clone();
    maintenanceUrl.pathname = "/maintenance";
    maintenanceUrl.search = "";

    return NextResponse.rewrite(maintenanceUrl);
}

export const config = {
    matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30;
const CACHE_CONTROL_HEADER = `public, max-age=${ONE_MONTH_IN_SECONDS}, s-maxage=${ONE_MONTH_IN_SECONDS}, immutable`;

interface ResourceConfig {
    url: string;
    contentType?: string;
    forwardQuery?: boolean;
}

const RESOURCES: Record<string, ResourceConfig> = {
    "meta-pixel": {
        url: "https://connect.facebook.net/en_US/fbevents.js",
        contentType: "application/javascript; charset=utf-8",
    },
    "cookie-script": {
        url: "https://cdn.cookie-script.com/s/1dbe1a6c3b981120922353311f510e1d.js",
        contentType: "application/javascript; charset=utf-8",
    },
    "tiktok-pixel": {
        url: "https://analytics.tiktok.com/i18n/pixel/events.js",
        contentType: "application/javascript; charset=utf-8",
        forwardQuery: true,
    },
};

const normalizeResourceKey = (raw: string | undefined): string | null => {
    if (!raw) {
        return null;
    }

    const cleaned = raw.trim().toLowerCase().replace(/\.(?:js|mjs|cjs)$/u, "");
    if (!cleaned) {
        return null;
    }

    return cleaned;
};

const buildTargetUrl = (req: NextRequest, config: ResourceConfig): string => {
    if (config.forwardQuery && req.nextUrl.search) {
        return `${config.url}${req.nextUrl.search}`;
    }

    return config.url;
};

const pickForwardHeaders = (req: NextRequest): HeadersInit => {
    const headers = new Headers();
    const FORWARDED_HEADER_KEYS = ["user-agent", "accept-language", "referer", "origin"];

    FORWARDED_HEADER_KEYS.forEach((key) => {
        const value = req.headers.get(key);

        if (value) {
            headers.set(key, value);
        }
    });

    headers.set("Accept", "application/javascript, text/javascript, */*;q=0.1");

    return headers;
};

type RouteContext = { params?: { resource?: string } };

const buildResponseFromUpstream = (upstream: Response, contentType?: string) => {
    const headers = new Headers(upstream.headers);

    if (contentType) {
        headers.set("content-type", contentType);
    }

    headers.set("cache-control", CACHE_CONTROL_HEADER);

    // Streaming responses should not advertise the upstream content length to avoid mismatches when
    // Next.js re-chunks the readable stream. Browsers will happily accept chunked transfer encoding.
    headers.delete("content-length");

    return new Response(upstream.body, {
        status: upstream.status,
        headers,
    });
};

export async function GET(req: NextRequest, context: RouteContext) {
    const key = normalizeResourceKey(context?.params?.resource);

    if (!key) {
        return NextResponse.json({ error: "Resursa solicitată nu este validă" }, {
            status: 400,
            headers: { "Cache-Control": "no-store" },
        });
    }

    const config = RESOURCES[key];

    if (!config) {
        return NextResponse.json({ error: "Resursa solicitată nu este disponibilă" }, {
            status: 404,
            headers: { "Cache-Control": "no-store" },
        });
    }

    const targetUrl = buildTargetUrl(req, config);

    let upstream: Response;

    try {
        upstream = await fetch(targetUrl, {
            cache: "no-store",
            headers: pickForwardHeaders(req),
        });
    } catch (error) {
        console.error("Nu am putut descărca resursa externă", { targetUrl, error });
        return NextResponse.redirect(targetUrl, {
            status: 307,
        });
    }

    if (!upstream.ok || !upstream.body) {
        console.error("Răspuns invalid de la furnizorul extern", {
            targetUrl,
            status: upstream.status,
            statusText: upstream.statusText,
        });

        return NextResponse.redirect(targetUrl, {
            status: 307,
        });
    }

    const contentType = config.contentType ?? upstream.headers.get("content-type") ?? "application/javascript; charset=utf-8";

    return buildResponseFromUpstream(upstream, contentType);
}

export async function HEAD(req: NextRequest, context: RouteContext) {
    const response = await GET(req, context);

    return new NextResponse(null, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
    });
}

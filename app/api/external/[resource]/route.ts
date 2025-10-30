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

export async function GET(req: NextRequest, context: any) {
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

    if (!upstream.ok) {
        console.error("Răspuns invalid de la furnizorul extern", {
            targetUrl,
            status: upstream.status,
            statusText: upstream.statusText,
        });

        return NextResponse.redirect(targetUrl, {
            status: 307,
        });
    }

    const body = await upstream.arrayBuffer();
    const contentType = config.contentType ?? upstream.headers.get("content-type");
    const response = new NextResponse(body);

    if (contentType) {
        response.headers.set("Content-Type", contentType);
    }

    const etag = upstream.headers.get("etag");
    if (etag) {
        response.headers.set("ETag", etag);
    }

    response.headers.set("Cache-Control", CACHE_CONTROL_HEADER);

    return response;
}

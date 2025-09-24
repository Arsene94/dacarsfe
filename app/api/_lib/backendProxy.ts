import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const DISALLOWED_FORWARD_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "referer",
  "origin",
  "accept-encoding",
]);

const ensureAbsolutePath = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`Expected absolute path to start with '/' but received: ${path}`);
  }
  return path;
};

const buildTargetUrl = (path: string): string => {
  const normalizedPath = ensureAbsolutePath(path);
  if (DEFAULT_BACKEND_BASE.endsWith("/")) {
    return `${DEFAULT_BACKEND_BASE.slice(0, -1)}${normalizedPath}`;
  }
  return `${DEFAULT_BACKEND_BASE}${normalizedPath}`;
};

const forwardHeadersFromRequest = (req: NextRequest): Headers => {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!DISALLOWED_FORWARD_HEADERS.has(lowerKey)) {
      headers.set(key, value);
    }
  });
  return headers;
};

const mergeHeaders = (base: Headers, override?: HeadersInit): Headers => {
  if (!override) {
    return base;
  }

  const merged = new Headers(base);
  const appendEntries = (source: Headers) => {
    source.forEach((value, key) => {
      merged.set(key, value);
    });
  };

  if (override instanceof Headers) {
    appendEntries(override);
    return merged;
  }

  if (Array.isArray(override)) {
    override.forEach(([key, value]) => {
      if (typeof value !== "undefined") {
        merged.set(key, value);
      }
    });
    return merged;
  }

  Object.entries(override).forEach(([key, value]) => {
    if (typeof value !== "undefined") {
      merged.set(key, String(value));
    }
  });

  return merged;
};

const readRequestBody = async (req: NextRequest): Promise<BodyInit | undefined> => {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  const raw = await req.text();
  return raw.length > 0 ? raw : undefined;
};

const buildProxyResponse = async (response: Response): Promise<NextResponse> => {
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "content-length" || lowerKey === "transfer-encoding") {
      return;
    }
    headers.set(key, value);
  });
  headers.set("cache-control", "no-store");

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
};

export const forwardApiRequest = async (
  req: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<NextResponse> => {
  try {
    const targetUrl = buildTargetUrl(path);
    const method = init?.method ?? req.method;

    const baseHeaders = forwardHeadersFromRequest(req);
    const headers = mergeHeaders(baseHeaders, init?.headers);

    let body: BodyInit | undefined;
    if (typeof init?.body !== "undefined") {
      body = init.body as BodyInit;
    } else {
      body = await readRequestBody(req);
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
    });

    return await buildProxyResponse(response);
  } catch (error) {
    console.error("Failed to forward API request", error);
    return NextResponse.json(
      {
        message: "Failed to reach backend",
      },
      { status: 502 },
    );
  }
};

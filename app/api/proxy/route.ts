import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_BASE = 'http://127.0.0.1:8000';

const resolveBackendBase = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    return DEFAULT_BACKEND_BASE;
  }

  const trimmed = apiUrl.trim();

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch (error) {
    const withoutTrailingSlash = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
    const withoutApiSuffix = withoutTrailingSlash.replace(/\/api(?:\/v\d+)?$/i, '');
    return withoutApiSuffix || withoutTrailingSlash || DEFAULT_BACKEND_BASE;
  }
};

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
  }

  const backendBase = resolveBackendBase();
  const targetUrl = `${backendBase}${urlParam}`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new NextResponse('Failed to fetch file', { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/pdf';
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new NextResponse('Error fetching file', { status: 500 });
  }
}

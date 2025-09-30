import { NextRequest, NextResponse } from 'next/server';

const sanitizeFileName = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 200);
};

const encodeRFC5987ValueChars = (value: string): string =>
  encodeURIComponent(value)
    .replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(7C|60|5E)/g, (match, hex) => `%${hex}`);

const buildContentDisposition = (fileName: string): string => {
  const encoded = encodeRFC5987ValueChars(fileName);
  return `inline; filename="${fileName}"; filename*=UTF-8''${encoded}`;
};

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
  }

  const filenameParam = req.nextUrl.searchParams.get('filename');
  const sanitizedFileName = filenameParam ? sanitizeFileName(filenameParam) : null;

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
  const targetUrl = `${backendBase}${urlParam}`;

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new NextResponse('Failed to fetch file', { status: res.status });
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/pdf';
    const originalContentDisposition = res.headers.get('content-disposition');
    const fallbackEncoded = originalContentDisposition?.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? null;
    const decodedFallback = (() => {
      if (!fallbackEncoded) {
        return null;
      }
      try {
        return decodeURIComponent(fallbackEncoded);
      } catch (error) {
        console.warn('Failed to decode filename* from Content-Disposition', error);
        return null;
      }
    })();
    const fallbackNameRaw =
      decodedFallback ||
      originalContentDisposition?.match(/filename="?([^";]+)"?/)?.[1] ||
      null;
    const resolvedFileName =
      sanitizedFileName || (fallbackNameRaw ? sanitizeFileName(fallbackNameRaw) : null);
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    };

    if (resolvedFileName) {
      headers['Content-Disposition'] = buildContentDisposition(resolvedFileName);
    }

    return new NextResponse(arrayBuffer, {
      headers
    });
  } catch (err) {
    return new NextResponse('Error fetching file', { status: 500 });
  }
}

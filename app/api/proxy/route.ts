import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'url query parameter is required' }, { status: 400 });
  }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
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

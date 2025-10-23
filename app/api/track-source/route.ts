import { NextRequest, NextResponse } from 'next/server';

const resolveBackendBase = (): string | null => {
    const candidates = [process.env.LARAVEL_API_URL, process.env.NEXT_PUBLIC_BACKEND_URL];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    return null;
};

const buildTargetUrl = (base: string): string => {
    try {
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return new URL('/api/track-source', normalizedBase).toString();
    } catch (error) {
        const sanitized = base.replace(/\/$/, '');
        return `${sanitized}/api/track-source`;
    }
};

export async function POST(request: NextRequest) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch (error) {
        return NextResponse.json({ error: 'Payload JSON invalid.' }, { status: 400 });
    }

    if (!payload || typeof payload !== 'object') {
        return NextResponse.json({ error: 'Structura payload-ului este invalidă.' }, { status: 400 });
    }

    const backendBase = resolveBackendBase();
    if (!backendBase) {
        return NextResponse.json(
            { error: 'LARAVEL_API_URL sau NEXT_PUBLIC_BACKEND_URL nu este configurat.' },
            { status: 500 },
        );
    }

    const targetUrl = buildTargetUrl(backendBase);

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const text = await response.text();
        let data: unknown = null;

        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        if (!response.ok) {
            return NextResponse.json(
                {
                    error: 'Backend-ul Laravel a returnat o eroare.',
                    status: response.status,
                    details: data,
                },
                { status: response.status },
            );
        }

        if (typeof data === 'object' && data !== null) {
            return NextResponse.json(data as Record<string, unknown>, { status: 200 });
        }

        return NextResponse.json({ status: 'tracked' }, { status: 200 });
    } catch (error) {
        console.error('Nu am putut trimite tracking-ul sursei către Laravel', error);
        return NextResponse.json(
            { error: 'Nu am putut contacta serviciul de tracking.', details: (error as Error).message },
            { status: 502 },
        );
    }
}

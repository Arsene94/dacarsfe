// qs.ts
export function toQuery(params: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;

        // omit stringuri goale
        if (typeof v === 'string') {
            const vv = v.trim();
            if (!vv) return;
            qs.append(k, vv);
            return;
        }

        // liste
        if (Array.isArray(v)) {
            if (v.length === 0) return;
            v.forEach((it) => qs.append(`${k}[]`, String(it)));
            return;
        }

        // numere/booleans
        qs.append(k, String(v));
    });
    return qs.toString();
}

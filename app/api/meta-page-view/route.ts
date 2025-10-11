export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { eventName, eventSourceUrl, fbc, fbp, ipAddress, userAgent, externalId } = body ?? {};

        const toNonEmptyTrimmedString = (value: unknown): string | null => {
            if (typeof value === "string") {
                const trimmed = value.trim();
                return trimmed.length > 0 ? trimmed : null;
            }

            if (typeof value === "number" && Number.isFinite(value)) {
                const normalized = String(value).trim();
                return normalized.length > 0 ? normalized : null;
            }

            return null;
        };

        const normalizedEventName =
            typeof eventName === "string" && eventName.trim().length > 0
                ? eventName.trim()
                : "PageView";
        const normalizedEventSourceUrl = toNonEmptyTrimmedString(eventSourceUrl);
        const normalizedFbc = toNonEmptyTrimmedString(fbc);
        const normalizedFbp = toNonEmptyTrimmedString(fbp);
        const normalizedIp = toNonEmptyTrimmedString(ipAddress);
        const normalizedUserAgent = toNonEmptyTrimmedString(userAgent);
        const normalizedExternalId = toNonEmptyTrimmedString(externalId);

        const payload = {
            data: [
                {
                    action_source: "website",
                    event_name: normalizedEventName,
                    event_time: Math.floor(Date.now() / 1000),
                    ...(normalizedEventSourceUrl ? { event_source_url: normalizedEventSourceUrl } : {}),
                    user_data: {
                        ...(normalizedFbc ? { fbc: normalizedFbc } : {}),
                        ...(normalizedFbp ? { fbp: normalizedFbp } : {}),
                        ...(normalizedIp ? { client_ip_address: normalizedIp } : {}),
                        ...(normalizedUserAgent ? { client_user_agent: normalizedUserAgent } : {}),
                        ...(normalizedExternalId ? { external_id: normalizedExternalId } : {}),
                    },
                },
            ],
        };

        const res = await fetch(
            `https://graph.facebook.com/v24.0/721655939471514/events?access_token=EAAYvqPpASdoBPragGzaxgagBVZAwwMJuUuOZBzkY8XZCtHzpoSxv4AZB9ZBo1aUYq1TMEvjW3oOg4je8ZAipmwF0mCQD746UZAxFePJMIiqLzGrlXCvszFk29ojHEiZCrieZBpxZCRWVZCbr9ZAGFhkaGZCZBuj2pLORPkuyyrqnD3wOo2bO3ZCfPyb5QwfoejoXdtZCTZBzJNQZDZD`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }
        );

        const data = await res.json();
        return Response.json({ success: true, data });
    } catch (error) {
        console.error("Meta PageView API error:", error);
        return new Response("Error sending page view to Meta", { status: 500 });
    }
}

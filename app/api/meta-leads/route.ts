import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, phone, leadId, eventName, crmName } = body;

        // Hashare cu SHA256 pentru privacy
        const hash = (value: string) =>
            crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");

        const payload = {
            data: [
                {
                    action_source: "system_generated",
                    event_name: eventName || "Lead",
                    event_time: Math.floor(Date.now() / 1000),
                    custom_data: {
                        event_source: "crm",
                        lead_event_source: crmName || "DaCarsCRM",
                    },
                    user_data: {
                        em: email ? [hash(email)] : [],
                        ph: phone ? [hash(phone)] : [],
                        lead_id: leadId,
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
    } catch (err) {
        console.error("Meta API error:", err);
        return new Response("Error sending lead to Meta", { status: 500 });
    }
}

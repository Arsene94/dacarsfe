import { NextResponse } from "next/server";
import { LLMS_DIRECTIVES } from "@/lib/seo/llms";

export const dynamic = "force-static";

export function GET() {
    return new NextResponse(LLMS_DIRECTIVES, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
        },
    });
}

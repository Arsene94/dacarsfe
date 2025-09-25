import { NextResponse } from "next/server";
import { buildOverviewResponse } from "@/lib/reports/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week_start");
  const quarter = searchParams.get("quarter");

  const payload = buildOverviewResponse({ weekStart, quarter });
  return NextResponse.json(payload);
}

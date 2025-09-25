import { NextResponse } from "next/server";
import { buildQuarterlyResponse } from "@/lib/reports/data";

const BAD_REQUEST = 400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get("quarter");
  const compareWith = searchParams.get("compare_with");
  const customCompare = searchParams.get("custom_compare");

  if (!quarter) {
    return NextResponse.json(
      { message: "Parametrul quarter este obligatoriu." },
      { status: BAD_REQUEST },
    );
  }

  try {
    const payload = buildQuarterlyResponse({ quarter, compareWith, customCompare });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: BAD_REQUEST });
    }
    return NextResponse.json(
      { message: "Nu am putut genera raportul trimestrial." },
      { status: BAD_REQUEST },
    );
  }
}

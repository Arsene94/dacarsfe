import { NextResponse } from "next/server";
import { buildMonthlyResponse } from "@/lib/reports/data";

const BAD_REQUEST = 400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const compareWith = searchParams.get("compare_with");
  const customCompare = searchParams.get("custom_compare");

  if (!month) {
    return NextResponse.json(
      { message: "Parametrul month este obligatoriu." },
      { status: BAD_REQUEST },
    );
  }

  try {
    const payload = buildMonthlyResponse({ month, compareWith, customCompare });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: BAD_REQUEST });
    }
    return NextResponse.json(
      { message: "Nu am putut genera raportul lunar." },
      { status: BAD_REQUEST },
    );
  }
}

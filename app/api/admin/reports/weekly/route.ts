import { NextResponse } from "next/server";
import { buildWeeklyResponse } from "@/lib/reports/data";

const BAD_REQUEST = 400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const compareWith = searchParams.get("compare_with");
  const customCompareStart = searchParams.get("custom_compare_start");

  if (!startDate) {
    return NextResponse.json(
      { message: "Parametrul start_date este obligatoriu." },
      { status: BAD_REQUEST },
    );
  }

  try {
    const payload = buildWeeklyResponse({
      startDate,
      compareWith,
      customCompareStart,
    });
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: BAD_REQUEST });
    }
    return NextResponse.json(
      { message: "Nu am putut genera raportul săptămânal." },
      { status: BAD_REQUEST },
    );
  }
}

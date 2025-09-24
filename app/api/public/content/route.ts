import { NextRequest } from "next/server";

import { forwardApiRequest } from "@/app/api/_lib/backendProxy";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return forwardApiRequest(req, `/public/content${search}`);
}

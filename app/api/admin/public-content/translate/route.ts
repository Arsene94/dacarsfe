import { NextRequest } from "next/server";

import { forwardApiRequest } from "@/app/api/_lib/backendProxy";

export async function POST(req: NextRequest) {
  return forwardApiRequest(req, "/admin/public-content/translate", {
    method: "POST",
  });
}

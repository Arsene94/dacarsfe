import { NextRequest } from "next/server";

import { forwardApiRequest } from "@/app/api/_lib/backendProxy";

type Params = {
  params: {
    locale: string;
  };
};

export async function GET(req: NextRequest, { params }: Params) {
  const search = req.nextUrl.search;
  const locale = encodeURIComponent(params.locale);
  return forwardApiRequest(req, `/admin/public-content/${locale}${search}`);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const locale = encodeURIComponent(params.locale);
  return forwardApiRequest(req, `/admin/public-content/${locale}`, {
    method: "PUT",
  });
}

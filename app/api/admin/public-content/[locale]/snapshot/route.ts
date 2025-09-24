import { NextRequest } from "next/server";

import { forwardApiRequest } from "@/app/api/_lib/backendProxy";

type Params = {
  params: {
    locale: string;
  };
};

export async function POST(req: NextRequest, { params }: Params) {
  const locale = encodeURIComponent(params.locale);
  return forwardApiRequest(req, `/admin/public-content/${locale}/snapshot`, {
    method: "POST",
  });
}

import type { ApiRequestOptions } from "@/lib/api";

const BLOG_SERVICE_TOKEN_CANDIDATES = [
  process.env.BLOG_API_TOKEN,
  process.env.BLOG_SERVICE_TOKEN,
  process.env.DACARS_BLOG_API_TOKEN,
  process.env.DACARS_BLOG_SERVICE_TOKEN,
  process.env.API_BLOG_TOKEN,
  process.env.API_SERVICE_TOKEN,
  process.env.ADMIN_API_TOKEN,
  process.env.DACARS_SERVICE_TOKEN,
  process.env.NEXT_PUBLIC_BLOG_API_TOKEN,
  process.env.NEXT_PUBLIC_BLOG_SERVICE_TOKEN,
  process.env.NEXT_PUBLIC_API_TOKEN,
  process.env.NEXT_PUBLIC_ADMIN_API_TOKEN,
];

const buildBaseRequestOptions = () => ({
  cache: "no-store" as RequestCache,
  headers: {
    Accept: "application/json",
  } as Record<string, string>,
});

let blogTokenWarningShown = false;

export const getBlogServiceToken = (): string | null => {
  for (const candidate of BLOG_SERVICE_TOKEN_CANDIDATES) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
};

export const getBlogRequestOptions = (): ApiRequestOptions | undefined => {
  const token = getBlogServiceToken();
  if (!token) {
    if (!blogTokenWarningShown) {
      blogTokenWarningShown = true;
      console.warn(
        "Nu am găsit niciun token de serviciu pentru blog. Setează `BLOG_API_TOKEN` (sau `NEXT_PUBLIC_BLOG_API_TOKEN`) înainte de a accesa paginile de blog.",
      );
    }
    return buildBaseRequestOptions();
  }
  return {
    ...buildBaseRequestOptions(),
    authToken: token,
  };
};

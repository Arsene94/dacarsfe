import { getRequestedPathname } from "@/lib/seo/requestPath";
import { canonical } from "@/lib/seo/url";

const CanonicalHeadLink = async () => {
  const pathname = await getRequestedPathname();
  const href = canonical(pathname);

  return <link rel="canonical" href={href} />;
};

export default CanonicalHeadLink;

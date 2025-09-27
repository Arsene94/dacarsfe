import type { MetadataRoute } from "next";
import { ROBOTS_CONFIG } from "@/lib/seo/robots";

export const dynamic = "force-static";

const robotsRoute = (): MetadataRoute.Robots => ROBOTS_CONFIG;

export default robotsRoute;

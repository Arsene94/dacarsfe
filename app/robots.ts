import type { MetadataRoute } from "next";
import { generateRobotsConfig } from "@/lib/seo/robots";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const robotsRoute = async (): Promise<MetadataRoute.Robots> => generateRobotsConfig();

export default robotsRoute;

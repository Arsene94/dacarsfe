import type { MetadataRoute } from "next";
import { robots } from "@/app/api/robots/route";

export const dynamic = "force-static";

const robotsRoute = (): MetadataRoute.Robots => robots;

export default robotsRoute;

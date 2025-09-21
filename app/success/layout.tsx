import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";

const successMetadata = buildMetadata({
    title: "Rezervarea ta este confirmată",
    description: "Vezi sumarul rezervării tale DaCars, detaliile de preluare și datele de contact ale echipei noastre.",
    path: "/success",
    openGraphTitle: "Rezervarea ta este confirmată | DaCars Rent a Car",
    noIndex: true,
});

export const metadata: Metadata = {
    ...successMetadata,
};

const SuccessLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default SuccessLayout;

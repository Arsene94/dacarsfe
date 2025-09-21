import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";

const checkoutMetadata = buildMetadata({
    title: "Finalizează rezervarea",
    description: "Completează datele și opțiunile pentru a confirma rezervarea mașinii alese de la DaCars.",
    path: "/checkout",
    openGraphTitle: "Finalizează rezervarea ta | DaCars Rent a Car",
    noIndex: true,
});

export const metadata: Metadata = {
    ...checkoutMetadata,
};

const CheckoutLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default CheckoutLayout;

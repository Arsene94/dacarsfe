import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";
import { resolveRequestLocale } from "@/lib/i18n/server";
import checkoutMessagesRo from "@/messages/checkout/ro.json";

const { metadata: checkoutMetadataMessages } = checkoutMessagesRo;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveRequestLocale();

    return buildMetadata({
        title: checkoutMetadataMessages.title,
        description: checkoutMetadataMessages.description,
        path: "/form",
        openGraphTitle: checkoutMetadataMessages.openGraphTitle,
        noIndex: true,
        locale,
    });
}

const CheckoutLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default CheckoutLayout;

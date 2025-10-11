import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";
import checkoutMessagesRo from "@/messages/checkout/ro.json";

type CheckoutMessages = typeof checkoutMessagesRo;

const checkoutMessages: CheckoutMessages = checkoutMessagesRo;
const { metadata: checkoutMetadataMessages } = checkoutMessages;

const checkoutMetadata = buildMetadata({
    title: checkoutMetadataMessages.title,
    description: checkoutMetadataMessages.description,
    path: "/form",
    openGraphTitle: checkoutMetadataMessages.openGraphTitle,
    noIndex: true,
});

export const metadata: Metadata = {
    ...checkoutMetadata,
};

const CheckoutLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default CheckoutLayout;

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";
import successMessagesRo from "@/messages/success/ro.json";

type SuccessMessages = typeof successMessagesRo;

const successMessages: SuccessMessages = successMessagesRo;
const { metadata: successMetadataMessages } = successMessages;

const successMetadata = buildMetadata({
    title: successMetadataMessages.title,
    description: successMetadataMessages.description,
    path: "/success",
    openGraphTitle: successMetadataMessages.openGraphTitle,
    noIndex: true,
});

export const metadata: Metadata = {
    ...successMetadata,
};

const SuccessLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default SuccessLayout;

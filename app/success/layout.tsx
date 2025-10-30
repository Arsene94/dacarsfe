import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo/meta";
import { resolveRequestLocale } from "@/lib/i18n/server";
import successMessagesRo from "@/messages/success/ro.json";

const { metadata: successMetadataMessages } = successMessagesRo;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await resolveRequestLocale();

    return buildMetadata({
        title: successMetadataMessages.title,
        description: successMetadataMessages.description,
        path: "/success",
        openGraphTitle: successMetadataMessages.openGraphTitle,
        noIndex: true,
        locale,
    });
}

const SuccessLayout = ({ children }: { children: ReactNode }) => <>{children}</>;

export default SuccessLayout;

"use client";

import { useMemo } from "react";

type JsonLdProps = {
    data: unknown;
    id?: string;
};

const JsonLd = ({ data, id }: JsonLdProps) => {
    const json = useMemo(() => {
        if (!data) {
            return "";
        }

        try {
            return JSON.stringify(data);
        } catch {
            return "";
        }
    }, [data]);

    if (!data || !json) {
        return null;
    }

    return (
        <script
            id={id}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
            suppressHydrationWarning
        />
    );
};

export default JsonLd;

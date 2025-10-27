"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "@/context/LocaleContext";
import { createLocalePathBuilder } from "./routing";

export const useLocaleHref = () => {
    const { locale, availableLocales } = useLocale();

    const builder = useMemo(
        () =>
            createLocalePathBuilder({
                locale,
                availableLocales,
            }),
        [locale, availableLocales],
    );

    return useCallback((href: string) => builder(href), [builder]);
};

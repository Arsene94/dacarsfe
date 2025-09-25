import type { Locale } from "./config";
import layoutEn from "@/messages/layout/en.json";
import layoutRo from "@/messages/layout/ro.json";
import layoutIt from "@/messages/layout/it.json";
import homeEn from "@/messages/home/en.json";
import homeRo from "@/messages/home/ro.json";
import homeIt from "@/messages/home/it.json";
import carsEn from "@/messages/cars/en.json";
import carsRo from "@/messages/cars/ro.json";
import carsIt from "@/messages/cars/it.json";
import checkoutEn from "@/messages/checkout/en.json";
import checkoutRo from "@/messages/checkout/ro.json";
import checkoutIt from "@/messages/checkout/it.json";
import successEn from "@/messages/success/en.json";
import successRo from "@/messages/success/ro.json";
import successIt from "@/messages/success/it.json";

export type PageKey = "layout" | "home" | "cars" | "checkout" | "success";

type Messages = Record<string, unknown>;

type TranslationResources = Record<PageKey, Record<Locale, Messages>>;

const resources: TranslationResources = {
    layout: {
        en: layoutEn as Messages,
        ro: layoutRo as Messages,
        it: layoutIt as Messages,
    },
    home: {
        en: homeEn as Messages,
        ro: homeRo as Messages,
        it: homeIt as Messages,
    },
    cars: {
        en: carsEn as Messages,
        ro: carsRo as Messages,
        it: carsIt as Messages,
    },
    checkout: {
        en: checkoutEn as Messages,
        ro: checkoutRo as Messages,
        it: checkoutIt as Messages,
    },
    success: {
        en: successEn as Messages,
        ro: successRo as Messages,
        it: successIt as Messages,
    },
};

export const getPageMessages = <T extends Messages = Messages>(
    page: PageKey,
    locale: Locale,
): T => {
    const pageResources = resources[page];
    const messages = pageResources?.[locale] ?? pageResources?.ro;
    return (messages ?? {}) as T;
};

import type { Locale } from "./config";
import layoutEn from "@/messages/layout/en.json";
import layoutRo from "@/messages/layout/ro.json";
import layoutIt from "@/messages/layout/it.json";
import layoutEs from "@/messages/layout/es.json";
import layoutFr from "@/messages/layout/fr.json";
import layoutDe from "@/messages/layout/de.json";
import homeEn from "@/messages/home/en.json";
import homeRo from "@/messages/home/ro.json";
import homeIt from "@/messages/home/it.json";
import homeEs from "@/messages/home/es.json";
import homeFr from "@/messages/home/fr.json";
import homeDe from "@/messages/home/de.json";
import carsEn from "@/messages/cars/en.json";
import carsRo from "@/messages/cars/ro.json";
import carsIt from "@/messages/cars/it.json";
import carsEs from "@/messages/cars/es.json";
import carsFr from "@/messages/cars/fr.json";
import carsDe from "@/messages/cars/de.json";
import checkoutEn from "@/messages/checkout/en.json";
import checkoutRo from "@/messages/checkout/ro.json";
import checkoutIt from "@/messages/checkout/it.json";
import checkoutEs from "@/messages/checkout/es.json";
import checkoutFr from "@/messages/checkout/fr.json";
import checkoutDe from "@/messages/checkout/de.json";
import successEn from "@/messages/success/en.json";
import successRo from "@/messages/success/ro.json";
import successIt from "@/messages/success/it.json";
import successEs from "@/messages/success/es.json";
import successFr from "@/messages/success/fr.json";
import successDe from "@/messages/success/de.json";

export type PageKey = "layout" | "home" | "cars" | "checkout" | "success";

type Messages = Record<string, unknown>;

type TranslationResources = Record<PageKey, Record<Locale, Messages>>;

const resources: TranslationResources = {
    layout: {
        en: layoutEn as Messages,
        ro: layoutRo as Messages,
        it: layoutIt as Messages,
        es: layoutEs as Messages,
        fr: layoutFr as Messages,
        de: layoutDe as Messages,
    },
    home: {
        en: homeEn as Messages,
        ro: homeRo as Messages,
        it: homeIt as Messages,
        es: homeEs as Messages,
        fr: homeFr as Messages,
        de: homeDe as Messages,
    },
    cars: {
        en: carsEn as Messages,
        ro: carsRo as Messages,
        it: carsIt as Messages,
        es: carsEs as Messages,
        fr: carsFr as Messages,
        de: carsDe as Messages,
    },
    checkout: {
        en: checkoutEn as Messages,
        ro: checkoutRo as Messages,
        it: checkoutIt as Messages,
        es: checkoutEs as Messages,
        fr: checkoutFr as Messages,
        de: checkoutDe as Messages,
    },
    success: {
        en: successEn as Messages,
        ro: successRo as Messages,
        it: successIt as Messages,
        es: successEs as Messages,
        fr: successFr as Messages,
        de: successDe as Messages,
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

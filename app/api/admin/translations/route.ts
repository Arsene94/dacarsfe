import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { PageKey } from "@/lib/i18n/translations";

const PAGE_KEYS: readonly PageKey[] = ["layout", "home", "cars", "checkout", "success"] as const;
const LOCALE_SET = new Set<string>(AVAILABLE_LOCALES);

const isPageKey = (value: unknown): value is PageKey =>
    typeof value === "string" && PAGE_KEYS.includes(value as PageKey);

const isLocale = (value: unknown): value is Locale =>
    typeof value === "string" && LOCALE_SET.has(value);

const getMessagesPath = (page: PageKey, locale: Locale): string =>
    path.join(process.cwd(), "messages", page, `${locale}.json`);

const readMessages = async (page: PageKey, locale: Locale): Promise<Record<string, unknown>> => {
    const filePath = getMessagesPath(page, locale);

    try {
        const raw = await fs.readFile(filePath, "utf-8");
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
            return {};
        }

        throw error;
    }
};

const writeMessages = async (page: PageKey, locale: Locale, messages: Record<string, unknown>): Promise<void> => {
    const filePath = getMessagesPath(page, locale);
    const payload = `${JSON.stringify(messages, null, 2)}\n`;
    await fs.writeFile(filePath, payload, "utf-8");
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const localeParam = searchParams.get("locale");

    if (pageParam && !isPageKey(pageParam)) {
        return NextResponse.json(
            { error: "Pagina solicitată nu este suportată." },
            { status: 400 },
        );
    }

    if (localeParam && !isLocale(localeParam)) {
        return NextResponse.json(
            { error: "Limba solicitată nu este suportată." },
            { status: 400 },
        );
    }

    const page = (pageParam && isPageKey(pageParam) ? pageParam : PAGE_KEYS[0]) as PageKey;
    const locale = (localeParam && isLocale(localeParam) ? localeParam : DEFAULT_LOCALE) as Locale;

    try {
        const baseMessages = await readMessages(page, DEFAULT_LOCALE);
        const messages =
            locale === DEFAULT_LOCALE
                ? baseMessages
                : await readMessages(page, locale);

        return NextResponse.json({
            page,
            locale,
            messages,
            baseMessages,
        });
    } catch (error) {
        console.error("Failed to read translations", error);
        return NextResponse.json(
            { error: "Nu am putut încărca traducerile solicitate." },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Cererea trimisă nu este un JSON valid." },
            { status: 400 },
        );
    }

    if (typeof payload !== "object" || payload === null) {
        return NextResponse.json(
            { error: "Structura cererii este invalidă." },
            { status: 400 },
        );
    }

    const { page, locale, messages } = payload as {
        page?: unknown;
        locale?: unknown;
        messages?: unknown;
    };

    if (!isPageKey(page)) {
        return NextResponse.json(
            { error: "Pagina pentru care vrei să salvezi traduceri nu este suportată." },
            { status: 400 },
        );
    }

    if (!isLocale(locale)) {
        return NextResponse.json(
            { error: "Limba selectată nu este suportată." },
            { status: 400 },
        );
    }

    if (typeof messages !== "object" || messages === null || Array.isArray(messages)) {
        return NextResponse.json(
            { error: "Structura traducerilor trebuie să fie un obiect JSON." },
            { status: 400 },
        );
    }

    try {
        await writeMessages(page, locale, messages as Record<string, unknown>);
        const baseMessages = await readMessages(page, DEFAULT_LOCALE);
        const savedMessages =
            locale === DEFAULT_LOCALE
                ? baseMessages
                : await readMessages(page, locale);

        return NextResponse.json({
            page,
            locale,
            messages: savedMessages,
            baseMessages,
        });
    } catch (error) {
        console.error("Failed to save translations", error);
        return NextResponse.json(
            { error: "Nu am putut salva traducerile. Încearcă din nou." },
            { status: 500 },
        );
    }
}

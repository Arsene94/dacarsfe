import Link from "next/link";
import { Compass, Home, Phone } from "lucide-react";
import { createLocalePathBuilder } from "@/lib/i18n/routing";
import { getFallbackLocale, getSupportedLocales, resolveRequestLocale } from "@/lib/i18n/serverLocale";

const FALLBACK_LOCALE = getFallbackLocale();
const SUPPORTED_LOCALES = getSupportedLocales();

const NotFoundPage = async () => {
    const locale = await resolveRequestLocale({ fallbackLocale: FALLBACK_LOCALE });
    const buildLocaleHref = createLocalePathBuilder({
        locale,
        availableLocales: SUPPORTED_LOCALES,
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
            <div className="w-full max-w-lg space-y-6 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-slate-500/10 p-3 text-slate-300">
                    <Compass className="h-8 w-8" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Cod 404</p>
                    <h1 className="text-3xl font-semibold text-slate-50">
                        Pagina pe care o cauți nu există
                    </h1>
                    <p className="text-base text-slate-300">
                        Verifică linkul sau revino la pagina principală pentru a explora ofertele DaCars. Suntem aici să te
                        ajutăm să găsești mașina potrivită.
                    </p>
                </div>
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                    <Link
                        href={buildLocaleHref("/")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 sm:w-auto"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Înapoi la pagina principală
                    </Link>
                    <Link
                        href={buildLocaleHref("/contact")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-50 transition hover:border-slate-600 hover:bg-slate-900 sm:w-auto"
                    >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        Contactează echipa DaCars
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;

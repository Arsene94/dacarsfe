"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useLocaleHref } from "@/lib/i18n/useLocaleHref";

type GlobalErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProps) => {
    const buildLocaleHref = useLocaleHref();

    useEffect(() => {
        console.error("A apărut o eroare neașteptată în aplicație", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
            <div className="w-full max-w-lg space-y-6 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-rose-500/10 p-3 text-rose-400">
                    <AlertTriangle className="h-8 w-8" aria-hidden="true" />
                </span>
                <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-rose-300">Eroare 500</p>
                    <h1 className="text-3xl font-semibold text-slate-50">Ups! Ceva nu a funcționat corect</h1>
                    <p className="text-base text-slate-300">
                        Echipa DaCars a fost notificată și investigăm problema. Te rugăm să reîncerci în câteva momente sau să
                        revii la pagina principală.
                    </p>
                </div>
                {error.digest ? (
                    <p className="text-xs font-mono uppercase tracking-wide text-slate-400">
                        Cod incident: <span>{error.digest}</span>
                    </p>
                ) : null}
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 sm:w-auto"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Reîncearcă
                    </button>
                    <Link
                        href={buildLocaleHref("/")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-50 transition hover:border-slate-600 hover:bg-slate-900 sm:w-auto"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Mergi la pagina principală
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default GlobalError;

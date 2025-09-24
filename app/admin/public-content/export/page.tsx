"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, RefreshCcw, ShieldAlert, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { usePublicContent } from "@/context/PublicContentContext";
import apiClient from "@/lib/api";
import {
  BENEFITS_COPY_FALLBACK,
  CARS_PAGE_COPY_FALLBACK,
  FOOTER_COPY_FALLBACK,
  HEADER_COPY_FALLBACK,
  HERO_COPY_FALLBACK,
  HOME_CONTACT_COPY_FALLBACK,
  HOME_FLEET_COPY_FALLBACK,
  HOME_OFFERS_COPY_FALLBACK,
  HOME_PROCESS_COPY_FALLBACK,
  CHECKOUT_PAGE_COPY_FALLBACK,
  SUCCESS_PAGE_COPY_FALLBACK,
} from "@/lib/publicContent/defaults";

const SECTION_FALLBACKS = {
  header: HEADER_COPY_FALLBACK,
  hero: HERO_COPY_FALLBACK,
  benefits: BENEFITS_COPY_FALLBACK,
  "home.fleet": HOME_FLEET_COPY_FALLBACK,
  "home.offers": HOME_OFFERS_COPY_FALLBACK,
  "home.process": HOME_PROCESS_COPY_FALLBACK,
  "home.contact": HOME_CONTACT_COPY_FALLBACK,
  cars: CARS_PAGE_COPY_FALLBACK,
  checkout: CHECKOUT_PAGE_COPY_FALLBACK,
  success: SUCCESS_PAGE_COPY_FALLBACK,
  footer: FOOTER_COPY_FALLBACK,
} as const;

type SectionKey = keyof typeof SECTION_FALLBACKS;

const SECTION_ENTRIES = Object.entries(SECTION_FALLBACKS) as Array<
  [SectionKey, (typeof SECTION_FALLBACKS)[SectionKey]]
>;

const SECTION_KEYS = Object.keys(SECTION_FALLBACKS) as SectionKey[];

const buildFallbackSummary = (sections: Record<string, unknown>) =>
  SECTION_KEYS.map((key) => {
    const value = sections[key];
    const entries =
      value && typeof value === "object"
        ? Object.keys(value as Record<string, unknown>).length
        : 0;
    return { key, entries };
  });

const ExportPublicContentPage = () => {
  const { user } = useAuth();
  const {
    locale,
    resolve,
    refresh,
    isLoading,
    version,
    updatedAt,
    error: contentError,
  } = usePublicContent();

  const [localError, setLocalError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
  }, []);

  const sections = useMemo(() => {
    return SECTION_ENTRIES.reduce<Record<SectionKey, unknown>>(
      (accumulator, [sectionKey, fallback]) => {
        accumulator[sectionKey] = resolve(sectionKey, fallback);
        return accumulator;
      },
      {} as Record<SectionKey, unknown>,
    );
  }, [resolve]);

  const exportPayload = useMemo(
    () => ({
      locale,
      version: version ?? null,
      updated_at: updatedAt ?? null,
      sections: SECTION_KEYS,
      content: sections,
    }),
    [locale, sections, updatedAt, version],
  );

  const payloadJson = useMemo(
    () => JSON.stringify(exportPayload, null, 2),
    [exportPayload],
  );

  const handleCopy = useCallback(async () => {
    setLocalError(null);
    setSubmitSuccess(null);
    setIsCopying(true);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payloadJson);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payloadJson;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2500);
    } catch (error) {
      console.error("Failed to copy public content payload", error);
      setLocalError(
        "Nu am putut copia conținutul în clipboard. Încearcă din nou sau folosește descărcarea JSON.",
      );
    } finally {
      setIsCopying(false);
    }
  }, [payloadJson]);

  const handleDownload = useCallback(() => {
    setLocalError(null);
    setSubmitSuccess(null);
    try {
      const blob = new Blob([payloadJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `dacars-public-content-${locale}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download public content payload", error);
      setLocalError("Nu am putut genera fișierul JSON pentru descărcare.");
    }
  }, [locale, payloadJson]);

  const handleRefresh = useCallback(async () => {
    setLocalError(null);
    setSubmitSuccess(null);
    setIsRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error("Failed to refresh public content", error);
      setLocalError("Nu am putut reîmprospăta conținutul. Încearcă din nou.");
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const summary = useMemo(() => buildFallbackSummary(sections), [sections]);

  const handlePushToBackend = useCallback(async () => {
    setLocalError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    try {
      await apiClient.pushAdminPublicContentSnapshot(locale, {
        locale,
        sections: exportPayload.sections,
        content: exportPayload.content,
        version: exportPayload.version,
        updated_at: exportPayload.updated_at,
      });
      setSubmitSuccess("Payload-ul a fost trimis către backend.");
    } catch (error) {
      console.error("Failed to push public content snapshot", error);
      setLocalError(
        "Nu am putut trimite payload-ul către backend. Încearcă din nou sau verifică jurnalul serverului.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [exportPayload.content, exportPayload.sections, exportPayload.updated_at, exportPayload.version, locale]);

  if (!user?.super_user) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Acces restricționat</h1>
          </div>
          <p className="mt-2 text-sm text-red-700">
            Doar super administratorii pot exporta conținutul public. Contactează un super admin pentru drepturi suplimentare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-berkeley">Export conținut public</h1>
          <p className="max-w-3xl text-sm text-gray-600">
            Acest instrument generează structura completă a textelor publice consumate de frontend. Copiază sau descarcă payload-ul
            JSON și importă-l în backend ca versiune inițială pentru locale-ul selectat. Actualul context este construit din
            fallback-uri locale combinate cu eventualele răspunsuri API primite.
          </p>
        </header>

        <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Limbă curentă</p>
            <p className="mt-1 font-medium text-berkeley">{locale}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Versiune backend</p>
            <p className="mt-1 font-medium text-berkeley">{version ?? "–"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Ultima actualizare</p>
            <p className="mt-1 font-medium text-berkeley">{updatedAt ?? "–"}</p>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-berkeley">Secțiuni incluse</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-700"
              >
                <span className="font-medium">{entry.key}</span>
                <span className="text-xs text-gray-500">{entry.entries} câmpuri</span>
              </li>
            ))}
          </ul>
        </section>

        {(contentError || localError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {localError ?? contentError}
          </div>
        )}

        {submitSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {submitSuccess}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleCopy} disabled={isCopying || isLoading} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            {copied ? "Copiat" : "Copiază JSON"}
          </Button>
          <Button
            onClick={handleDownload}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Descarcă fișier
          </Button>
          <Button
            onClick={handlePushToBackend}
            className="flex items-center gap-2"
            disabled={isLoading || isSubmitting}
          >
            <UploadCloud className={`h-4 w-4 ${isSubmitting ? "animate-pulse" : ""}`} />
            Trimite către backend
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isLoading || isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Reîmprospătează conținutul
          </Button>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-berkeley">Payload JSON</h2>
            <span className="text-xs text-gray-500">{payloadJson.length} caractere</span>
          </div>
          <Textarea value={payloadJson} rows={24} readOnly className="font-mono text-xs" />
        </section>
      </div>
    </div>
  );
};

export default ExportPublicContentPage;

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  FileText,
  Languages,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";
import {
  extractStringLeafEntries,
  mergeContent,
  setByPath,
  isPlainObject,
} from "@/lib/publicContent/utils";
import type {
  AdminPublicContentRecord,
  AdminPublicContentVersion,
  PublicContentDictionary,
  PublicContentStatus,
  PublicLocale,
  TranslatePublicContentMode,
  TranslatePublicContentResponse,
} from "@/types/public-content";

const SUPPORTED_LOCALES: PublicLocale[] = ["ro", "en"];

const isStatus = (value: unknown): value is PublicContentStatus =>
  value === "draft" || value === "published" || value === "archived";

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "–";
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })} ${date.toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch (_error) {
    return value;
  }
};

const stringifyContent = (content: PublicContentDictionary): string => {
  try {
    return JSON.stringify(content, null, 2);
  } catch (_error) {
    return "{}";
  }
};

const getVersionContent = (
  version: AdminPublicContentVersion | null | undefined,
): PublicContentDictionary => {
  if (!version) {
    return {};
  }

  const { content } = version;
  if (isPlainObject(content)) {
    return content as PublicContentDictionary;
  }

  return {};
};

const pickEditableVersion = (
  record: AdminPublicContentRecord | null | undefined,
): AdminPublicContentVersion | null => {
  if (!record) {
    return null;
  }

  if (record.draft) {
    return record.draft;
  }

  if (record.published) {
    return record.published;
  }

  if (Array.isArray(record.history)) {
    const firstNonNull = record.history.find((entry) => Boolean(entry));
    if (firstNonNull) {
      return firstNonNull;
    }
  }

  return null;
};

const extractContent = (
  record: AdminPublicContentRecord | null | undefined,
): PublicContentDictionary => {
  const primary = pickEditableVersion(record);
  const primaryContent = getVersionContent(primary);

  if (Object.keys(primaryContent).length > 0) {
    return primaryContent;
  }

  if (record?.published && record.published !== primary) {
    const publishedContent = getVersionContent(record.published);
    if (Object.keys(publishedContent).length > 0) {
      return publishedContent;
    }
  }

  if (Array.isArray(record?.history)) {
    for (const entry of record.history) {
      if (!entry || entry === primary) {
        continue;
      }
      const content = getVersionContent(entry);
      if (Object.keys(content).length > 0) {
        return content;
      }
    }
  }

  return primaryContent;
};

const parseSectionsInput = (value: string): string[] => {
  return value
    .split(/[,\n]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const isNumericSegment = (segment: string): boolean => /^\d+$/.test(segment);

const humanizeSegment = (segment: string): string => {
  if (!segment) {
    return segment;
  }

  const trimmed = segment.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
  if (!trimmed) {
    return segment;
  }

  if (trimmed.length <= 3 && trimmed === trimmed.toLowerCase()) {
    return trimmed.toUpperCase();
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const formatLabelFromSegments = (segments: readonly string[]): string => {
  if (segments.length === 0) {
    return "";
  }

  return segments
    .map((segment) => (isNumericSegment(segment) ? `#${Number(segment) + 1}` : humanizeSegment(segment)))
    .join(" › ");
};

type ContentField = {
  path: string;
  section: string;
  label: string;
  value: string;
};

const PublicContentManagerPage = () => {
  const { user } = useAuth();

  const [selectedLocale, setSelectedLocale] = useState<PublicLocale>("ro");
  const [content, setContent] = useState<PublicContentDictionary>({});
  const [status, setStatus] = useState<PublicContentStatus>("draft");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [versionValue, setVersionValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [translationSource, setTranslationSource] = useState<PublicLocale>("ro");
  const [translationTarget, setTranslationTarget] = useState<PublicLocale>("en");
  const [translationSections, setTranslationSections] = useState<string>("");
  const [translationMode, setTranslationMode] = useState<TranslatePublicContentMode>("missing");
  const [translationResult, setTranslationResult] = useState<string>("");
  const [translationSummary, setTranslationSummary] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<TranslatePublicContentResponse | null>(null);

  const handleFieldChange = useCallback((path: string, value: string) => {
    setContent((previous) => setByPath(previous, path, value));
  }, []);

  const applyResponse = useCallback((record: AdminPublicContentRecord | null | undefined) => {
    if (!record) {
      return;
    }

    const primary = pickEditableVersion(record);
    const primaryStatus = primary?.status;
    if (isStatus(primaryStatus)) {
      setStatus(primaryStatus);
    } else if (record.draft) {
      setStatus("draft");
    } else if (record.published) {
      setStatus("published");
    } else {
      setStatus("draft");
    }

    const resolvedPublishedAt = (() => {
      const published = record.published;
      if (published) {
        if (typeof published.published_at === "string") {
          return published.published_at;
        }
        if (typeof published.updated_at === "string") {
          return published.updated_at;
        }
        if (typeof published.created_at === "string") {
          return published.created_at;
        }
      }
      return null;
    })();

    const resolvedUpdatedAt = (() => {
      if (primary) {
        if (typeof primary.updated_at === "string") {
          return primary.updated_at;
        }
        if (typeof primary.created_at === "string") {
          return primary.created_at;
        }
      }
      return null;
    })();

    setUpdatedAt(resolvedUpdatedAt ?? resolvedPublishedAt ?? null);
    setPublishedAt(resolvedPublishedAt);
    setVersionValue(
      typeof primary?.version === "string" && primary.version.trim().length > 0
        ? primary.version
        : "",
    );
    setContent(extractContent(record));
  }, []);

  const fetchLocaleContent = useCallback(
    async (locale: PublicLocale) => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      setTranslationError(null);
      setTranslationSummary(null);
      try {
        const response = await apiClient.getAdminPublicContent(locale);
        applyResponse(response);
      } catch (fetchError) {
        console.error("Failed to load admin public content", fetchError);
        setError("Nu am putut încărca conținutul pentru limba selectată.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyResponse],
  );

  useEffect(() => {
    void fetchLocaleContent("ro");
  }, [fetchLocaleContent]);

  const handleLocaleChange = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }
      const normalized = (SUPPORTED_LOCALES.find((locale) => locale === value) ?? "ro") as PublicLocale;
      setSelectedLocale(normalized);
      setSearchTerm("");
      void fetchLocaleContent(normalized);
    },
    [fetchLocaleContent],
  );

  const handleSaveDraft = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);
    setTranslationError(null);
    setTranslationSummary(null);
    if (!content || typeof content !== "object") {
      setError("Conținutul nu este valid pentru salvare.");
      return false;
    }

    setIsSaving(true);
    try {
      const response = await apiClient.updateAdminPublicContent(selectedLocale, {
        locale: selectedLocale,
        content,
        status: "draft",
        version: versionValue.trim().length > 0 ? versionValue.trim() : null,
        publish: false,
      });
      applyResponse(response);
      setSuccessMessage("Draft-ul a fost salvat.");
      return true;
    } catch (saveError) {
      console.error("Failed to save public content draft", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nu am putut salva draft-ul. Încearcă din nou și verifică jurnalul backend.",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [applyResponse, content, selectedLocale, versionValue]);

  const handlePublish = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    setTranslationError(null);
    setTranslationSummary(null);
    setIsPublishing(true);
    try {
      const response = await apiClient.publishAdminPublicContent(
        selectedLocale,
        versionValue.trim().length > 0 ? versionValue.trim() : undefined,
      );
      applyResponse(response);
      setSuccessMessage("Conținutul a fost publicat.");
    } catch (publishError) {
      console.error("Failed to publish public content", publishError);
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Nu am putut publica versiunea. Verifică dacă versiunea este actuală și consultă log-urile backend.",
      );
    } finally {
      setIsPublishing(false);
    }
  }, [applyResponse, selectedLocale, versionValue]);

  const handleRetractToDraft = useCallback(async () => {
    const saved = await handleSaveDraft();
    if (saved) {
      setStatus("draft");
    }
  }, [handleSaveDraft]);

  const canApplyTranslation = useMemo(
    () => Boolean(translationResult) && translationTarget === selectedLocale,
    [selectedLocale, translationResult, translationTarget],
  );

  const handleTranslate = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    setTranslationError(null);
    setTranslationSummary(null);
    setTranslationResult("");
    setLastTranslation(null);
    setIsTranslating(true);
    try {
      const sections = parseSectionsInput(translationSections);
      const response = await apiClient.translateAdminPublicContent({
        source_locale: translationSource,
        target_locale: translationTarget,
        sections: sections.length > 0 ? sections : undefined,
        mode: translationMode,
      });
      setLastTranslation(response);
      setTranslationResult(stringifyContent(response.content));
      const translatedCount = typeof response.translated === "number" ? response.translated : 0;
      const totalSections = Array.isArray(response.sections) ? response.sections.length : sections.length;
      setTranslationSummary(
        `Traducere generată: ${translatedCount} chei actualizate din ${totalSections} secțiuni solicitate.`,
      );
    } catch (translateError) {
      console.error("Failed to translate public content", translateError);
      setTranslationError(
        translateError instanceof Error
          ? translateError.message
          : "Nu am putut genera traducerea. Verifică log-urile backend pentru detalii.",
      );
    } finally {
      setIsTranslating(false);
    }
  }, [translationMode, translationSections, translationSource, translationTarget]);

  const handleApplyTranslation = useCallback(() => {
    if (!canApplyTranslation || !lastTranslation) {
      return;
    }
    setContent((previous) => mergeContent(previous, lastTranslation.content));
    setSuccessMessage("Traducerea a fost aplicată câmpurilor. Salvează draft-ul pentru a o păstra.");
  }, [canApplyTranslation, lastTranslation]);

  const handleSwapLocales = useCallback(() => {
    setTranslationSource(translationTarget);
    setTranslationTarget(translationSource);
  }, [translationSource, translationTarget]);

  const contentFields = useMemo<ContentField[]>(() => {
    const entries = extractStringLeafEntries(content);

    return entries.map((entry) => {
      const [section, ...rest] = entry.segments;
      const sectionKey = section ?? "general";
      const labelSegments = rest.length > 0 ? rest : [sectionKey];
      return {
        path: entry.path,
        section: sectionKey,
        label: formatLabelFromSegments(labelSegments),
        value: entry.value,
      } satisfies ContentField;
    });
  }, [content]);

  const filteredFields = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return contentFields;
    }

    return contentFields.filter((field) => {
      const label = field.label.toLowerCase();
      const path = field.path.toLowerCase();
      const value = field.value.toLowerCase();
      return (
        label.includes(normalizedSearch) ||
        path.includes(normalizedSearch) ||
        value.includes(normalizedSearch)
      );
    });
  }, [contentFields, searchTerm]);

  const groupedFields = useMemo(() => {
    const grouped = filteredFields.reduce<Record<string, ContentField[]>>((acc, field) => {
      if (!acc[field.section]) {
        acc[field.section] = [];
      }
      acc[field.section].push(field);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([section, fields]) => ({
        section,
        fields: [...fields].sort((a, b) => a.path.localeCompare(b.path)),
      }))
      .sort((a, b) => a.section.localeCompare(b.section));
  }, [filteredFields]);

  const totalFields = contentFields.length;
  const filteredCount = filteredFields.length;
  const isEditingDisabled = isLoading || isSaving || isPublishing;

  if (!user?.super_user) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Acces restricționat</h1>
          </div>
          <p className="mt-2 text-sm text-red-700">
            Doar super administratorii pot gestiona conținutul public. Contactează un super admin pentru drepturi suplimentare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <Languages className="h-8 w-8 text-berkeley" />
            <h1 className="text-3xl font-semibold text-berkeley">Gestionare conținut public</h1>
          </div>
          <p className="max-w-3xl text-sm text-gray-600">
            Editează textele statice afișate utilizatorilor, grupate pe secțiuni, salvează draft-uri, publică versiunile finale și
            generează traduceri automate între română și engleză. Toate acțiunile sunt trimise către backend prin API-ul documentat.
          </p>
        </header>

        <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="locale-select">Limbă</Label>
            <Select
              id="locale-select"
              value={selectedLocale}
              onValueChange={handleLocaleChange}
              disabled={isLoading}
            >
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-value">Stare curentă</Label>
            <Input
              id="status-value"
              value={status}
              readOnly
              className="bg-gray-100 font-medium uppercase text-gray-700"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-value">Versiune</Label>
            <Input
              id="version-value"
              value={versionValue}
              onChange={(event) => setVersionValue(event.target.value)}
              placeholder="ex: 2025-02-10T09:45:12Z"
            />
          </div>
          <div className="space-y-2">
            <Label>Ultima actualizare / publicare</Label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <p>
                <span className="font-semibold text-gray-700">Actualizare:</span> {formatDateTime(updatedAt)}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-gray-700">Publicare:</span> {formatDateTime(publishedAt)}
              </p>
            </div>
          </div>
        </section>

        {(error || translationError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error ?? translationError}
          </div>
        )}

        {(successMessage || translationSummary) && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage ?? translationSummary}
          </div>
        )}

        <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-berkeley">
              <FileText className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Texte disponibile</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{filteredCount} texte</span>
              {filteredCount !== totalFields && (
                <span className="text-gray-400">din {totalFields}</span>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="search-public-content">Caută text</Label>
              <div className="relative">
                <Input
                  id="search-public-content"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Caută după cheie sau fragment din text"
                  disabled={isLoading}
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">
                Filtrează după numele cheii sau după orice fragment de text pentru a găsi rapid elementul dorit.
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <Label>Instrucțiuni</Label>
              <p>
                Actualizează textele afișate mai jos și folosește acțiunile de salvare și publicare pentru a trimite modificările
                către backend.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {groupedFields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {isLoading
                  ? "Încărcăm conținutul pentru limba selectată..."
                  : "Nu am găsit texte care să corespundă filtrului curent."}
              </div>
            ) : (
              groupedFields.map(({ section, fields }) => {
                const sectionLabel = formatLabelFromSegments([section]);
                return (
                  <details
                    key={section}
                    open
                    className="group rounded-lg border border-gray-100 bg-gray-50 p-4 transition-shadow hover:shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-berkeley">{sectionLabel}</p>
                        <p className="text-xs text-gray-500">{fields.length} texte</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="group-open:hidden">Extinde</span>
                        <span className="hidden group-open:inline">Restrânge</span>
                      </div>
                    </summary>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {fields.map((field) => {
                        const fieldId = `public-content-${field.path.replace(/[^a-zA-Z0-9]+/g, "-")}`.toLowerCase();
                        const isMultiline = field.value.includes("\n") || field.value.length > 80;
                        const lineCount = field.value.split("\n").length;
                        const lengthBonus = Math.floor(field.value.length / 120);
                        const rows = Math.min(10, Math.max(3, lineCount + lengthBonus));
                        return (
                          <div key={field.path} className="space-y-2">
                            <Label htmlFor={fieldId}>{field.label}</Label>
                            {isMultiline ? (
                              <Textarea
                                id={fieldId}
                                value={field.value}
                                onChange={(event) => handleFieldChange(field.path, event.target.value)}
                                rows={rows}
                                disabled={isEditingDisabled}
                              />
                            ) : (
                              <Input
                                id={fieldId}
                                value={field.value}
                                onChange={(event) => handleFieldChange(field.path, event.target.value)}
                                disabled={isEditingDisabled}
                              />
                            )}
                            <p className="text-[11px] text-gray-500">Cheie: {field.path}</p>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                void handleSaveDraft();
              }}
              disabled={isSaving || isLoading || isPublishing}
              className="flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Salvează draft
            </Button>
            <Button
              onClick={() => {
                void handlePublish();
              }}
              disabled={isPublishing || isLoading || isSaving}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Publică versiunea
            </Button>
            <Button
              onClick={() => {
                void handleRetractToDraft();
              }}
              variant="outline"
              className="flex items-center gap-2"
              disabled={status === "draft" || isSaving || isLoading || isPublishing}
            >
              <RefreshCw className="h-4 w-4" />
              Retrage în draft
            </Button>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-900">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Traduceri rapide</h2>
            </div>
            <p className="text-xs text-blue-900">
              Trimite conținutul către backend pentru a genera traduceri automate între română și engleză.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="translation-source">Sursă</Label>
              <Select
                id="translation-source"
                value={translationSource}
                onValueChange={(value) =>
                  setTranslationSource((SUPPORTED_LOCALES.find((locale) => locale === value) ?? "ro") as PublicLocale)
                }
                disabled={isTranslating}
              >
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              <Button
                onClick={handleSwapLocales}
                type="button"
                variant="outline"
                className="mt-6 flex items-center gap-2"
                disabled={isTranslating}
              >
                <ArrowLeftRight className="h-4 w-4" /> Inversează
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="translation-target">Destinație</Label>
              <Select
                id="translation-target"
                value={translationTarget}
                onValueChange={(value) =>
                  setTranslationTarget((SUPPORTED_LOCALES.find((locale) => locale === value) ?? "en") as PublicLocale)
                }
                disabled={isTranslating}
              >
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="translation-mode">Mod</Label>
              <Select
                id="translation-mode"
                value={translationMode}
                onValueChange={(value) =>
                  setTranslationMode((value === "full" ? "full" : "missing") as TranslatePublicContentMode)
                }
                disabled={isTranslating}
              >
                <option value="missing">Completează lipsurile</option>
                <option value="full">Suprascrie tot</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="translation-sections">Secțiuni (opțional)</Label>
            <Textarea
              id="translation-sections"
              value={translationSections}
              onChange={(event) => setTranslationSections(event.target.value)}
              rows={3}
              placeholder="header, hero, checkout.summary"
              disabled={isTranslating}
            />
            <p className="text-xs text-blue-900">
              Listează cheile separate prin virgulă sau newline pentru a traduce doar anumite secțiuni. Dacă lași câmpul gol se
              va trimite întregul conținut.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                void handleTranslate();
              }}
              disabled={isTranslating}
              className="flex items-center gap-2"
            >
              {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generează traducere
            </Button>
            <Button
              onClick={handleApplyTranslation}
              variant="secondary"
              disabled={!canApplyTranslation || isTranslating}
              className="flex items-center gap-2"
            >
              <UploadCloud className="h-4 w-4" /> Aplică în câmpuri
            </Button>
            {translationResult && translationTarget !== selectedLocale && (
              <p className="text-xs text-blue-900">
                Selectează mai întâi limba {translationTarget.toUpperCase()} în editor pentru a aplica traducerea.
              </p>
            )}
          </div>

          {translationResult && (
            <Textarea value={translationResult} readOnly rows={12} className="font-mono text-xs" />
          )}
        </section>
      </div>
    </div>
  );
};

export default PublicContentManagerPage;

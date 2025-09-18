"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Editor, EditorConfiguration } from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/idea.css";
import "codemirror/addon/fold/foldgutter.css";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import apiClient from "@/lib/api";
import type {
  MailBrandingColors,
  MailBrandingSettings,
  MailMenuLink,
  MailSiteDetails,
  MailTemplateAttachment,
  MailTemplateDetail,
  MailTemplateUpdatePayload,
  MailTemplateSummary,
} from "@/types/mail";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

type LinkField = "menu_items" | "footer_links" | "social_links";

type MailSiteFormState = {
  title: string;
  url: string;
  logo_path: string;
  logo_max_height: string;
  description: string;
  email: string;
  phone: string;
  phone_link: string;
  support_phone: string;
  support_phone_link: string;
  address: string;
  availability: string;
  menu_items: MailMenuLink[];
  footer_links: MailMenuLink[];
  social_links: MailMenuLink[];
};

type MailBrandingFormState = {
  site: MailSiteFormState;
  colors: MailBrandingColors;
};

type ExtendedEditorConfiguration = EditorConfiguration & {
  placeholder?: string;
  autoCloseTags?: boolean;
  autoCloseBrackets?: boolean;
  matchTags?: boolean | { bothTags?: boolean };
  foldGutter?: boolean;
};

type CodeMirrorModule = typeof import("codemirror");

const createEmptyLink = (): MailMenuLink => ({ label: "", url: "" });

const normalizeLinkArray = (links?: MailMenuLink[] | null): MailMenuLink[] => {
  if (!Array.isArray(links)) return [];
  return links.map((item) => ({
    label: item?.label ?? "",
    url: item?.url ?? "",
  }));
};

const toSiteFormState = (site?: MailSiteDetails | null): MailSiteFormState => ({
  title: site?.title ?? "",
  url: site?.url ?? "",
  logo_path: site?.logo_path ?? "",
  logo_max_height:
    typeof site?.logo_max_height === "number" && Number.isFinite(site.logo_max_height)
      ? String(site.logo_max_height)
      : site?.logo_max_height != null
      ? String(site.logo_max_height)
      : "",
  description: site?.description ?? "",
  email: site?.email ?? "",
  phone: site?.phone ?? "",
  phone_link: site?.phone_link ?? "",
  support_phone: site?.support_phone ?? "",
  support_phone_link: site?.support_phone_link ?? "",
  address: site?.address ?? "",
  availability: site?.availability ?? "",
  menu_items: normalizeLinkArray(site?.menu_items),
  footer_links: normalizeLinkArray(site?.footer_links),
  social_links: normalizeLinkArray(site?.social_links),
});

const toColorsState = (colors?: MailBrandingColors | null): MailBrandingColors => ({
  berkeley: colors?.berkeley ?? "#1A3661",
  jade: colors?.jade ?? "#206442",
  jadeLight: colors?.jadeLight ?? "#38B275",
  eefie: colors?.eefie ?? "#191919",
});

const mapFormSiteToDetails = (form: MailSiteFormState): MailSiteDetails => {
  const trimmed = form.logo_max_height.trim();
  let logoMaxHeight: number | null | undefined;
  if (trimmed.length === 0) {
    logoMaxHeight = null;
  } else {
    const parsed = Number(trimmed);
    logoMaxHeight = Number.isFinite(parsed) ? parsed : null;
  }

  return {
    title: form.title,
    url: form.url,
    logo_path: form.logo_path,
    logo_max_height: logoMaxHeight,
    description: form.description || "",
    email: form.email || "",
    phone: form.phone || "",
    phone_link: form.phone_link || "",
    support_phone: form.support_phone || "",
    support_phone_link: form.support_phone_link || "",
    address: form.address || "",
    availability: form.availability || "",
    menu_items: form.menu_items.map((item) => ({ label: item.label, url: item.url })),
    footer_links: form.footer_links.map((item) => ({ label: item.label, url: item.url })),
    social_links: form.social_links.map((item) => ({ label: item.label, url: item.url })),
  };
};

const createDefaultPreviewContext = (
  site?: MailSiteDetails | null,
  colors?: MailBrandingColors | null,
): Record<string, unknown> => {
  const baseContext: Record<string, unknown> = {
    site: site ?? null,
    colors: colors ?? null,
    customer_name: "Ion Popescu",
    customer_email: "ion.popescu@example.com",
    booking_number: "DAC-12345",
    booking_reference: "DAC-12345",
    booking_created_at: "2024-06-15 10:30",
    pickup_date: "2024-07-01",
    pickup_time: "08:30",
    pickup_location: site?.address ?? "Aeroportul Henri Coandă, Otopeni",
    dropoff_date: "2024-07-07",
    dropoff_time: "09:00",
    dropoff_location: site?.address ?? "Aeroportul Henri Coandă, Otopeni",
    car: {
      name: "Dacia Logan",
      category: "Economy",
      year: 2024,
      transmission: "Manuală",
      fuel: "Benzină",
      plate_number: "B-99-DAC",
      image_url: "https://via.placeholder.com/640x320.png?text=DaCars",
    },
    total_price: "350 €",
    currency: "EUR",
    advance_paid: "50 €",
    balance_due: "300 €",
    extras: [
      enhancePreviewValue({ name: "Scaun copil", price: "15 €" }),
      enhancePreviewValue({ name: "Șofer adițional", price: "25 €" }),
    ],
    notes: "Vă rugăm să ne sunați când ajungeți în aeroport.",
    support: {
      phone: site?.support_phone ?? "+40 722 123 456",
      email: site?.email ?? "contact@dacars.ro",
    },
    hero_icon_char: "🚗",
    hero_badge_label: "Oferta săptămânii",
    hero_badge_color: colors?.jadeLight ?? "#38B275",
    hero_badge_text_color: "#FFFFFF",
    hero_badge_background: "#E8F8F0",
    hero_title: "Rezervarea ta este confirmată",
    hero_subtitle: "Mulțumim că ai ales DaCars pentru următoarea călătorie.",
    hero_description:
      "Predarea și preluarea au loc direct în aeroport. Verifică detaliile de mai jos înainte de plecare.",
    hero_support_message: "Echipa noastră este disponibilă non-stop dacă ai nevoie de ajutor.",
    hero_primary_action: createActionMock(
      "Vezi rezervarea",
      site?.url ? `${site.url.replace(/\/?$/, "")}/rezervari` : "https://dacars.ro/rezervari",
    ),
    hero_secondary_action: createActionMock(
      "Contactează-ne",
      site?.email ? `mailto:${site.email}` : "mailto:contact@dacars.ro",
    ),
    hero_primary_button: createActionMock(
      "Confirmă sosirea",
      site?.url ? `${site.url.replace(/\/?$/, "")}/check-in` : "https://dacars.ro/check-in",
    ),
    hero_secondary_button: createActionMock(
      "Modifică rezervarea",
      site?.url ? `${site.url.replace(/\/?$/, "")}/modifica` : "https://dacars.ro/modifica",
    ),
    hero_features: enhancePreviewValue([
      createListEntryMock("Predare rapidă", {
        description: "Preluare în mai puțin de 5 minute direct din aeroport.",
        icon: "⚡️",
      }),
      createListEntryMock("Asistență 24/7", {
        description: "Suntem disponibili telefonic și pe WhatsApp în orice moment.",
        icon: "📞",
      }),
      createListEntryMock("Fără garanție ascunsă", {
        description: "Plătești exact cât ai confirmat în rezervare, fără surprize.",
        icon: "✅",
      }),
    ]),
    hero_steps: enhancePreviewValue([
      createListEntryMock("Completezi formularul", {
        description: "Îți introduci datele și alegi mașina potrivită.",
        char: "1",
      }),
      createListEntryMock("Confirmi rezervarea", {
        description: "Primești imediat toate detaliile prin email.",
        char: "2",
      }),
      createListEntryMock("Ne vedem la aeroport", {
        description: "Predăm mașina și ești gata de drum.",
        char: "3",
      }),
    ]),
    hero_stats: enhancePreviewValue([
      createListEntryMock("12.500+", {
        title: "Clienți mulțumiți",
        description: "Au ales DaCars pentru vacanțe fără griji.",
        icon: "🎉",
      }),
      createListEntryMock("98%", {
        title: "Recomandă DaCars",
        description: "Feedback excelent pentru echipa noastră.",
        icon: "👍",
      }),
    ]),
  };

  return enhancePreviewValue(baseContext) as Record<string, unknown>;
};

type TwigVariableInfo = {
  path: string;
  expectsArray: boolean;
};

const TWIG_RESERVED_TOKENS = new Set([
  "and",
  "as",
  "attribute",
  "autoescape",
  "block",
  "by",
  "constant",
  "cycle",
  "date",
  "defined",
  "divisibleby",
  "do",
  "else",
  "elseif",
  "embed",
  "endautoescape",
  "endblock",
  "endembed",
  "endfilter",
  "endfor",
  "endif",
  "extends",
  "false",
  "filter",
  "for",
  "from",
  "if",
  "import",
  "in",
  "include",
  "is",
  "iterable",
  "loop",
  "macro",
  "not",
  "null",
  "only",
  "or",
  "parent",
  "random",
  "range",
  "same",
  "starts",
  "ends",
  "matches",
  "set",
  "true",
  "with",
  "without",
  "trans",
  "endtrans",
  "spaceless",
  "endspaceless",
  "upper",
  "lower",
  "title",
  "capitalize",
  "escape",
  "e",
  "raw",
  "default",
  "length",
  "keys",
  "values",
  "first",
  "last",
  "sort",
  "reverse",
  "merge",
  "map",
  "filter",
  "reduce",
  "json_encode",
  "join",
  "abs",
  "round",
  "number_format",
]);

const EXACT_MOCK_VALUES: Record<string, unknown> = {
  customer_name: "Ion Popescu",
  customer_email: "ion.popescu@example.com",
  booking_number: "DAC-12345",
  booking_reference: "DAC-12345",
  pickup_date: "2024-07-01",
  dropoff_date: "2024-07-07",
  pickup_time: "08:30",
  dropoff_time: "09:00",
  pickup_location: "Aeroportul Henri Coandă, Otopeni",
  dropoff_location: "Aeroportul Henri Coandă, Otopeni",
  total_price: "350 €",
  advance_paid: "50 €",
  balance_due: "300 €",
  currency: "EUR",
  notes: "Vă rugăm să ne sunați când ajungeți în aeroport.",
  support: {
    phone: "+40 722 123 456",
    email: "contact@dacars.ro",
  },
};

const STRINGIFIER_KEYS = [
  "title",
  "label",
  "name",
  "heading",
  "subtitle",
  "text",
  "description",
  "value",
  "badge",
  "char",
  "summary",
  "display",
];

const enhancePreviewValue = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index += 1) {
      input[index] = enhancePreviewValue(input[index]);
    }
    return input;
  }

  if (isPlainObject(input)) {
    const target = input as Record<string | symbol, unknown>;
    Reflect.ownKeys(target).forEach((key) => {
      const current = Reflect.get(target, key);
      Reflect.set(target, key, enhancePreviewValue(current));
    });

    const shouldStringify = STRINGIFIER_KEYS.some((key) => {
      const candidate = Reflect.get(target, key);
      return typeof candidate === "string" && candidate.trim().length > 0;
    });

    if (shouldStringify) {
      Object.defineProperty(target, "toString", {
        value(this: Record<string, unknown>) {
          for (const key of STRINGIFIER_KEYS) {
            const candidate = this[key];
            if (typeof candidate === "string" && candidate.trim().length > 0) {
              return candidate;
            }
          }
          const fallback = this.valueOf();
          return typeof fallback === "string" ? fallback : "[object Object]";
        },
        configurable: true,
        enumerable: false,
      });

      Object.defineProperty(target, Symbol.toPrimitive, {
        value(this: Record<string, unknown>) {
          const toStringFn = (this as unknown as { toString(): string }).toString;
          return typeof toStringFn === "function" ? toStringFn.call(this) : "[object Object]";
        },
        configurable: true,
        enumerable: false,
      });
    }

    return target;
  }

  return input;
};

const createActionMock = (label: string, url: string): Record<string, unknown> => {
  const action: Record<string, unknown> = {
    label,
    title: label,
    text: label,
    description: `Află mai multe despre ${label.toLowerCase()}.`,
    value: label,
    url,
    href: url,
    button_label: label,
    button_text: label,
  };

  return enhancePreviewValue(action) as Record<string, unknown>;
};

const createListEntryMock = (
  label: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  const entry: Record<string, unknown> = {
    label,
    title: overrides.title ?? label,
    heading: overrides.heading ?? overrides.title ?? label,
    subtitle: overrides.subtitle ?? `Subtitlu ${label.toLowerCase()}`,
    description:
      overrides.description ?? overrides.text ?? "Text exemplu pentru previzualizare.",
    text: overrides.text ?? overrides.description ?? "Text exemplu pentru previzualizare.",
    value: overrides.value ?? label,
    summary: overrides.summary ?? overrides.value ?? label,
    amount: overrides.amount ?? "100 €",
    icon: overrides.icon ?? "✅",
    char: overrides.char ?? (label.charAt(0) || "A"),
    url: overrides.url ?? "https://dacars.ro",
    href: overrides.href ?? overrides.url ?? "https://dacars.ro",
    badge: overrides.badge ?? "Nou",
    color: overrides.color ?? "#206442",
    ...overrides,
  };

  return enhancePreviewValue(entry) as Record<string, unknown>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const cloneContext = (value: unknown): Record<string, unknown> => {
  if (!isPlainObject(value)) {
    return {};
  }

  const cloneValue = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => cloneValue(item));
    }

    if (isPlainObject(input)) {
      const result: Record<string, unknown> = {};
      Object.entries(input).forEach(([key, entry]) => {
        result[key] = cloneValue(entry);
      });

      Object.getOwnPropertySymbols(input).forEach((symbol) => {
        const descriptor = Object.getOwnPropertyDescriptor(input, symbol);
        if (descriptor) {
          Object.defineProperty(result, symbol, {
            value: cloneValue(descriptor.value),
            enumerable: descriptor.enumerable ?? false,
            configurable: true,
            writable: true,
          });
        }
      });

      return result;
    }

    return input;
  };

  const cloned = cloneValue(value) as Record<string, unknown>;
  return enhancePreviewValue(cloned) as Record<string, unknown>;
};

const getAttachmentDisplayName = (attachment: MailTemplateAttachment): string => {
  const fileName = attachment["file_name"];
  const candidates = [
    attachment.name,
    attachment.filename,
    attachment.original_name,
    attachment.title,
    typeof fileName === "string" ? fileName : null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  if (typeof attachment.url === "string" && attachment.url.trim().length > 0) {
    const parts = attachment.url.split("/");
    const last = parts[parts.length - 1];
    if (last && last.trim().length > 0) {
      return last.trim();
    }
  }

  return attachment.uuid;
};

const formatAttachmentSize = (
  value: MailTemplateAttachment["size"],
): string | null => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number.parseFloat(value)
      : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  if (numericValue === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = numericValue;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 || unitIndex === 0 ? Math.round(size) : Number(size.toFixed(1));
  return `${formatted} ${units[unitIndex]}`;
};

const normalizeTwigPath = (input: string): string => {
  if (!input) return "";
  const bracketNormalized = input
    .replace(/\[\s*(["']?)([^"'\]]+)\1\s*\]/g, ".$2")
    .replace(/::/g, ".");
  const trimmed = bracketNormalized.replace(/^\.+|\.+$/g, "");
  if (!trimmed) return "";
  const segments = trimmed.split(".").filter(Boolean);
  if (segments.length === 0) return "";
  if (TWIG_RESERVED_TOKENS.has(segments[0])) return "";
  return segments.join(".");
};

const ensureVariableInfo = (
  info: Map<string, { expectsArray: boolean }>,
  path: string,
  expectsArray: boolean,
) => {
  if (!path) return;
  const existing = info.get(path);
  if (existing) {
    if (expectsArray && !existing.expectsArray) {
      info.set(path, { expectsArray: true });
    }
    return;
  }
  info.set(path, { expectsArray });
};

const collectTwigSources = (
  content: string,
  templateCache: Record<string, string>,
): string[] => {
  const sources: string[] = [];
  const visited = new Set<string>();

  const walk = (source: string) => {
    sources.push(source);
    const includePattern = /{%-?\s*(extends|include|embed)\s+(["'])([^"']+)\2[^%]*%}/gi;
    let match: RegExpExecArray | null;
    while ((match = includePattern.exec(source)) !== null) {
      const path = match[3];
      if (!path || visited.has(path)) continue;
      visited.add(path);
      const referenced = templateCache[path];
      if (typeof referenced === "string") {
        walk(referenced);
      }
    }
  };

  walk(content);
  return sources;
};

const extractTwigVariables = (
  content: string,
  templateCache: Record<string, string>,
): TwigVariableInfo[] => {
  if (!content) return [];

  const sources = collectTwigSources(content, templateCache);
  const expressionPattern = /({[{%]-?)([\s\S]*?)(-?[}%]})/g;
  const attributePattern = /attribute\(\s*([A-Za-z_][\w\.]*)\s*,\s*['"]([^'"\s]+)['"]\s*\)/g;
  const loopPattern = /\bfor\s+([A-Za-z_][\w\.]*)\s*(?:,\s*([A-Za-z_][\w\.]*))?\s+in\s+([A-Za-z_][\w\.[\]'"-]*)/g;
  const infoMap = new Map<string, { expectsArray: boolean }>();
  const arrayLike = new Set<string>();

  sources.forEach((source) => {
    let match: RegExpExecArray | null;
    while ((match = expressionPattern.exec(source)) !== null) {
      const inner = match[2] ?? "";
      const skipTokens = new Set<string>();

      const bracketNormalized = inner.replace(/\[\s*(["']?)([^"'\]]+)\1\s*\]/g, ".$2");

      const setMatch = bracketNormalized.match(/^\s*set\s+([^=]+)=/);
      if (setMatch) {
        const leftSideTokens = setMatch[1]
          .split(/[,\s]+/)
          .map((token) => normalizeTwigPath(token))
          .filter(Boolean);
        leftSideTokens.forEach((token) => skipTokens.add(token));
      }

      let loopMatch: RegExpExecArray | null;
      while ((loopMatch = loopPattern.exec(bracketNormalized)) !== null) {
        const loopVar = normalizeTwigPath(loopMatch[1]);
        if (loopVar) skipTokens.add(loopVar);
        const secondVar = normalizeTwigPath(loopMatch[2] ?? "");
        if (secondVar) skipTokens.add(secondVar);
        const collectionRaw = loopMatch[3] ?? "";
        const collectionPath = normalizeTwigPath(collectionRaw.split("|")[0] ?? "");
        if (collectionPath) {
          arrayLike.add(collectionPath);
          ensureVariableInfo(infoMap, collectionPath, true);
        }
      }

      let attributeMatch: RegExpExecArray | null;
      while ((attributeMatch = attributePattern.exec(bracketNormalized)) !== null) {
        const base = normalizeTwigPath(attributeMatch[1]);
        const attributeKey = normalizeTwigPath(attributeMatch[2]);
        if (!base || !attributeKey) continue;
        const combined = normalizeTwigPath(`${base}.${attributeKey}`);
        if (combined) {
          ensureVariableInfo(infoMap, combined, arrayLike.has(combined));
        }
      }

      const cleaned = bracketNormalized
        .replace(/(['"])(?:\\.|(?!\1).)*\1/g, " ")
        .replace(/#[^\n\r]*/g, " ")
        .replace(/[(){}\[\],]/g, " ")
        .replace(/\b\d+\b/g, " ");

      const tokens = cleaned.match(/[A-Za-z_][A-Za-z0-9_\.]+/g) ?? [];
      tokens.forEach((token) => {
        const normalized = normalizeTwigPath(token);
        if (!normalized) return;
        if (skipTokens.has(normalized)) return;
        const root = normalized.split(".")[0];
        if (TWIG_RESERVED_TOKENS.has(normalized) || TWIG_RESERVED_TOKENS.has(root)) {
          return;
        }
        const expectsArray = arrayLike.has(normalized);
        ensureVariableInfo(infoMap, normalized, expectsArray);
      });
    }
  });

  return Array.from(infoMap.entries()).map(([path, value]) => ({
    path,
    expectsArray: value.expectsArray || arrayLike.has(path),
  }));
};

const getDeepValue = (source: unknown, path: string): unknown => {
  if (!path) return undefined;
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return undefined;
  let current: unknown = source;
  for (const segment of segments) {
    if (current == null) return undefined;
    const isIndex = /^\d+$/.test(segment);
    if (isIndex) {
      const index = Number(segment);
      if (Array.isArray(current)) {
        current = current[index];
      } else if (isPlainObject(current)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    } else if (isPlainObject(current)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

const setDeepValue = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) return;

  let current: unknown = target;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isIndex = /^\d+$/.test(segment);
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsIndex = nextSegment ? /^\d+$/.test(nextSegment) : false;

    if (isLast) {
      if (isIndex) {
        if (Array.isArray(current)) {
          (current as unknown[])[Number(segment)] = value;
        } else if (isPlainObject(current)) {
          (current as Record<string, unknown>)[segment] = value;
        }
      } else if (isPlainObject(current)) {
        (current as Record<string, unknown>)[segment] = value;
      }
      return;
    }

    if (isIndex) {
      if (Array.isArray(current)) {
        if (current[Number(segment)] == null) {
          current[Number(segment)] = nextIsIndex ? [] : {};
        }
        current = current[Number(segment)];
      } else if (isPlainObject(current)) {
        const container = current as Record<string, unknown>;
        if (container[segment] == null) {
          container[segment] = nextIsIndex ? [] : {};
        }
        current = container[segment];
      } else {
        return;
      }
    } else if (isPlainObject(current)) {
      const container = current as Record<string, unknown>;
      if (
        container[segment] == null ||
        (nextIsIndex && !Array.isArray(container[segment])) ||
        (!nextIsIndex && !isPlainObject(container[segment]))
      ) {
        container[segment] = nextIsIndex ? [] : {};
      }
      current = container[segment];
    } else {
      return;
    }
  }
};

const createArrayMock = (path: string): unknown[] => {
  const key = path.split(".").pop()?.toLowerCase() ?? "";
  if (key.includes("menu") || key.includes("link")) {
    return [
      createListEntryMock("Acasă", { url: "https://dacars.ro" }),
      createListEntryMock("Rezervă acum", { url: "https://dacars.ro/checkout" }),
    ];
  }
  if (key.includes("social")) {
    return [
      createListEntryMock("Facebook", { url: "https://www.facebook.com/DaCars", icon: "📘" }),
      createListEntryMock("Instagram", {
        url: "https://www.instagram.com/DaCars",
        icon: "📸",
      }),
      createListEntryMock("TikTok", { url: "https://www.tiktok.com/@DaCars", icon: "🎵" }),
    ];
  }
  if (key.includes("extra") || key.includes("addon") || key.includes("benefit")) {
    return [
      createListEntryMock("Scaun copil", {
        description: "Pentru cei mici, confort și siguranță în plus.",
        price: "15 €",
        amount: "15 €",
        icon: "👶",
      }),
      createListEntryMock("Șofer adițional", {
        description: "Permite împărțirea călătoriei cu un prieten.",
        price: "25 €",
        amount: "25 €",
        icon: "🧑‍🤝‍🧑",
      }),
    ];
  }
  if (key.includes("action") || key.includes("button") || key.includes("cta")) {
    return [
      createActionMock("Confirmă rezervarea", "https://dacars.ro/confirmare"),
      createActionMock("Solicită modificări", "mailto:contact@dacars.ro"),
    ];
  }
  if (key.includes("step") || key.includes("timeline") || key.includes("progress")) {
    return [
      createListEntryMock("Completezi formularul", {
        description: "Alegi perioada și mașina preferată.",
        char: "1",
      }),
      createListEntryMock("Confirmi detaliile", {
        description: "Primești rezumatul pe email imediat.",
        char: "2",
      }),
      createListEntryMock("Ridici mașina", {
        description: "Ne întâlnim în aeroport la ora stabilită.",
        char: "3",
      }),
    ];
  }
  if (key.includes("stat") || key.includes("metric") || key.includes("counter")) {
    return [
      createListEntryMock("12.500+", {
        title: "Clienți fericiți",
        description: "Șoferi care au avut încredere în DaCars.",
        icon: "🚗",
      }),
      createListEntryMock("98%", {
        title: "Recomandă mai departe",
        description: "Rating mediu primit după rezervări.",
        icon: "⭐️",
      }),
    ];
  }
  if (key.includes("item") || key.includes("line") || key.includes("entry") || key.includes("row")) {
    return [
      createListEntryMock("Element 1", { description: "Detaliu exemplu." }),
      createListEntryMock("Element 2", { description: "Alt detaliu exemplu." }),
    ];
  }

  return [createListEntryMock("Element 1"), createListEntryMock("Element 2")];
};

const generateMockValueForPath = (
  path: string,
  fallback: Record<string, unknown>,
  expectsArray: boolean,
): unknown => {
  const existing = getDeepValue(fallback, path);
  if (existing !== undefined) {
    return existing;
  }

  if (Object.prototype.hasOwnProperty.call(EXACT_MOCK_VALUES, path)) {
    return EXACT_MOCK_VALUES[path];
  }

  if (expectsArray) {
    return createArrayMock(path);
  }

  const key = path.split(".").pop() ?? path;
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes("email")) return "exemplu@dacars.ro";
  if (lowerKey.includes("phone") || lowerKey.includes("tel")) return "+40 712 345 678";
  if (lowerKey.includes("url") || lowerKey.includes("link"))
    return "https://dacars.ro/exemplu";
  if (lowerKey.includes("logo") || lowerKey.includes("image") || lowerKey.includes("photo"))
    return "https://via.placeholder.com/640x320.png?text=DaCars";
  if (lowerKey.includes("icon") && lowerKey.includes("char")) return "🚗";
  if (lowerKey.includes("icon")) return "🚘";
  if (lowerKey.includes("emoji")) return "🚗";
  if (lowerKey.includes("date")) return "2024-07-01";
  if (lowerKey.includes("time") || lowerKey.includes("hour")) return "10:30";
  if (
    lowerKey.includes("price") ||
    lowerKey.includes("amount") ||
    lowerKey.includes("total") ||
    lowerKey.includes("sum") ||
    lowerKey.includes("value") ||
    lowerKey.includes("fee") ||
    lowerKey.includes("cost")
  ) {
    return "100 €";
  }
  if (lowerKey.includes("currency")) return "EUR";
  if (lowerKey.includes("status")) return "confirmat";
  if (lowerKey.includes("address") || lowerKey.includes("location"))
    return "Str. Exemplu nr. 10, București";
  if (lowerKey.includes("badge") && lowerKey.includes("label")) return "Oferta săptămânii";
  if (lowerKey.includes("badge") && lowerKey.includes("text")) return "#FFFFFF";
  if (lowerKey.includes("badge") && lowerKey.includes("color")) return "#38B275";
  if (lowerKey.includes("background")) return "#F5F7FA";
  if (lowerKey.includes("color") || lowerKey.includes("hex")) {
    return lowerKey.includes("text") ? "#1A3661" : "#206442";
  }
  if (lowerKey.includes("label")) return "Etichetă exemplu";
  if (lowerKey.includes("subtitle") || lowerKey.includes("headline"))
    return "Subtitlu de previzualizare";
  if (lowerKey.includes("heading")) return "Titlu secțiune";
  if (lowerKey.includes("name") || lowerKey.includes("title")) return "Exemplu";
  if (
    lowerKey.includes("number") ||
    lowerKey.includes("code") ||
    lowerKey.includes("reference") ||
    lowerKey.includes("id")
  ) {
    return "DAC-0001";
  }
  if (lowerKey.includes("action") || lowerKey.includes("button") || lowerKey.includes("cta")) {
    return createActionMock("Vezi detalii", "https://dacars.ro/detalii");
  }
  if (lowerKey.startsWith("is_") || lowerKey.startsWith("has") || lowerKey.includes("enabled")) {
    return true;
  }
  if (lowerKey.includes("count") || lowerKey.includes("quantity") || lowerKey.includes("qty")) {
    return 1;
  }
  if (lowerKey.includes("percent") || lowerKey.includes("percentage")) {
    return "15%";
  }
  if (
    lowerKey.includes("notes") ||
    lowerKey.includes("message") ||
    lowerKey.includes("comment") ||
    lowerKey.includes("description")
  ) {
    return "Text exemplu pentru previzualizare.";
  }
  if (lowerKey.includes("iban")) return "RO49AAAA1B31007593840000";
  if (lowerKey.includes("bank")) return "Banca Exemplu";
  if (lowerKey.includes("company")) return "SC Exemplu SRL";

  return `valoare ${path.replace(/\./g, "_")}`;
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const MailBrandingPage = () => {
  const [brandingData, setBrandingData] = useState<MailBrandingSettings | null>(null);
  const [brandingForm, setBrandingForm] = useState<MailBrandingFormState | null>(null);
  const [brandingStatus, setBrandingStatus] = useState<StatusMessage | null>(null);
  const [brandingLoading, setBrandingLoading] = useState<boolean>(true);
  const [brandingSaving, setBrandingSaving] = useState<boolean>(false);

  const [templates, setTemplates] = useState<MailTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templateDetails, setTemplateDetails] = useState<Record<string, MailTemplateDetail>>({});
  const [templateCache, setTemplateCache] = useState<Record<string, string>>({});
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [templateContent, setTemplateContent] = useState<string>("");
  const [originalTemplateContent, setOriginalTemplateContent] = useState<string>("");
  const [templateTitle, setTemplateTitle] = useState<string>("");
  const [originalTemplateTitle, setOriginalTemplateTitle] = useState<string>("");
  const [templateSubject, setTemplateSubject] = useState<string>("");
  const [originalTemplateSubject, setOriginalTemplateSubject] = useState<string>("");
  const [templateStatus, setTemplateStatus] = useState<StatusMessage | null>(null);
  const [templateSaving, setTemplateSaving] = useState<boolean>(false);
  const [templateLoading, setTemplateLoading] = useState<boolean>(false);
  const [attachmentUploading, setAttachmentUploading] = useState<boolean>(false);
  const [attachmentDeleting, setAttachmentDeleting] = useState<string | null>(null);

  const [twigEngine, setTwigEngine] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<Record<string, unknown>>({});
  const [previewContextText, setPreviewContextText] = useState<string>("");
  const [previewContextError, setPreviewContextError] = useState<string | null>(null);
  const [debouncedContent, setDebouncedContent] = useState<string>("");
  const [debouncedContext, setDebouncedContext] = useState<Record<string, unknown>>({});
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewFrameHeight, setPreviewFrameHeight] = useState<number>(720);

  const templateEditorLabelId = useId();
  const codeMirrorContainerRef = useRef<HTMLDivElement | null>(null);
  const codeMirrorInstanceRef = useRef<Editor | null>(null);
  const isCodeMirrorSyncingRef = useRef(false);
  const templateContentRef = useRef(templateContent);

  const computeBasePreviewContext = useCallback(() => {
    const siteDetails =
      brandingForm != null
        ? mapFormSiteToDetails(brandingForm.site)
        : brandingData?.resolved_site ?? brandingData?.site ?? null;
    const colorsData =
      brandingForm?.colors ??
      brandingData?.resolved_colors ??
      brandingData?.colors ??
      null;
    return createDefaultPreviewContext(siteDetails, colorsData ?? null);
  }, [brandingForm, brandingData]);

  const applyTemplateDetail = useCallback(
    (detail: MailTemplateDetail | null) => {
      const contents = detail?.contents ?? "";
      const title =
        typeof detail?.title === "string" && detail.title.trim().length > 0
          ? detail.title
          : detail?.title === null
          ? ""
          : detail?.title ?? "";
      const subject =
        typeof detail?.subject === "string" && detail.subject.trim().length > 0
          ? detail.subject
          : detail?.subject === null
          ? ""
          : detail?.subject ?? "";

      setTemplateContent(contents);
      setOriginalTemplateContent(contents);
      setDebouncedContent(contents);
      setTemplateTitle(title);
      setOriginalTemplateTitle(title);
      setTemplateSubject(subject);
      setOriginalTemplateSubject(subject);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    import("twig")
      .then((module) => {
        if (cancelled) return;
        const engine = (module as any)?.default ?? module;
        if (engine && typeof engine.cache === "function") {
          engine.cache(false);
        }
        setTwigEngine(engine);
      })
      .catch((error) => {
        console.error("Nu s-a putut încărca biblioteca Twig:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    templateContentRef.current = templateContent;
  }, [templateContent]);

  useEffect(() => {
    const containerElement = codeMirrorContainerRef.current;
    if (codeMirrorInstanceRef.current || !containerElement) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const mountEditor = async () => {
      try {
        const cmModule = await import("codemirror");
        if (cancelled) return;

        const CodeMirrorLib: CodeMirrorModule =
          (cmModule as { default?: CodeMirrorModule }).default ?? (cmModule as CodeMirrorModule);

        await Promise.all([
          import("codemirror/mode/xml/xml"),
          import("codemirror/mode/javascript/javascript"),
          import("codemirror/mode/css/css"),
          import("codemirror/mode/htmlmixed/htmlmixed"),
          import("codemirror/mode/twig/twig"),
          import("codemirror/addon/edit/closetag"),
          import("codemirror/addon/edit/closebrackets"),
          import("codemirror/addon/edit/matchtags"),
          import("codemirror/addon/display/placeholder"),
          import("codemirror/addon/fold/foldcode"),
          import("codemirror/addon/fold/foldgutter"),
          import("codemirror/addon/fold/xml-fold"),
          import("codemirror/addon/selection/active-line"),
        ]);

        if (cancelled) {
          return;
        }

        const fallbackElement = containerElement.querySelector<HTMLElement>(
          "[data-codemirror-fallback]",
        );
        fallbackElement?.remove();

        const config: ExtendedEditorConfiguration = {
          value: templateContentRef.current ?? "",
          mode: "twig",
          theme: "idea",
          lineNumbers: true,
          lineWrapping: true,
          indentUnit: 2,
          tabSize: 2,
          indentWithTabs: false,
          autoCloseTags: true,
          autoCloseBrackets: true,
          matchTags: { bothTags: true },
          styleActiveLine: true,
          foldGutter: true,
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          placeholder: "{% block body %}...{% endblock %}",
        };

        const editor = CodeMirrorLib(containerElement, config) as Editor;
        codeMirrorInstanceRef.current = editor;

        const wrapper = editor.getWrapperElement();
        wrapper.classList.add(
          "w-full",
          "border",
          "border-gray-300",
          "rounded-xl",
          "bg-white",
          "shadow-sm",
          "transition",
        );
        wrapper.setAttribute("aria-labelledby", templateEditorLabelId);
        wrapper.setAttribute("role", "textbox");
        wrapper.setAttribute("aria-multiline", "true");

        const scroller = wrapper.querySelector<HTMLElement>(".CodeMirror-scroll");
        if (scroller) {
          scroller.style.padding = "12px 16px";
          scroller.style.fontFamily =
            "'Fira Code', 'SFMono-Regular', Menlo, Monaco, 'Courier New', monospace";
          scroller.style.fontSize = "0.875rem";
          scroller.style.lineHeight = "1.5";
          scroller.style.color = "#191919";
          scroller.style.minHeight = "360px";
          scroller.style.background = "transparent";
        }

        const gutters = wrapper.querySelector<HTMLElement>(".CodeMirror-gutters");
        if (gutters) {
          gutters.style.background = "transparent";
          gutters.style.border = "none";
        }

        const handleFocus = (instance: Editor) => {
          void instance;
          wrapper.classList.remove("border-gray-300");
          wrapper.classList.add("border-transparent", "ring-2", "ring-offset-0", "ring-jade");
        };

        const handleBlur = () => {
          wrapper.classList.remove("border-transparent", "ring-2", "ring-offset-0", "ring-jade");
          wrapper.classList.add("border-gray-300");
        };

        const handleChange = (instance: Editor) => {
          if (isCodeMirrorSyncingRef.current) return;
          const newValue = instance.getValue();
          templateContentRef.current = newValue;
          setTemplateContent((prev) => (prev === newValue ? prev : newValue));
        };

        editor.on("focus", handleFocus);
        editor.on("blur", handleBlur);
        editor.on("change", handleChange);
        editor.refresh();

        cleanup = () => {
          editor.off("focus", handleFocus);
          editor.off("blur", handleBlur);
          editor.off("change", handleChange);
          const currentWrapper = editor.getWrapperElement();
          if (currentWrapper && currentWrapper.parentElement) {
            currentWrapper.parentElement.removeChild(currentWrapper);
          }
        };
      } catch (error) {
        console.error("Nu s-a putut încărca editorul CodeMirror:", error);
      }
    };

    mountEditor();

    return () => {
      cancelled = true;
      cleanup?.();
      codeMirrorInstanceRef.current = null;
      isCodeMirrorSyncingRef.current = false;
      if (containerElement) {
        containerElement.innerHTML = "";
      }
    };
  }, [templateEditorLabelId]);

  useEffect(() => {
    const editor = codeMirrorInstanceRef.current;
    if (!editor) {
      return;
    }

    const currentValue = editor.getValue();
    if (currentValue === templateContent) {
      return;
    }

    const doc = editor.getDoc();
    const cursor = doc.getCursor();
    const scrollInfo = editor.getScrollInfo();

    isCodeMirrorSyncingRef.current = true;
    editor.operation(() => {
      editor.setValue(templateContent);
      doc.setCursor(cursor);
    });
    editor.scrollTo(scrollInfo.left, scrollInfo.top);
    isCodeMirrorSyncingRef.current = false;
  }, [templateContent]);

  useEffect(() => {
    let active = true;
    setBrandingLoading(true);
    apiClient
      .getMailBrandingSettings()
      .then((response) => {
        if (!active) return;
        const data = response?.data;
        setBrandingData(data);
        const formState: MailBrandingFormState = {
          site: toSiteFormState(data?.site ?? data?.resolved_site ?? null),
          colors: toColorsState(data?.colors ?? data?.resolved_colors ?? null),
        };
        setBrandingForm(formState);
        const preview = createDefaultPreviewContext(
          data?.resolved_site ?? data?.site ?? null,
          data?.resolved_colors ?? data?.colors ?? null,
        );
        setPreviewContext(preview);
        setPreviewContextText(JSON.stringify(preview, null, 2));
        setDebouncedContext(preview);
      })
      .catch((error) => {
        if (!active) return;
        setBrandingStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Nu s-au putut încărca setările de branding.",
        });
      })
      .finally(() => {
        if (active) {
          setBrandingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setTemplatesLoading(true);
    apiClient
      .getMailTemplates()
      .then(async (response) => {
        if (!active) return;
        const list = Array.isArray(response?.data) ? response.data : [];
        setTemplates(list);

        const detailsEntries = await Promise.all(
          list.map((item) =>
            apiClient
              .getMailTemplate(item.key)
              .then((res) => res?.data)
              .catch((error) => {
                console.error(`Nu s-a putut încărca template-ul ${item.key}:`, error);
                return null;
              }),
          ),
        );

        if (!active) return;

        const detailMap: Record<string, MailTemplateDetail> = {};
        const cacheMap: Record<string, string> = {};
        detailsEntries.forEach((detail) => {
          if (detail) {
            const normalized: MailTemplateDetail = {
              ...detail,
              attachments: Array.isArray(detail.attachments)
                ? detail.attachments
                : [],
            };
            detailMap[normalized.key] = normalized;
            cacheMap[normalized.path] = normalized.contents;
          }
        });

        setTemplateDetails(detailMap);
        setTemplateCache(cacheMap);

        if (list.length > 0) {
          const initialKey = list[0].key;
          setSelectedTemplateKey(initialKey);
          const initialDetail = detailMap[initialKey];
          if (initialDetail) {
            applyTemplateDetail(initialDetail);
          } else {
            applyTemplateDetail(null);
          }
        }
      })
      .catch((error) => {
        if (!active) return;
        setTemplateStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Nu s-a putut încărca lista template-urilor.",
        });
      })
      .finally(() => {
        if (active) {
          setTemplatesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [applyTemplateDetail]);

  useEffect(() => {
    if (!twigEngine) return;
    Object.entries(templateCache).forEach(([path, contents]) => {
      try {
        twigEngine.twig({ id: path, data: contents, allowInlineIncludes: true });
      } catch (error) {
        console.error(`Nu s-a putut înregistra template-ul ${path}:`, error);
      }
    });
  }, [twigEngine, templateCache]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedContent(templateContent);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [templateContent]);

  const previewDocument = useMemo(() => {
    if (!previewHtml || !previewHtml.trim()) {
      return "";
    }

    const trimmed = previewHtml.trim();
    const headStyles = `
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        :root { color-scheme: light; }
        html, body { width: 100%; min-height: 100%; margin: 0; padding: 0; background: #f3f4f6; overflow-x: hidden; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        body * { box-sizing: border-box; }
        .email-preview-wrapper { width: 100%; min-height: 100vh; background: #f3f4f6; padding: 24px 12px; display: flex; justify-content: center; align-items: flex-start; }
        .email-preview-container { position: relative; margin: 0 auto; max-width: none; width: auto; transform-origin: top center; }
        img { max-width: 100%; height: auto; }
        a { color: inherit; }
      </style>
    `;

    if (/<html[\s>]/i.test(trimmed)) {
      if (/<head[\s>]/i.test(trimmed)) {
        return trimmed.replace(/<head([^>]*)>/i, `<head$1>${headStyles}`);
      }
      return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${headStyles}</head>`);
    }

    return `<!DOCTYPE html><html><head>${headStyles}</head><body><div class="email-preview-wrapper"><div class="email-preview-container">${trimmed}</div></div></body></html>`;
  }, [previewHtml]);

  const mergedPreviewContext = useMemo(() => {
    if (!brandingForm) return previewContext;
    const siteDetails = mapFormSiteToDetails(brandingForm.site);
    const nextContext = {
      ...(previewContext ?? {}),
      site: siteDetails,
      colors: { ...brandingForm.colors },
    } as Record<string, unknown>;
    return nextContext;
  }, [previewContext, brandingForm]);

  const adjustPreviewHeight = useCallback(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) return;

      const html = doc.documentElement;
      const body = doc.body;
      if (html) {
        html.style.overflowX = "hidden";
        html.style.backgroundColor = "#f3f4f6";
      }
      if (body) {
        body.style.overflowX = "hidden";
        body.style.backgroundColor = "#f3f4f6";
      }

      const container = doc.querySelector<HTMLElement>(".email-preview-container");
      const wrapper = doc.querySelector<HTMLElement>(".email-preview-wrapper");

      if (wrapper) {
        wrapper.style.display = "flex";
        wrapper.style.justifyContent = "center";
        wrapper.style.alignItems = "flex-start";
        wrapper.style.width = "100%";
      }

      const frameBounds = iframe.getBoundingClientRect();
      const frameWidth = frameBounds.width || iframe.clientWidth;

      if (container && frameWidth > 0) {
        const contentWidth = Math.max(
          container.scrollWidth,
          body?.scrollWidth ?? 0,
          html?.scrollWidth ?? 0,
        );

        container.style.margin = "0 auto";
        container.style.transformOrigin = "top center";

        if (contentWidth > 0) {
          const scale = Math.min(1, frameWidth / contentWidth);
          container.style.maxWidth = `${contentWidth}px`;
          container.style.width = `${contentWidth}px`;

          if (scale < 0.999) {
            container.style.transform = `scale(${scale})`;
          } else {
            container.style.removeProperty("transform");
          }
        } else {
          container.style.removeProperty("transform");
          container.style.removeProperty("width");
          container.style.removeProperty("maxWidth");
        }
      }

      const measuredHeight =
        wrapper?.getBoundingClientRect().height ??
        container?.getBoundingClientRect().height ??
        body?.getBoundingClientRect().height ??
        html?.getBoundingClientRect().height ??
        html?.scrollHeight ??
        body?.scrollHeight ??
        iframe.clientHeight;

      if (!measuredHeight || Number.isNaN(measuredHeight)) {
        return;
      }

      const normalized = Math.max(620, Math.min(Math.ceil(measuredHeight) + 24, 1400));
      setPreviewFrameHeight((current) => {
        if (Math.abs(current - normalized) < 8) {
          return current;
        }
        return normalized;
      });
    } catch (error) {
      console.error("Nu s-a putut ajusta previzualizarea:", error);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedContext(mergedPreviewContext);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [mergedPreviewContext]);

  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const handleLoad = () => adjustPreviewHeight();
    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [adjustPreviewHeight]);

  useEffect(() => {
    const handleResize = () => adjustPreviewHeight();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [adjustPreviewHeight]);

  useEffect(() => {
    if (!previewDocument) {
      setPreviewFrameHeight(640);
      return;
    }

    const handle = window.setTimeout(() => {
      adjustPreviewHeight();
    }, 200);

    return () => window.clearTimeout(handle);
  }, [previewDocument, adjustPreviewHeight]);

  useEffect(() => {
    if (!debouncedContent.trim() || !selectedTemplateKey) return;

    const currentTemplate = templateDetails[selectedTemplateKey];
    const cacheForExtraction = currentTemplate?.path
      ? { ...templateCache, [currentTemplate.path]: debouncedContent }
      : templateCache;

    const variables = extractTwigVariables(debouncedContent, cacheForExtraction);
    if (variables.length === 0) return;

    const baseContext = computeBasePreviewContext();
    let updatedContext: Record<string, unknown> | null = null;

    setPreviewContext((previous) => {
      const draft = cloneContext(previous);
      let changed = false;
      variables.forEach(({ path, expectsArray }) => {
        if (!path) return;
        if (getDeepValue(draft, path) === undefined) {
          const mockValue = generateMockValueForPath(path, baseContext, expectsArray);
          setDeepValue(draft, path, mockValue);
          changed = true;
        }
      });
      if (changed) {
        updatedContext = enhancePreviewValue(draft) as Record<string, unknown>;
        return updatedContext;
      }
      return previous;
    });

    if (updatedContext) {
      setPreviewContextText(JSON.stringify(updatedContext, null, 2));
      setPreviewContextError(null);
    }
  }, [
    debouncedContent,
    selectedTemplateKey,
    templateDetails,
    templateCache,
    computeBasePreviewContext,
    previewContext,
  ]);

  useEffect(() => {
    if (!twigEngine) return;
    if (!debouncedContent) {
      setPreviewHtml("");
      setPreviewError(null);
      return;
    }

    const currentTemplate = selectedTemplateKey ? templateDetails[selectedTemplateKey] : null;
    let compiledTemplate: any = null;
    if (currentTemplate?.path) {
      try {
        compiledTemplate = twigEngine.twig({
          id: currentTemplate.path,
          data: debouncedContent,
          allowInlineIncludes: true,
        });
      } catch (error) {
        console.error(`Nu s-a putut actualiza template-ul ${currentTemplate.path}:`, error);
      }
    }

    try {
      const template =
        compiledTemplate ??
        twigEngine.twig({
          data: debouncedContent,
          allowInlineIncludes: true,
        });
      const output = template.render(debouncedContext ?? {});
      setPreviewHtml(output);
      setPreviewError(null);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut genera previzualizarea template-ului.",
      );
    }
  }, [twigEngine, debouncedContent, debouncedContext, selectedTemplateKey, templateDetails]);

  const handleSiteFieldChange = <K extends keyof Omit<MailSiteFormState, LinkField>>(
    field: K,
    value: string,
  ) => {
    setBrandingForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        site: {
          ...prev.site,
          [field]: value,
        },
      };
    });
  };

  const handleLinkChange = (field: LinkField, index: number, key: keyof MailMenuLink, value: string) => {
    setBrandingForm((prev) => {
      if (!prev) return prev;
      const items = [...prev.site[field]];
      items[index] = { ...items[index], [key]: value } as MailMenuLink;
      return {
        ...prev,
        site: {
          ...prev.site,
          [field]: items,
        },
      };
    });
  };

  const handleLinkAdd = (field: LinkField) => {
    setBrandingForm((prev) => {
      if (!prev) return prev;
      const items = [...prev.site[field], createEmptyLink()];
      return {
        ...prev,
        site: {
          ...prev.site,
          [field]: items,
        },
      };
    });
  };

  const handleLinkRemove = (field: LinkField, index: number) => {
    setBrandingForm((prev) => {
      if (!prev) return prev;
      const items = prev.site[field].filter((_, idx) => idx !== index);
      return {
        ...prev,
        site: {
          ...prev.site,
          [field]: items,
        },
      };
    });
  };

  const handleColorChange = (field: keyof MailBrandingColors, value: string) => {
    setBrandingForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        colors: {
          ...prev.colors,
          [field]: value,
        },
      };
    });
  };

  const handleBrandingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!brandingForm) return;
    setBrandingSaving(true);
    setBrandingStatus(null);

    const payloadSite = mapFormSiteToDetails(brandingForm.site);
    const payload = {
      site: {
        ...payloadSite,
        logo_max_height: payloadSite.logo_max_height ?? null,
      },
      colors: { ...brandingForm.colors },
    };

    apiClient
      .updateMailBrandingSettings(payload)
      .then((response) => {
        const data = response?.data;
        setBrandingData(data);
        const updatedForm: MailBrandingFormState = {
          site: toSiteFormState(data?.site ?? data?.resolved_site ?? null),
          colors: toColorsState(data?.colors ?? data?.resolved_colors ?? null),
        };
        setBrandingForm(updatedForm);
        setBrandingStatus({
          type: "success",
          text: "Setările de branding au fost salvate cu succes.",
        });

        const updatedPreview = createDefaultPreviewContext(
          data?.resolved_site ?? data?.site ?? null,
          data?.resolved_colors ?? data?.colors ?? null,
        );

        let mergedPreview = updatedPreview;
        if (previewContextText.trim()) {
          try {
            const parsed = JSON.parse(previewContextText);
            if (parsed && typeof parsed === "object") {
              mergedPreview = {
                ...(parsed as Record<string, unknown>),
                site: updatedPreview.site,
                colors: updatedPreview.colors,
              };
            }
          } catch {
            mergedPreview = updatedPreview;
          }
        }

        const normalizedPreview = enhancePreviewValue(mergedPreview) as Record<string, unknown>;
        setPreviewContext(normalizedPreview);
        setPreviewContextText(JSON.stringify(normalizedPreview, null, 2));
        setPreviewContextError(null);
      })
      .catch((error) => {
        setBrandingStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Nu s-a putut salva actualizarea.",
        });
      })
      .finally(() => {
        setBrandingSaving(false);
      });
  };

  const handleTemplateSelect = useCallback(
    (key: string) => {
      setSelectedTemplateKey(key);
      setTemplateStatus(null);
      setAttachmentUploading(false);
      setAttachmentDeleting(null);
      if (!key) {
        applyTemplateDetail(null);
        return;
      }
      const detail = templateDetails[key];
      if (detail) {
        applyTemplateDetail(detail);
        return;
      }
      applyTemplateDetail(null);
      setTemplateLoading(true);
      apiClient
        .getMailTemplate(key)
        .then((response) => {
          const data = response?.data;
          if (!data) return;
          const normalized: MailTemplateDetail = {
            ...data,
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
          };
          setTemplateDetails((prev) => ({ ...prev, [normalized.key]: normalized }));
          setTemplateCache((prev) => ({ ...prev, [normalized.path]: normalized.contents }));
          applyTemplateDetail(normalized);
        })
        .catch((error) => {
          setTemplateStatus({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Nu s-a putut încărca template-ul selectat.",
          });
        })
        .finally(() => {
          setTemplateLoading(false);
        });
    },
    [templateDetails, applyTemplateDetail],
  );

  const handleTemplateSave = () => {
    if (!selectedTemplateKey) return;
    const payload: MailTemplateUpdatePayload = {};
    if (templateContent !== originalTemplateContent) {
      payload.contents = templateContent;
    }
    if (templateTitle !== originalTemplateTitle) {
      payload.title = templateTitle;
    }
    if (templateSubject !== originalTemplateSubject) {
      payload.subject = templateSubject;
    }

    if (Object.keys(payload).length === 0) {
      setTemplateStatus({
        type: "error",
        text: "Nu există modificări de salvat.",
      });
      return;
    }

    setTemplateSaving(true);
    setTemplateStatus(null);
    apiClient
      .updateMailTemplate(selectedTemplateKey, payload)
      .then((response) => {
        const data = response?.data;
        if (!data) return;
        const normalized: MailTemplateDetail = {
          ...data,
          attachments: Array.isArray(data.attachments) ? data.attachments : [],
        };
        setTemplateDetails((prev) => ({ ...prev, [normalized.key]: normalized }));
        setTemplates((prev) =>
          prev.map((item) =>
            item.key === normalized.key
              ? {
                  ...item,
                  updated_at: normalized.updated_at,
                  title: normalized.title,
                  subject: normalized.subject,
                }
              : item,
          ),
        );
        setTemplateCache((prev) => ({ ...prev, [normalized.path]: normalized.contents }));
        applyTemplateDetail(normalized);
        setTemplateStatus({
          type: "success",
          text: "Template-ul a fost salvat.",
        });
      })
      .catch((error) => {
        setTemplateStatus({
          type: "error",
          text:
            error instanceof Error ? error.message : "Nu s-a putut salva template-ul.",
        });
      })
      .finally(() => {
        setTemplateSaving(false);
      });
  };

  const handleAttachmentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0] ?? null;
    input.value = "";
    if (!selectedTemplateKey || !file) {
      return;
    }

    setAttachmentUploading(true);
    setTemplateStatus(null);
    apiClient
      .uploadMailTemplateAttachment(selectedTemplateKey, file)
      .then((response) => {
        const attachmentsFromResponse = Array.isArray(response?.data?.attachments)
          ? (response.data.attachments as MailTemplateAttachment[])
          : null;
        setTemplateDetails((prev) => {
          const existing = prev[selectedTemplateKey];
          if (!existing) return prev;
          const nextAttachments = attachmentsFromResponse ?? existing.attachments ?? [];
          const updated: MailTemplateDetail = {
            ...existing,
            attachments: nextAttachments,
          };
          return { ...prev, [selectedTemplateKey]: updated };
        });
        setTemplateStatus({
          type: "success",
          text: "Atașamentul a fost încărcat.",
        });
      })
      .catch((error) => {
        setTemplateStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Nu s-a putut încărca atașamentul.",
        });
      })
      .finally(() => {
        setAttachmentUploading(false);
      });
  };

  const handleAttachmentDelete = (uuid: string) => {
    if (!selectedTemplateKey || !uuid) return;
    setAttachmentDeleting(uuid);
    setTemplateStatus(null);
    apiClient
      .deleteMailTemplateAttachment(selectedTemplateKey, uuid)
      .then((response) => {
        const attachmentsFromResponse = Array.isArray(response?.data?.attachments)
          ? (response.data.attachments as MailTemplateAttachment[])
          : null;
        setTemplateDetails((prev) => {
          const existing = prev[selectedTemplateKey];
          if (!existing) return prev;
          const nextAttachments = attachmentsFromResponse ?? existing.attachments ?? [];
          const updated: MailTemplateDetail = {
            ...existing,
            attachments: nextAttachments,
          };
          return { ...prev, [selectedTemplateKey]: updated };
        });
        setTemplateStatus({
          type: "success",
          text: "Atașamentul a fost șters.",
        });
      })
      .catch((error) => {
        setTemplateStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Nu s-a putut șterge atașamentul.",
        });
      })
      .finally(() => {
        setAttachmentDeleting(null);
      });
  };

  const handlePreviewContextChange = (value: string) => {
    setPreviewContextText(value);
    if (!value.trim()) {
      setPreviewContext({});
      setPreviewContextError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        const enhanced = enhancePreviewValue(parsed) as Record<string, unknown>;
        setPreviewContext(enhanced);
        setPreviewContextError(null);
      }
    } catch (error) {
      setPreviewContextError(
        error instanceof Error
          ? `JSON invalid: ${error.message}`
          : "Format JSON invalid.",
      );
    }
  };

  const resetPreviewContext = useCallback(() => {
    const preview = computeBasePreviewContext();
    setPreviewContext(preview);
    setPreviewContextText(JSON.stringify(preview, null, 2));
    setPreviewContextError(null);
  }, [computeBasePreviewContext]);

  const currentTemplate = selectedTemplateKey
    ? templateDetails[selectedTemplateKey] ?? null
    : null;
  const attachmentsList = currentTemplate?.attachments;
  const currentAttachments: MailTemplateAttachment[] = Array.isArray(attachmentsList)
    ? attachmentsList
    : [];

  const isTemplateDirty =
    templateContent !== originalTemplateContent ||
    templateTitle !== originalTemplateTitle ||
    templateSubject !== originalTemplateSubject;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-berkeley sm:text-3xl">
            Mail Branding &amp; Template-uri
          </h1>
          <p className="text-gray-600">
            Actualizează informațiile folosite în email-urile de booking și editează template-urile Twig
            cu previzualizare în timp real.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-berkeley">
                Setări branding email
              </h2>
              <p className="text-sm text-gray-600">
                Configurează datele site-ului și paleta de culori folosite în template-uri.
              </p>
            </div>
            {brandingLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-jade" aria-hidden="true" />
            )}
          </div>

          {brandingStatus && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                brandingStatus.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {brandingStatus.text}
            </div>
          )}

          <form onSubmit={handleBrandingSubmit} className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="site-title">Titlu site</Label>
                  <Input
                    id="site-title"
                    value={brandingForm?.site.title ?? ""}
                    onChange={(event) => handleSiteFieldChange("title", event.target.value)}
                    placeholder="DaCars"
                  />
                </div>
                <div>
                  <Label htmlFor="site-url">URL site</Label>
                  <Input
                    id="site-url"
                    value={brandingForm?.site.url ?? ""}
                    onChange={(event) => handleSiteFieldChange("url", event.target.value)}
                    placeholder="https://dacars.ro"
                  />
                </div>
                <div>
                  <Label htmlFor="logo-path">Cale logo</Label>
                  <Input
                    id="logo-path"
                    value={brandingForm?.site.logo_path ?? ""}
                    onChange={(event) => handleSiteFieldChange("logo_path", event.target.value)}
                    placeholder="images/logo.webp"
                  />
                </div>
                <div>
                  <Label htmlFor="logo-height">Înălțime maximă logo (px)</Label>
                  <Input
                    id="logo-height"
                    type="number"
                    min={0}
                    value={brandingForm?.site.logo_max_height ?? ""}
                    onChange={(event) => handleSiteFieldChange("logo_max_height", event.target.value)}
                    placeholder="62"
                  />
                </div>
                <div>
                  <Label htmlFor="site-description">Descriere</Label>
                  <textarea
                    id="site-description"
                    value={brandingForm?.site.description ?? ""}
                    onChange={(event) => handleSiteFieldChange("description", event.target.value)}
                    className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-[#191919] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
                    placeholder="Mașini oneste pentru români onești..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="site-email">Email</Label>
                  <Input
                    id="site-email"
                    type="email"
                    value={brandingForm?.site.email ?? ""}
                    onChange={(event) => handleSiteFieldChange("email", event.target.value)}
                    placeholder="contact@dacars.ro"
                  />
                </div>
                <div>
                  <Label htmlFor="site-phone">Telefon principal</Label>
                  <Input
                    id="site-phone"
                    value={brandingForm?.site.phone ?? ""}
                    onChange={(event) => handleSiteFieldChange("phone", event.target.value)}
                    placeholder="+40 723 817 551"
                  />
                </div>
                <div>
                  <Label htmlFor="site-phone-link">Link telefon principal</Label>
                  <Input
                    id="site-phone-link"
                    value={brandingForm?.site.phone_link ?? ""}
                    onChange={(event) => handleSiteFieldChange("phone_link", event.target.value)}
                    placeholder="+40723817551"
                  />
                </div>
                <div>
                  <Label htmlFor="support-phone">Telefon suport</Label>
                  <Input
                    id="support-phone"
                    value={brandingForm?.site.support_phone ?? ""}
                    onChange={(event) => handleSiteFieldChange("support_phone", event.target.value)}
                    placeholder="+40 722 123 456"
                  />
                </div>
                <div>
                  <Label htmlFor="support-phone-link">Link telefon suport</Label>
                  <Input
                    id="support-phone-link"
                    value={brandingForm?.site.support_phone_link ?? ""}
                    onChange={(event) => handleSiteFieldChange("support_phone_link", event.target.value)}
                    placeholder="+40722123456"
                  />
                </div>
                <div>
                  <Label htmlFor="site-address">Adresă</Label>
                  <Input
                    id="site-address"
                    value={brandingForm?.site.address ?? ""}
                    onChange={(event) => handleSiteFieldChange("address", event.target.value)}
                    placeholder="Aeroportul Henri Coandă, Otopeni"
                  />
                </div>
                <div>
                  <Label htmlFor="site-availability">Disponibilitate</Label>
                  <Input
                    id="site-availability"
                    value={brandingForm?.site.availability ?? ""}
                    onChange={(event) => handleSiteFieldChange("availability", event.target.value)}
                    placeholder="Disponibil 24/7"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {(brandingForm ? Object.entries(brandingForm.colors) : []).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`color-${key}`}>Culoare {key}</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id={`color-${key}`}
                      type="color"
                      value={value}
                      onChange={(event) => handleColorChange(key as keyof MailBrandingColors, event.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-md border border-gray-200 bg-white"
                    />
                    <Input
                      value={value}
                      onChange={(event) => handleColorChange(key as keyof MailBrandingColors, event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {(["menu_items", "footer_links", "social_links"] as LinkField[]).map((field) => {
              const items = brandingForm?.site[field] ?? [];
              const labels: Record<LinkField, string> = {
                menu_items: "Meniu principal",
                footer_links: "Link-uri footer",
                social_links: "Rețele sociale",
              };
              return (
                <div key={field} className="space-y-4 rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-berkeley">{labels[field]}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 border-jade text-jade hover:bg-jade/10"
                      onClick={() => handleLinkAdd(field)}
                    >
                      <Plus className="h-4 w-4" /> Adaugă
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-500">Nu există elemente încă.</p>
                    ) : (
                      items.map((item, index) => (
                        <div
                          key={`${field}-${index}`}
                          className="grid gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
                        >
                          <div>
                            <Label htmlFor={`${field}-label-${index}`}>Label</Label>
                            <Input
                              id={`${field}-label-${index}`}
                              value={item.label}
                              onChange={(event) =>
                                handleLinkChange(field, index, "label", event.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${field}-url-${index}`}>URL</Label>
                            <Input
                              id={`${field}-url-${index}`}
                              value={item.url}
                              onChange={(event) =>
                                handleLinkChange(field, index, "url", event.target.value)
                              }
                            />
                          </div>
                          <div className="flex justify-end sm:justify-start">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              className="mt-6 flex items-center gap-2"
                              onClick={() => handleLinkRemove(field, index)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Șterge
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="submit"
                disabled={brandingSaving || !brandingForm}
                className="flex items-center gap-2"
              >
                {brandingSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Salvează setările
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-berkeley">Template-uri email</h2>
              <p className="text-sm text-gray-600">
                Selectează și editează template-urile Twig. Previzualizarea folosește contextul definit mai jos.
              </p>
            </div>
            {templatesLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-jade" aria-hidden="true" />
            )}
          </div>

          {templateStatus && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                templateStatus.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {templateStatus.text}
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="template-select">Template</Label>
                <Select
                  id="template-select"
                  value={selectedTemplateKey}
                  onChange={(event) => handleTemplateSelect(event.target.value)}
                  placeholder="Selectează template-ul"
                  disabled={templates.length === 0}
                >
                  <option value="" disabled>
                    Selectează template-ul
                  </option>
                  {templates.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.name}
                    </option>
                  ))}
                </Select>
                {selectedTemplateKey && (
                  <p className="text-xs text-gray-500">
                    Ultima modificare: {formatDateTime(templateDetails[selectedTemplateKey]?.updated_at)}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-title">Titlu email</Label>
                  <Input
                    id="template-title"
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    placeholder="Titlu pentru lista de template-uri"
                    disabled={!selectedTemplateKey}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subiect email</Label>
                  <Input
                    id="template-subject"
                    value={templateSubject}
                    onChange={(event) => setTemplateSubject(event.target.value)}
                    placeholder="Subiectul emailului"
                    disabled={!selectedTemplateKey}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label id={templateEditorLabelId}>Conținut Twig</Label>
                <div ref={codeMirrorContainerRef} className="min-h-[360px]" data-codemirror-container>
                  <div
                    data-codemirror-fallback
                    className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500"
                  >
                    Editorul se încarcă...
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-berkeley">Atașamente</h3>
                    <p className="text-xs text-gray-500">
                      Fișierele încărcate aici vor fi trimise împreună cu acest email.
                    </p>
                  </div>
                  <label
                    className={`inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition ${
                      !selectedTemplateKey || templateLoading || attachmentUploading
                        ? "cursor-not-allowed border-gray-300 text-gray-400"
                        : "cursor-pointer border-jade text-jade hover:bg-jade/10"
                    }`}
                  >
                    <input
                      type="file"
                      className="sr-only"
                      onChange={handleAttachmentUpload}
                      disabled={
                        !selectedTemplateKey || templateLoading || attachmentUploading
                      }
                    />
                    {attachmentUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    )}
                    {attachmentUploading ? "Se încarcă..." : "Adaugă fișier"}
                  </label>
                </div>
                <ul className="space-y-3">
                  {currentAttachments.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
                      Nu există atașamente pentru acest template.
                    </li>
                  ) : (
                    currentAttachments.map((attachment) => {
                      const name = getAttachmentDisplayName(attachment);
                      const sizeLabel = formatAttachmentSize(attachment.size);
                      const uuid =
                        typeof attachment.uuid === "string" && attachment.uuid.length > 0
                          ? attachment.uuid
                          : name;
                      return (
                        <li
                          key={uuid}
                          className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3"
                        >
                          <div className="min-w-0 space-y-1">
                            {typeof attachment.url === "string" && attachment.url ? (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm font-medium text-berkeley hover:underline"
                              >
                                {name}
                              </a>
                            ) : (
                              <span className="block truncate text-sm font-medium text-berkeley">
                                {name}
                              </span>
                            )}
                            {sizeLabel && (
                              <p className="text-xs text-gray-500">{sizeLabel}</p>
                            )}
                          </div>
                          {typeof attachment.uuid === "string" && attachment.uuid.length > 0 && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => handleAttachmentDelete(attachment.uuid)}
                              disabled={
                                attachmentDeleting === attachment.uuid || attachmentUploading
                              }
                            >
                              {attachmentDeleting === attachment.uuid ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                              Șterge
                            </Button>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-500">
                  {templateLoading
                    ? "Se încarcă template-ul..."
                    : isTemplateDirty
                    ? "Există modificări nesalvate."
                    : "Template sincronizat."}
                </div>
                <Button
                  type="button"
                  onClick={handleTemplateSave}
                  disabled={!selectedTemplateKey || templateSaving || !isTemplateDirty}
                  className="flex items-center gap-2"
                >
                  {templateSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Salvează template-ul
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-berkeley">Context previzualizare</h3>
                    <p className="text-xs text-gray-500">
                      Poți personaliza obiectul JSON folosit pentru randare.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-jade text-jade hover:bg-jade/10"
                    onClick={resetPreviewContext}
                  >
                    <RefreshCw className="h-4 w-4" /> Resetează
                  </Button>
                </div>
                <textarea
                  value={previewContextText}
                  onChange={(event) => handlePreviewContextChange(event.target.value)}
                  className="min-h-[200px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-xs leading-6 text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
                  spellCheck={false}
                />
                {previewContextError && (
                  <p className="text-xs text-red-600">{previewContextError}</p>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div>
                  <h3 className="text-lg font-semibold text-berkeley">Previzualizare</h3>
                  <p className="text-xs text-gray-500">
                    Rezultatul randării template-ului folosind biblioteca Twig din browser.
                  </p>
                </div>
                {previewError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {previewError}
                  </div>
                )}
                {!twigEngine && !previewError && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                    Biblioteca Twig se încarcă... previzualizarea va fi disponibilă în scurt timp.
                  </div>
                )}
                <div className="flex justify-center">
                  {previewDocument ? (
                    <div className="relative w-full max-w-[24rem]">
                      <div className="relative mx-auto rounded-[2.75rem] border border-gray-200 bg-gradient-to-b from-white to-gray-100 p-4 shadow-lg">
                        <div className="pointer-events-none absolute inset-x-12 top-4 mx-auto h-6 rounded-full border border-gray-200 bg-white/80 shadow-sm" />
                        <div className="pointer-events-none absolute left-1/2 top-6 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-300" />
                        <div className="pointer-events-none absolute left-1/2 top-[3.4rem] h-1 w-8 -translate-x-1/2 rounded-full bg-gray-300/70" />
                        <div className="relative mt-12 overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-inner">
                          <iframe
                            ref={previewIframeRef}
                            title="Previzualizare email"
                            className="h-full w-full border-0 bg-white"
                            style={{ height: `${previewFrameHeight}px` }}
                            srcDoc={previewDocument}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                      Introdu conținut Twig pentru a genera previzualizarea.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MailBrandingPage;

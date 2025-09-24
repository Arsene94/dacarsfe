"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { TwigModule, TwigTemplate } from "twig";
import type { JSONContent } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import Text from "@tiptap/extension-text";
import { TextSelection } from "prosemirror-state";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import sanitizeHtml, { type IOptions } from "sanitize-html";
import { Code2, FunctionSquare, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TemplateHelperSelect } from "@/components/admin/mail-branding/TemplateHelperSelect";
import apiClient from "@/lib/api";
import type {
  MailBrandingColors,
  MailBrandingSettings,
  MailMenuLink,
  MailSiteDetails,
  MailTemplateAttachment,
  MailTemplateDetail,
  MailTemplateVariableDetail,
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

const MOBILE_PREVIEW_WIDTH = 480;
const PREVIEW_FRAME_OUTER_WIDTH = MOBILE_PREVIEW_WIDTH + 48;
const PREVIEW_CARD_MAX_WIDTH = PREVIEW_FRAME_OUTER_WIDTH + 32;

const createEmptyLink = (): MailMenuLink => ({ label: "", url: "" });

const normalizeLinkArray = (links?: MailMenuLink[] | null): MailMenuLink[] => {
  if (!Array.isArray(links)) return [];
  return links.map((item) => ({
    label: item?.label ?? "",
    url: item?.url ?? "",
  }));
};

const isTwigModule = (value: unknown): value is TwigModule =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { twig?: unknown }).twig === "function";

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

type SnippetMode = "inline" | "block";

type TwigFunctionSnippet = {
  value: string;
  label: string;
  description: string;
  snippet: string;
  placeholder?: string;
  mode?: SnippetMode;
};

type VariableMetadataSource = "detail" | "api" | "detected";

type VariableMetadataEntry = {
  key: string;
  description: string | null;
  source: VariableMetadataSource;
};

const TWIG_FUNCTION_SNIPPETS: readonly TwigFunctionSnippet[] = [
  {
    value: "if",
    label: "If",
    description: "Rulează codul doar dacă o condiție este adevărată.",
    snippet:
      "{% if condition %}\n  {# conținut când condiția este adevărată #}\n{% endif %}\n",
    placeholder: "condition",
    mode: "block",
  },
  {
    value: "if_else",
    label: "If / Else",
    description: "Alege între două ramuri în funcție de condiție.",
    snippet:
      "{% if condition %}\n  {# conținut când condiția este adevărată #}\n{% else %}\n  {# conținut alternativ #}\n{% endif %}\n",
    placeholder: "condition",
    mode: "block",
  },
  {
    value: "for",
    label: "For",
    description: "Iterează printr-o colecție de elemente.",
    snippet: "{% for item in collection %}\n  {{ item }}\n{% endfor %}\n",
    placeholder: "collection",
    mode: "block",
  },
  {
    value: "for_else",
    label: "For cu fallback",
    description: "Iterează și afișează un mesaj când lista este goală.",
    snippet:
      "{% for item in collection %}\n  {{ item }}\n{% else %}\n  {# conținut afișat când colecția este goală #}\n{% endfor %}\n",
    placeholder: "collection",
    mode: "block",
  },
  {
    value: "include",
    label: "Include",
    description: "Inserează alt template și opțional un context personalizat.",
    snippet: "{% include 'partials/example.twig' with { key: value } %}\n",
    placeholder: "'partials/example.twig'",
    mode: "block",
  },
  {
    value: "extends",
    label: "Extends",
    description: "Moștenește un layout de bază pentru template.",
    snippet: "{% extends 'base.twig' %}\n",
    placeholder: "'base.twig'",
    mode: "block",
  },
  {
    value: "block",
    label: "Block",
    description: "Definește o secțiune care poate fi suprascrisă.",
    snippet:
      "{% block block_name %}\n  {# conținutul blocului #}\n{% endblock %}\n",
    placeholder: "block_name",
    mode: "block",
  },
  {
    value: "set",
    label: "Set",
    description: "Creează sau actualizează o variabilă în Twig.",
    snippet: "{% set variable = value %}\n",
    placeholder: "variable",
    mode: "block",
  },
  {
    value: "set_block",
    label: "Set (bloc)",
    description: "Stochează rezultatul unui bloc de cod într-o variabilă.",
    snippet:
      "{% set variable %}\n  {# conținutul care va fi salvat în variabilă #}\n{% endset %}\n",
    placeholder: "variable",
    mode: "block",
  },
  {
    value: "macro",
    label: "Macro",
    description: "Definește o funcție reutilizabilă în Twig.",
    snippet:
      "{% macro macro_name(parameter) %}\n  {# conținutul macro-ului #}\n{% endmacro %}\n",
    placeholder: "macro_name",
    mode: "block",
  },
  {
    value: "import",
    label: "Import",
    description: "Importă macro-uri dintr-un alt fișier Twig.",
    snippet: "{% import 'macros.twig' as macros %}\n",
    placeholder: "'macros.twig'",
    mode: "block",
  },
  {
    value: "embed",
    label: "Embed",
    description: "Include un template și rescrie blocuri interne.",
    snippet:
      "{% embed 'partials/card.twig' with { context_key: value } %}\n  {# conținut suplimentar #}\n{% endembed %}\n",
    placeholder: "'partials/card.twig'",
    mode: "block",
  },
  {
    value: "with",
    label: "With",
    description: "Creează un context local pentru un bloc.",
    snippet:
      "{% with { key: value } %}\n  {# conținutul cu context personalizat #}\n{% endwith %}\n",
    placeholder: "{ key: value }",
    mode: "block",
  },
  {
    value: "filter",
    label: "Filter",
    description: "Aplică un filtru întregului bloc de conținut.",
    snippet: "{% filter upper %}\n  {{ text }}\n{% endfilter %}\n",
    placeholder: "upper",
    mode: "block",
  },
  {
    value: "apply",
    label: "Apply",
    description: "Aplică un filtru sau funcție asupra unui bloc și stochează rezultatul.",
    snippet: "{% apply lower %}\n  {{ text }}\n{% endapply %}\n",
    placeholder: "lower",
    mode: "block",
  },
  {
    value: "spaceless",
    label: "Spaceless",
    description: "Elimină spațiile dintre tag-urile HTML generate.",
    snippet:
      "{% spaceless %}\n  {# conținutul HTML fără spații #}\n{% endspaceless %}\n",
    mode: "block",
  },
  {
    value: "autoescape",
    label: "Autoescape",
    description: "Controlează modul de escapare pentru conținutul intern.",
    snippet: "{% autoescape 'html' %}\n  {{ variable }}\n{% endautoescape %}\n",
    placeholder: "'html'",
    mode: "block",
  },
  {
    value: "verbatim",
    label: "Verbatim",
    description: "Afișează textul exact fără a fi interpretat de Twig.",
    snippet: "{% verbatim %}\n  {{ acesta_nu_este_interpretat }}\n{% endverbatim %}\n",
    placeholder: "{{ acesta_nu_este_interpretat }}",
    mode: "block",
  },
  {
    value: "raw",
    label: "Raw",
    description: "Marchează o secțiune ca text brut în rezultat.",
    snippet: "{% raw %}\n  {{ acest_text_va_fi_afisat }}\n{% endraw %}\n",
    placeholder: "{{ acest_text_va_fi_afisat }}",
    mode: "block",
  },
];

const TwigDocument = Document.extend({
  content: "twigBlock",
});

const TwigCodeBlock = CodeBlock.extend({
  name: "twigBlock",
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: "tiptap-mail-code-block",
        "data-type": "twig-block",
        "data-language": "twig",
        spellcheck: "false",
      },
    };
  },
  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.();
    return {
      ...(typeof parentShortcuts === "object" ? parentShortcuts : {}),
      Tab: () => {
        if (!this.editor.isEditable) {
          return false;
        }
        const { state, view } = this.editor;
        const { from, to } = state.selection;
        view.dispatch(state.tr.insertText("  ", from, to));
        return true;
      },
      "Shift-Tab": () => {
        if (!this.editor.isEditable) {
          return false;
        }
        const { state, view } = this.editor;
        const { from } = state.selection;
        const { doc } = state;
        let lineStart = from;
        while (lineStart > 0) {
          const char = doc.textBetween(lineStart - 1, lineStart, "\u0000", "\u0000");
          if (char === "\n") {
            break;
          }
          lineStart -= 1;
        }
        const deleteBoundary = Math.min(from, lineStart + 2);
        const leading = doc.textBetween(lineStart, deleteBoundary, "\u0000", "\u0000");
        const spacesToRemove = leading.startsWith("  ") ? 2 : leading.startsWith(" ") ? 1 : 0;
        if (spacesToRemove === 0) {
          return false;
        }
        view.dispatch(state.tr.delete(lineStart, lineStart + spacesToRemove));
        return true;
      },
    };
  },
});

const createTwigEditorContent = (value: string): JSONContent => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const textContent = normalized.length > 0 ? [{ type: "text", text: normalized }] : [];
  return {
    type: "doc",
    content: [
      {
        type: "twigBlock",
        content: textContent,
      },
    ],
  };
};

const getEditorPlainText = (editor: Editor | null): string => {
  if (!editor) {
    return "";
  }
  const { doc } = editor.state;
  return doc.textBetween(0, doc.content.size, "\n", "\n");
};

const defaultNonTextTags =
  (sanitizeHtml.defaults as typeof sanitizeHtml.defaults & {
    nonTextTags?: string[];
  }).nonTextTags ?? ["style", "script", "textarea", "option"];

const MAIL_PREVIEW_SANITIZE_OPTIONS: IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "html",
    "head",
    "body",
    "meta",
    "style",
    "link",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "colgroup",
    "col",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "figure",
    "figcaption",
    "picture",
    "source",
    "address",
    "center",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": [
      ...(sanitizeHtml.defaults.allowedAttributes?.["*"] ?? []),
      "class",
      "style",
      "id",
      "title",
      "data-*",
      "aria-*",
      "role",
      "align",
      "valign",
      "width",
      "height",
      "border",
      "cellpadding",
      "cellspacing",
      "bgcolor",
      "color",
    ],
    a: [
      ...(sanitizeHtml.defaults.allowedAttributes?.a ?? []),
      "href",
      "name",
      "target",
      "rel",
      "title",
      "aria-label",
      "aria-current",
    ],
    img: [
      ...(sanitizeHtml.defaults.allowedAttributes?.img ?? []),
      "src",
      "srcset",
      "sizes",
      "alt",
      "title",
      "width",
      "height",
      "loading",
    ],
    table: [
      "width",
      "align",
      "cellpadding",
      "cellspacing",
      "border",
      "bgcolor",
      "style",
      "class",
    ],
    td: [
      "width",
      "height",
      "colspan",
      "rowspan",
      "align",
      "valign",
      "bgcolor",
      "style",
      "class",
    ],
    th: [
      "width",
      "height",
      "colspan",
      "rowspan",
      "align",
      "valign",
      "bgcolor",
      "style",
      "class",
    ],
    tr: ["align", "valign", "bgcolor", "style", "class"],
    div: ["style", "class", "data-*", "role", "aria-*", "align"],
    span: ["style", "class", "data-*", "role", "aria-*"],
    link: ["rel", "href", "type", "media"],
    source: ["src", "type", "media", "srcset", "sizes"],
  },
  allowedSchemes: [...sanitizeHtml.defaults.allowedSchemes, "tel"],
  allowedSchemesByTag: {
    ...sanitizeHtml.defaults.allowedSchemesByTag,
    a: ["http", "https", "mailto", "tel"],
    img: ["http", "https", "data"],
  },
  allowProtocolRelative: true,
  selfClosing: [...sanitizeHtml.defaults.selfClosing, "meta", "link", "source"],
  nonTextTags: defaultNonTextTags,
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
};

const sanitizeTwigPreviewHtml = (input: string): string =>
  sanitizeHtml(input, MAIL_PREVIEW_SANITIZE_OPTIONS);

const createDefaultPreviewContext = (
  site?: MailSiteDetails | null,
  colors?: MailBrandingColors | null,
): Record<string, unknown> => {
  const heroBadgeLabel = "Oferta săptămânii";
  const heroBadgeColor = colors?.jadeLight ?? "#38B275";
  const heroBadgeTextColor = "#FFFFFF";
  const heroBadgeBackground = "#E8F8F0";
  const heroIconChar = "🚗";
  const heroTitle = "Rezervarea ta este confirmată";
  const heroSubtitle = "Mulțumim că ai ales DaCars pentru următoarea călătorie.";
  const heroDescription =
    "Predarea și preluarea au loc direct în aeroport. Verifică detaliile de mai jos înainte de plecare.";
  const heroSupportMessage = "Echipa noastră este disponibilă non-stop dacă ai nevoie de ajutor.";

  const heroPrimaryAction = createActionMock(
    "Vezi rezervarea",
    site?.url ? `${site.url.replace(/\/?$/, "")}/rezervari` : "https://dacars.ro/rezervari",
  );
  const heroSecondaryAction = createActionMock(
    "Contactează-ne",
    site?.email ? `mailto:${site.email}` : "mailto:contact@dacars.ro",
  );
  const heroPrimaryButton = createActionMock(
    "Confirmă sosirea",
    site?.url ? `${site.url.replace(/\/?$/, "")}/check-in` : "https://dacars.ro/check-in",
  );
  const heroSecondaryButton = createActionMock(
    "Modifică rezervarea",
    site?.url ? `${site.url.replace(/\/?$/, "")}/modifica` : "https://dacars.ro/modifica",
  );

  const heroFeatures = [
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
  ];

  const heroSteps = [
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
  ];

  const heroStats = [
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
  ];

  const heroContext = {
    icon_char: heroIconChar,
    badge_label: heroBadgeLabel,
    badge_color: heroBadgeColor,
    badge_text_color: heroBadgeTextColor,
    badge_background: heroBadgeBackground,
    title: heroTitle,
    subtitle: heroSubtitle,
    description: heroDescription,
    support_message: heroSupportMessage,
    primary_action: heroPrimaryAction,
    secondary_action: heroSecondaryAction,
    primary_button: heroPrimaryButton,
    secondary_button: heroSecondaryButton,
    features: heroFeatures,
    steps: heroSteps,
    stats: heroStats,
  };

  const baseContext: Record<string, unknown> = {
    site: site ?? null,
    colors: colors ?? null,
    customer_name: "Ion Popescu",
    customer_email: "ion.popescu@example.com",
    booking_number: "DAC-12345",
    booking_reference: "DAC-12345",
    reservation_id: "DAC-12345",
    reservation_badge: "Rezervarea #DAC-12345",
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
    hero_icon_char: heroIconChar,
    hero_badge_label: heroBadgeLabel,
    hero_badge_color: heroBadgeColor,
    hero_badge_text_color: heroBadgeTextColor,
    hero_badge_background: heroBadgeBackground,
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    hero_description: heroDescription,
    hero_support_message: heroSupportMessage,
    hero_primary_action: heroPrimaryAction,
    hero_secondary_action: heroSecondaryAction,
    hero_primary_button: heroPrimaryButton,
    hero_secondary_button: heroSecondaryButton,
    hero_features: heroFeatures,
    hero_steps: heroSteps,
    hero_stats: heroStats,
    hero: heroContext,
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
  reservation_id: "DAC-12345",
  reservation_badge: "Rezervarea #DAC-12345",
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

const normalizeAvailableVariables = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set<string>();
  const result: string[] = [];

  input.forEach((entry) => {
    if (typeof entry !== "string") {
      return;
    }
    const trimmed = entry.trim();
    if (!trimmed || unique.has(trimmed)) {
      return;
    }
    unique.add(trimmed);
    result.push(trimmed);
  });

  return result;
};

const normalizeAvailableVariableDetails = (
  input: unknown,
): MailTemplateVariableDetail[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Set<string>();
  const details: MailTemplateVariableDetail[] = [];

  input.forEach((entry) => {
    if (!isPlainObject(entry)) {
      return;
    }

    const rawKey = entry.key;
    if (typeof rawKey !== "string") {
      return;
    }

    const key = rawKey.trim();
    if (!key || unique.has(key)) {
      return;
    }

    unique.add(key);

    const detail: MailTemplateVariableDetail = { key };

    if (typeof entry.description === "string") {
      const trimmedDescription = entry.description.trim();
      detail.description = trimmedDescription.length > 0 ? trimmedDescription : null;
    } else if (entry.description === null) {
      detail.description = null;
    }

    Object.entries(entry).forEach(([entryKey, value]) => {
      if (entryKey === "key" || entryKey === "description") {
        return;
      }
      detail[entryKey] = value;
    });

    details.push(detail);
  });

  return details;
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
  const [variableSelectValue, setVariableSelectValue] = useState<string>("");
  const [functionSelectValue, setFunctionSelectValue] = useState<string>("");
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  const [twigEngine, setTwigEngine] = useState<TwigModule | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<Record<string, unknown>>({});
  const [debouncedContent, setDebouncedContent] = useState<string>("");
  const [debouncedContext, setDebouncedContext] = useState<Record<string, unknown>>({});
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewFrameHeight, setPreviewFrameHeight] = useState<number>(720);

  const templateEditorLabelId = useId();
  const templateVariableSelectId = useId();
  const templateFunctionSelectId = useId();
  const templateContentRef = useRef(templateContent);
  const editorRef = useRef<Editor | null>(null);
  const [isClient, setIsClient] = useState(false);

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

  const normalizeTemplateDetail = useCallback(
    (detail: MailTemplateDetail | null | undefined): MailTemplateDetail | null => {
      if (!detail) {
        return null;
      }

      const attachments = Array.isArray(detail.attachments) ? detail.attachments : [];
      const availableVariables = normalizeAvailableVariables(detail.available_variables);
      const availableVariableDetails = normalizeAvailableVariableDetails(
        detail.available_variable_details,
      );
      const exampleContext = isPlainObject(detail.example_context)
        ? cloneContext(detail.example_context)
        : null;

      return {
        ...detail,
        attachments,
        available_variables: availableVariables,
        available_variable_details: availableVariableDetails,
        example_context: exampleContext,
      };
    },
    [],
  );

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
      templateContentRef.current = contents;
      setTemplateTitle(title);
      setOriginalTemplateTitle(title);
      setTemplateSubject(subject);
      setOriginalTemplateSubject(subject);
      setVariableSelectValue("");
      setFunctionSelectValue("");
      setDetectedVariables([]);

      const basePreview = computeBasePreviewContext();
      const examplePreview =
        detail?.example_context && isPlainObject(detail.example_context)
          ? cloneContext(detail.example_context)
          : {};
      const mergedPreview = enhancePreviewValue({
        ...cloneContext(basePreview),
        ...(isPlainObject(examplePreview) ? examplePreview : {}),
      }) as Record<string, unknown>;
      setPreviewContext(mergedPreview);
    },
    [computeBasePreviewContext],
  );

  useEffect(() => {
    let cancelled = false;
    import("twig")
      .then((module) => {
        if (cancelled) return;
        const candidate =
          (typeof module === "object" && module && "default" in module
            ? (module as { default: unknown }).default
            : undefined) ?? module;

        if (isTwigModule(candidate)) {
          if (typeof candidate.cache === "function") {
            candidate.cache(false);
          }
          setTwigEngine(candidate);
        } else {
          console.error("Modulul Twig încărcat nu are forma așteptată.");
        }
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
    setIsClient(true);
  }, []);

  const tiptapEditor = useEditor(
    !isClient
      ? undefined
      : {
          extensions: [
            TwigDocument,
            Text,
            TwigCodeBlock,
            History.configure({ depth: 500 }),
            Placeholder.configure({
              includeChildren: true,
              placeholder: ({ node }) =>
                node.type.name === "twigBlock"
                  ? "Scrie sau lipește conținutul HTML/Twig al emailului."
                  : "",
              showOnlyCurrent: false,
            }),
          ],
          content: createTwigEditorContent(templateContentRef.current ?? ""),
          onUpdate: ({ editor }: { editor: Editor }) => {
            const nextValue = getEditorPlainText(editor);
            templateContentRef.current = nextValue;
            setTemplateContent((prev) => (prev === nextValue ? prev : nextValue));
          },
          editorProps: {
            attributes: {
              class:
                "tiptap-mail-editor block min-h-[320px] w-full whitespace-pre-wrap break-words px-4 py-5 font-mono text-sm leading-6 text-[#191919] focus:outline-none",
              "aria-labelledby": templateEditorLabelId,
              "data-gramm": "false",
              spellCheck: "false",
            },
          },
        },
    [isClient, templateEditorLabelId],
  );

  useEffect(() => {
    editorRef.current = tiptapEditor ?? null;
    return () => {
      if (editorRef.current === tiptapEditor) {
        editorRef.current = null;
      }
    };
  }, [tiptapEditor]);

  useEffect(() => {
    if (!tiptapEditor) {
      return;
    }
    const normalized = templateContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const currentValue = getEditorPlainText(tiptapEditor);
    if (currentValue !== normalized) {
      const nextContent = createTwigEditorContent(normalized);
      tiptapEditor.commands.setContent(nextContent, false);
    }
  }, [templateContent, tiptapEditor]);

  useEffect(() => {
    if (!tiptapEditor) {
      return;
    }
    const editable = Boolean(selectedTemplateKey) && !templateLoading;
    tiptapEditor.setEditable(editable);
    const editorElement = tiptapEditor.view.dom as HTMLElement;
    editorElement.setAttribute("aria-readonly", editable ? "false" : "true");
    if (!editable) {
      editorElement.setAttribute("data-readonly", "true");
    } else {
      editorElement.removeAttribute("data-readonly");
    }
  }, [tiptapEditor, selectedTemplateKey, templateLoading]);






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
              .getMailTemplateDetail(item.key)
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
          const normalized = normalizeTemplateDetail(detail);
          if (normalized) {
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
  }, [applyTemplateDetail, normalizeTemplateDetail]);

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
        html { width: 100%; min-height: 100%; }
        body { margin: 0; padding: 0; width: 100%; min-height: 100%; background: transparent; -webkit-text-size-adjust: 100%; }
        img { max-width: 100%; height: auto; }
      </style>
    `;

    if (/<html[\s>]/i.test(trimmed)) {
      if (/<head[\s>]/i.test(trimmed)) {
        return trimmed.replace(/<head([^>]*)>/i, `<head$1>${headStyles}`);
      }
      return trimmed.replace(/<html([^>]*)>/i, `<html$1><head>${headStyles}</head>`);
    }

    return `<!DOCTYPE html><html><head>${headStyles}</head><body>${trimmed}</body></html>`;
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
        html.style.width = "100%";
      }

      if (body) {
        body.style.margin = "0";
        body.style.width = "100%";
        body.style.overflowX = "hidden";
      }

      const measuredHeight =
        body?.getBoundingClientRect().height ??
        html?.getBoundingClientRect().height ??
        body?.scrollHeight ??
        html?.scrollHeight ??
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
    const variablePaths = Array.from(
      new Set(
        variables
          .map((item) => item.path)
          .filter((path): path is string => typeof path === "string" && path.trim().length > 0),
      ),
    );
    setDetectedVariables(variablePaths);

    if (variablePaths.length === 0) {
      return;
    }

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
    let compiledTemplate: TwigTemplate | null = null;
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
      setPreviewHtml(sanitizeTwigPreviewHtml(output));
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

  const insertSnippet = useCallback(
    (snippet: string, options?: { placeholder?: string; mode?: SnippetMode }) => {
      const mode: SnippetMode = options?.mode ?? "inline";
      const placeholder =
        options?.placeholder && options.placeholder.length > 0
          ? options.placeholder
          : undefined;
      const editor = editorRef.current;

      if (editor) {
        const { state, view } = editor;
        const { from, to } = state.selection;
        const transaction = state.tr.insertText(snippet, from, to);
        const placeholderIndex = placeholder ? snippet.indexOf(placeholder) : -1;
        const basePosition = from;
        const selectionStart =
          placeholderIndex >= 0 ? basePosition + placeholderIndex : basePosition + snippet.length;
        const selectionEnd =
          placeholderIndex >= 0 && placeholder
            ? selectionStart + placeholder.length
            : selectionStart;
        const textSelection = TextSelection.create(
          transaction.doc,
          Math.max(0, selectionStart),
          Math.max(0, selectionEnd),
        );
        view.dispatch(transaction.setSelection(textSelection).scrollIntoView());
        view.focus();
        const nextValue = getEditorPlainText(editor);
        templateContentRef.current = nextValue;
        setTemplateContent((prev) => (prev === nextValue ? prev : nextValue));
        return;
      }

      const base = templateContentRef.current ?? "";
      let nextValue: string;

      if (mode === "inline") {
        const shouldAddSpace = base.length > 0 && !/\s$/.test(base);
        nextValue = shouldAddSpace ? `${base} ${snippet}` : `${base}${snippet}`;
      } else {
        const needsNewline = base.length > 0 && !base.endsWith("\n");
        nextValue = needsNewline ? `${base}\n${snippet}` : `${base}${snippet}`;
      }

      templateContentRef.current = nextValue;
      setTemplateContent(nextValue);
      setDebouncedContent(nextValue);
    },
    [setDebouncedContent, setTemplateContent],
  );

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

        const normalizedPreview = enhancePreviewValue({
          ...(previewContext ?? {}),
          site: updatedPreview.site,
          colors: updatedPreview.colors,
        }) as Record<string, unknown>;
        setPreviewContext(normalizedPreview);
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
        .getMailTemplateDetail(key)
        .then((response) => {
          const data = response?.data;
          const normalized = normalizeTemplateDetail(data);
          if (!normalized) return;
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
    [templateDetails, applyTemplateDetail, normalizeTemplateDetail],
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
        const normalized = normalizeTemplateDetail(data);
        if (!normalized) return;
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

  const handleVariableSelect = (selectedValue: string) => {
    setVariableSelectValue(selectedValue);

    if (!selectedValue) {
      return;
    }

    insertSnippet(`{{ ${selectedValue} }}`, { mode: "inline" });

    setVariableSelectValue("");
  };

  const handleFunctionSelect = (selectedValue: string) => {
    setFunctionSelectValue(selectedValue);

    if (!selectedValue) {
      return;
    }

    const snippetConfig = TWIG_FUNCTION_SNIPPETS.find(
      (item) => item.value === selectedValue,
    );

    if (snippetConfig) {
      insertSnippet(snippetConfig.snippet, {
        placeholder: snippetConfig.placeholder,
        mode: snippetConfig.mode ?? "block",
      });
    }

    setFunctionSelectValue("");
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

  const currentTemplate = selectedTemplateKey
    ? templateDetails[selectedTemplateKey] ?? null
    : null;
  const attachmentsList = currentTemplate?.attachments;
  const currentAttachments: MailTemplateAttachment[] = Array.isArray(attachmentsList)
    ? attachmentsList
    : [];



  const availableVariableMetadata = useMemo(() => {
    const detail = selectedTemplateKey ? templateDetails[selectedTemplateKey] : null;
    const fromApi = Array.isArray(detail?.available_variables)
      ? detail?.available_variables
      : [];
    const detailEntries = Array.isArray(detail?.available_variable_details)
      ? detail.available_variable_details
      : [];

    const descriptionMap = new Map<string, string | null>();
    detailEntries.forEach((entry) => {
      if (!entry || typeof entry.key !== "string") {
        return;
      }
      const key = entry.key.trim();
      if (!key || descriptionMap.has(key)) {
        return;
      }
      const description =
        typeof entry.description === "string" && entry.description.trim().length > 0
          ? entry.description.trim()
          : null;
      descriptionMap.set(key, description);
    });

    const combined: VariableMetadataEntry[] = [];
    const seen = new Set<string>();

    const addValue = (value: string, source: VariableMetadataSource) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (!trimmed || seen.has(trimmed)) {
        return;
      }
      seen.add(trimmed);
      const description = descriptionMap.has(trimmed)
        ? descriptionMap.get(trimmed) ?? null
        : null;
      combined.push({ key: trimmed, description, source });
    };

    detailEntries.forEach((entry) => {
      if (entry && typeof entry.key === "string") {
        addValue(entry.key, "detail");
      }
    });

    fromApi.forEach((value) => {
      if (typeof value === "string") {
        addValue(value, "api");
      }
    });

    detectedVariables.forEach((value) => {
      if (typeof value === "string") {
        addValue(value, "detected");
      }
    });

    return combined;
  }, [selectedTemplateKey, templateDetails, detectedVariables]);

  const describeVariableEntry = useCallback(
    (entry: VariableMetadataEntry) => {
      if (entry.description && entry.description.length > 0) {
        return entry.description;
      }
      if (entry.source === "detected") {
        return "Variabilă detectată automat din conținut.";
      }
      return "Nu există o descriere pentru această variabilă.";
    },
    [],
  );

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
          </div>

          <div className="flex flex-col gap-6">
            <div className="min-w-0 w-full space-y-6">
              <div className="rounded-2xl border border-gray-200 p-4 sm:p-6">
                <h3 id={templateEditorLabelId} className="text-lg font-semibold text-berkeley">
                  Conținut Twig
                </h3>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="space-y-2 sm:w-72">
                      <Label htmlFor={templateVariableSelectId}>Variabile disponibile</Label>
                      <TemplateHelperSelect
                        id={templateVariableSelectId}
                        value={variableSelectValue}
                        onChange={handleVariableSelect}
                        disabled={
                          !selectedTemplateKey || availableVariableMetadata.length === 0
                        }
                        icon={<Code2 className="h-4 w-4" />}
                        placeholder={
                          !selectedTemplateKey
                            ? "Selectează un template pentru a folosi variabilele"
                            : availableVariableMetadata.length === 0
                            ? "Nu există variabile pentru acest template"
                            : "Inserează o variabilă"
                        }
                        emptyMessage="Nu există variabile pentru acest template"
                        searchable
                        searchPlaceholder="Caută variabile"
                        noResultsMessage="Nu există variabile care să corespundă căutării"
                        items={availableVariableMetadata.map((entry) => ({
                          value: entry.key,
                          label: entry.key,
                          description: describeVariableEntry(entry),
                          buttonLabel: `{{ ${entry.key} }}`,
                          title: describeVariableEntry(entry),
                        }))}
                      />
                    </div>
                    <div className="space-y-2 sm:w-72">
                      <Label htmlFor={templateFunctionSelectId}>Fragmente Twig</Label>
                      <TemplateHelperSelect
                        id={templateFunctionSelectId}
                        value={functionSelectValue}
                        onChange={handleFunctionSelect}
                        disabled={!selectedTemplateKey}
                        icon={<FunctionSquare className="h-4 w-4" />}
                        placeholder={
                          selectedTemplateKey
                            ? "Inserează un fragment Twig"
                            : "Selectează un template pentru a folosi fragmentele"
                        }
                        searchable
                        searchPlaceholder="Caută fragmente"
                        noResultsMessage="Nu există fragmente care să corespundă căutării"
                        items={TWIG_FUNCTION_SNIPPETS.map((snippet) => ({
                          value: snippet.value,
                          label: snippet.label,
                          description: snippet.description,
                          buttonLabel: snippet.label,
                          title: snippet.description,
                          disabled: Boolean(!snippet.value),
                        }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 lg:max-w-sm lg:text-right">
                    Selectează o variabilă sau un fragment Twig pentru a-l insera la poziția cursorului din editor.
                  </p>
                  {availableVariableMetadata.length > 0 && (
                    <div className="lg:w-full lg:basis-full">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                        <p className="font-medium text-gray-700">Descrieri variabile</p>
                        <ul className="mt-2 space-y-2">
                          {availableVariableMetadata.map((entry) => (
                            <li
                              key={entry.key}
                              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
                            >
                              <span className="font-mono text-berkeley">{`{{ ${entry.key} }}`}</span>
                              <span className="text-gray-600">
                                {describeVariableEntry(entry)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 min-h-[360px]">
                  {isClient ? (
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-jade/30 focus-within:ring-offset-2">
                      {tiptapEditor ? (
                        <EditorContent editor={tiptapEditor} />
                      ) : (
                        <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">
                          Editorul se încarcă...
                        </div>
                      )}
                      {tiptapEditor && (!selectedTemplateKey || templateLoading) && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 px-6 text-center text-sm font-medium text-gray-500">
                          {templateLoading
                            ? "Se încarcă template-ul selectat..."
                            : "Selectează un template din listă pentru a edita conținutul."}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                      Editorul se încarcă...
                    </div>
                  )}
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

            <div
              className="min-w-0 w-full mx-auto"
              style={{ maxWidth: `${PREVIEW_CARD_MAX_WIDTH}px` }}
            >
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
                    <div
                      className="relative w-full"
                      style={{ maxWidth: `${PREVIEW_FRAME_OUTER_WIDTH}px` }}
                    >
                      <div
                        className="relative mx-auto rounded-[2.75rem] border border-gray-200 bg-gradient-to-b from-white to-gray-100 p-4 shadow-lg"
                        style={{ width: "100%" }}
                      >
                        <div className="pointer-events-none absolute inset-x-12 top-4 mx-auto h-6 rounded-full border border-gray-200 bg-white/80 shadow-sm" />
                        <div className="pointer-events-none absolute left-1/2 top-6 h-1.5 w-16 -translate-x-1/2 rounded-full bg-gray-300" />
                        <div className="pointer-events-none absolute left-1/2 top-[3.4rem] h-1 w-8 -translate-x-1/2 rounded-full bg-gray-300/70" />
                        <div
                          className="relative mt-12 overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-inner"
                          style={{ width: "100%", maxWidth: `${MOBILE_PREVIEW_WIDTH}px`, margin: "0 auto" }}
                        >
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

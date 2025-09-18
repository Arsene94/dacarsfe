"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
  MailTemplateDetail,
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
): Record<string, unknown> => ({
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
    { name: "Scaun copil", price: "15 €" },
    { name: "Șofer adițional", price: "25 €" },
  ],
  notes: "Vă rugăm să ne sunați când ajungeți în aeroport.",
  support: {
    phone: site?.support_phone ?? "+40 722 123 456",
    email: site?.email ?? "contact@dacars.ro",
  },
});

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
  const [templateStatus, setTemplateStatus] = useState<StatusMessage | null>(null);
  const [templateSaving, setTemplateSaving] = useState<boolean>(false);
  const [templateLoading, setTemplateLoading] = useState<boolean>(false);

  const [twigEngine, setTwigEngine] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<Record<string, unknown>>({});
  const [previewContextText, setPreviewContextText] = useState<string>("");
  const [previewContextError, setPreviewContextError] = useState<string | null>(null);
  const [debouncedContent, setDebouncedContent] = useState<string>("");
  const [debouncedContext, setDebouncedContext] = useState<Record<string, unknown>>({});

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
            detailMap[detail.key] = detail;
            cacheMap[detail.path] = detail.contents;
          }
        });

        setTemplateDetails(detailMap);
        setTemplateCache(cacheMap);

        if (list.length > 0) {
          const initialKey = list[0].key;
          setSelectedTemplateKey(initialKey);
          const initialDetail = detailMap[initialKey];
          if (initialDetail) {
            setTemplateContent(initialDetail.contents);
            setOriginalTemplateContent(initialDetail.contents);
            setDebouncedContent(initialDetail.contents);
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
  }, []);

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

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedContext(mergedPreviewContext);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [mergedPreviewContext]);

  useEffect(() => {
    if (!twigEngine) return;
    if (!debouncedContent) {
      setPreviewHtml("");
      setPreviewError(null);
      return;
    }

    const currentTemplate = selectedTemplateKey ? templateDetails[selectedTemplateKey] : null;
    if (currentTemplate?.path) {
      try {
        twigEngine.twig({
          id: currentTemplate.path,
          data: debouncedContent,
          allowInlineIncludes: true,
        });
      } catch (error) {
        console.error(`Nu s-a putut actualiza template-ul ${currentTemplate.path}:`, error);
      }
    }

    try {
      const template = twigEngine.twig({
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

        setPreviewContext(mergedPreview);
        setPreviewContextText(JSON.stringify(mergedPreview, null, 2));
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
      if (!key) {
        setTemplateContent("");
        setOriginalTemplateContent("");
        setDebouncedContent("");
        return;
      }
      const detail = templateDetails[key];
      if (detail) {
        setTemplateContent(detail.contents);
        setOriginalTemplateContent(detail.contents);
        setDebouncedContent(detail.contents);
        return;
      }
      setTemplateLoading(true);
      apiClient
        .getMailTemplate(key)
        .then((response) => {
          const data = response?.data;
          if (!data) return;
          setTemplateDetails((prev) => ({ ...prev, [data.key]: data }));
          setTemplateCache((prev) => ({ ...prev, [data.path]: data.contents }));
          setTemplateContent(data.contents);
          setOriginalTemplateContent(data.contents);
          setDebouncedContent(data.contents);
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
    [templateDetails],
  );

  const handleTemplateSave = () => {
    if (!selectedTemplateKey) return;
    setTemplateSaving(true);
    setTemplateStatus(null);
    apiClient
      .updateMailTemplate(selectedTemplateKey, templateContent)
      .then((response) => {
        const data = response?.data;
        if (!data) return;
        setTemplateDetails((prev) => ({ ...prev, [data.key]: data }));
        setTemplates((prev) =>
          prev.map((item) =>
            item.key === data.key
              ? { ...item, updated_at: data.updated_at }
              : item,
          ),
        );
        setTemplateCache((prev) => ({ ...prev, [data.path]: data.contents }));
        setOriginalTemplateContent(data.contents);
        setDebouncedContent(data.contents);
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
        setPreviewContext(parsed as Record<string, unknown>);
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

  const resetPreviewContext = () => {
    const site = brandingData?.resolved_site ?? brandingData?.site ?? null;
    const colors = brandingData?.resolved_colors ?? brandingData?.colors ?? null;
    const preview = createDefaultPreviewContext(site, colors);
    setPreviewContext(preview);
    setPreviewContextText(JSON.stringify(preview, null, 2));
    setPreviewContextError(null);
  };

  const isTemplateDirty = templateContent !== originalTemplateContent;

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

              <div>
                <Label htmlFor="twig-editor">Conținut Twig</Label>
                <textarea
                  id="twig-editor"
                  value={templateContent}
                  onChange={(event) => setTemplateContent(event.target.value)}
                  className="min-h-[360px] w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-[#191919] shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade"
                  placeholder="{% block body %}...{% endblock %}"
                  spellCheck={false}
                />
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
                <div className="max-h-[600px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
                  {previewHtml ? (
                    <div
                      className="mx-auto min-w-[320px] max-w-[720px] rounded-xl bg-white p-6 shadow"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <div className="text-sm text-gray-500">
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

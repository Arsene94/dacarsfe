"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgePercent, Calendar, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/table";
import { Popup } from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { formatDate, toIsoStringFromInput, toLocalDatetimeInputValue } from "@/lib/datetime";
import type { Column } from "@/types/ui";
import type { AdminOffer } from "@/types/admin";
import type { OfferPayload } from "@/types/offer";

const statusOptions: Array<{ value: AdminOffer["status"] | ""; label: string }> = [
    { value: "draft", label: "Draft" },
    { value: "scheduled", label: "Programată" },
    { value: "published", label: "Publicată" },
    { value: "archived", label: "Arhivată" },
];

const iconOptions: Array<{ value: NonNullable<AdminOffer["icon"]> | ""; label: string }> = [
    { value: "heart", label: "Inimă" },
    { value: "users", label: "Grup clienți" },
    { value: "gift", label: "Cadou" },
    { value: "calendar", label: "Calendar" },
];

const backgroundClassOptions: Array<{
    value: string;
    label: string;
    description: string;
    previewTextClass: string;
}> = [
    {
        value: "",
        label: "Implicit (alb curat)",
        description: "Ideal pentru oferte neutre și conținut bogat.",
        previewTextClass: "text-slate-900",
    },
    {
        value: "bg-berkeley-600",
        label: "Berkeley solid",
        description: "Fundal albastru intens pentru campanii premium.",
        previewTextClass: "text-white",
    },
    {
        value: "bg-gradient-to-br from-jade to-emerald-600",
        label: "Gradient jade",
        description: "Accentuează oferte verzi / eco cu un gradient dinamic.",
        previewTextClass: "text-white",
    },
    {
        value: "bg-rose-600",
        label: "Roșu intens",
        description: "Creează sentimentul de urgență pentru promoțiile limitate.",
        previewTextClass: "text-white",
    },
    {
        value: "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500",
        label: "Gradient aprins",
        description: "Atrage atenția cu un mix vibrant de roșu și portocaliu.",
        previewTextClass: "text-white",
    },
    {
        value: "bg-slate-900",
        label: "Slate întunecat",
        description: "Contrast puternic pentru oferte limitate sau VIP.",
        previewTextClass: "text-white",
    },
];

const textClassOptions: Array<{
    value: string;
    label: string;
    description: string;
}> = [
    {
        value: "",
        label: "Implicit (moștenire)",
        description: "Folosește culoarea stabilită de componenta publică.",
    },
    {
        value: "text-slate-900",
        label: "Text închis",
        description: "Contrast optim pe fundaluri deschise.",
    },
    {
        value: "text-slate-700",
        label: "Text mediu",
        description: "Ton mai cald pentru fundaluri pastel.",
    },
    {
        value: "text-white",
        label: "Text alb",
        description: "Se potrivește cu fundalurile puternic colorate.",
    },
    {
        value: "text-amber-100",
        label: "Text accent (chihlimbar)",
        description: "Scoate în evidență mesajele pe fundaluri închise.",
    },
    {
        value: "text-red-600",
        label: "Text roșu intens",
        description: "Potrivit pentru badge-uri de reducere și mesaje urgente.",
    },
    {
        value: "text-rose-100",
        label: "Text roșu deschis",
        description: "Completează fundalurile închise cu un ton cald, feminin.",
    },
];

const collectStringValues = (raw: unknown): string[] => {
    if (raw == null) {
        return [];
    }

    if (typeof raw === "string") {
        return raw
            .split(/[,;\n]+/)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }

    if (typeof raw === "number" || typeof raw === "boolean") {
        const normalized = String(raw).trim();
        return normalized.length > 0 ? [normalized] : [];
    }

    if (Array.isArray(raw)) {
        return raw.flatMap((entry) => collectStringValues(entry));
    }

    if (typeof raw === "object") {
        return collectStringValues(Object.values(raw as Record<string, unknown>));
    }

    return [];
};

const parseOptionalString = (value: unknown): string | undefined => {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        const normalized = String(value).trim();
        return normalized.length > 0 ? normalized : undefined;
    }
    return undefined;
};

const parseIcon = (value: unknown): AdminOffer["icon"] => {
    const candidate = parseOptionalString(value);
    if (!candidate) {
        return undefined;
    }
    const normalized = candidate.toLowerCase();
    if (["heart", "users", "gift", "calendar"].includes(normalized)) {
        return normalized as AdminOffer["icon"];
    }
    return undefined;
};

const parseStatus = (value: unknown): AdminOffer["status"] => {
    const candidate = parseOptionalString(value);
    if (!candidate) {
        return undefined;
    }
    const normalized = candidate.toLowerCase();
    switch (normalized) {
        case "draft":
        case "scheduled":
        case "published":
        case "archived":
            return normalized;
        default:
            return candidate as AdminOffer["status"];
    }
};

const parseDate = (value: unknown): string | undefined => {
    if (value == null) {
        return undefined;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    return undefined;
};

const parseClassName = (value: unknown): string | undefined => {
    const candidate = parseOptionalString(value);
    return candidate ?? undefined;
};

const normalizeOffer = (raw: unknown): AdminOffer | null => {
    if (!raw || typeof raw !== "object") {
        return null;
    }

    const source = raw as Record<string, unknown>;
    const idCandidate = source.id ?? (source as { offer_id?: unknown }).offer_id ?? (source as { value?: unknown }).value;
    const id = typeof idCandidate === "number" ? idCandidate : Number(idCandidate);
    if (!Number.isFinite(id)) {
        return null;
    }

    const titleValue =
        typeof source.title === "string"
            ? source.title
            : typeof source.name === "string"
                ? source.name
                : "";
    const title = titleValue.trim();
    if (!title) {
        return null;
    }

    const description = typeof source.description === "string" ? source.description : null;
    const discountLabel =
        typeof source.discount_label === "string"
            ? source.discount_label
            : typeof (source as { discountLabel?: unknown }).discountLabel === "string"
                ? (source as { discountLabel: string }).discountLabel
                : null;

    const features = collectStringValues(source.features ?? (source as { benefits?: unknown }).benefits);

    return {
        id,
        title,
        slug:
            typeof source.slug === "string" && source.slug.trim().length > 0
                ? source.slug
                : `oferta-${id}`,
        description,
        discount_label: discountLabel,
        badge: typeof source.badge === "string" ? source.badge : null,
        features,
        icon: parseIcon(source.icon ?? (source as { icon_name?: unknown }).icon_name),
        background_class: parseClassName(source.background_class ?? (source as { backgroundClass?: unknown }).backgroundClass),
        text_class: parseClassName(source.text_class ?? (source as { textClass?: unknown }).textClass),
        primary_cta_label: parseOptionalString(
            source.primary_cta_label ?? (source as { primaryCtaLabel?: unknown }).primaryCtaLabel ?? (source as { cta_label?: unknown }).cta_label,
        ),
        primary_cta_url: parseOptionalString(
            source.primary_cta_url ?? (source as { primaryCtaUrl?: unknown }).primaryCtaUrl ?? (source as { cta_url?: unknown }).cta_url,
        ),
        status: parseStatus(source.status),
        starts_at: parseDate(source.starts_at ?? (source as { start_at?: unknown }).start_at ?? (source as { available_from?: unknown }).available_from),
        ends_at: parseDate(source.ends_at ?? (source as { end_at?: unknown }).end_at ?? (source as { available_until?: unknown }).available_until),
        created_at: parseDate(source.created_at),
        updated_at: parseDate(source.updated_at),
    };
};

const formatStatusLabel = (status?: AdminOffer["status"] | null): string => {
    if (!status) {
        return "—";
    }
    switch (status) {
        case "draft":
            return "Draft";
        case "scheduled":
            return "Programată";
        case "published":
            return "Publicată";
        case "archived":
            return "Arhivată";
        default:
            return status;
    }
};

const formatPeriod = (startsAt?: string | null, endsAt?: string | null): string => {
    if (!startsAt && !endsAt) {
        return "Permanent";
    }
    if (startsAt && endsAt) {
        return `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
    }
    if (startsAt) {
        return `Din ${formatDate(startsAt)}`;
    }
    return `Până la ${formatDate(endsAt)}`;
};

const OffersAdminPage = () => {
    const [offers, setOffers] = useState<AdminOffer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);

    const [title, setTitle] = useState("");
    const [discountLabel, setDiscountLabel] = useState("");
    const [description, setDescription] = useState("");
    const [featuresInput, setFeaturesInput] = useState("");
    const [icon, setIcon] = useState<AdminOffer["icon"] | "">("heart");
    const [backgroundClass, setBackgroundClass] = useState("");
    const [textClass, setTextClass] = useState("");
    const [ctaLabel, setCtaLabel] = useState("");
    const [ctaUrl, setCtaUrl] = useState("");
    const [status, setStatus] = useState<AdminOffer["status"] | "">("draft");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    const loadOffers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.getOffers({ audience: "admin", perPage: 100, sort: "-updated_at" });
            const rawList = extractList(response);
            const normalized = rawList
                .map((entry) => normalizeOffer(entry))
                .filter((entry): entry is AdminOffer => entry !== null)
                .sort((a, b) => {
                    const left = a.updated_at ?? a.starts_at ?? "";
                    const right = b.updated_at ?? b.starts_at ?? "";
                    return right.localeCompare(left);
                });
            setOffers(normalized);
        } catch (error) {
            console.error("Nu am putut încărca ofertele", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOffers();
    }, [loadOffers]);

    const resetForm = () => {
        setTitle("");
        setDiscountLabel("");
        setDescription("");
        setFeaturesInput("");
        setIcon("heart");
        setBackgroundClass("");
        setTextClass("");
        setCtaLabel("");
        setCtaUrl("");
        setStatus("draft");
        setStartsAt("");
        setEndsAt("");
        setFormError(null);
        setEditingOffer(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (offer: AdminOffer) => {
        setEditingOffer(offer);
        setTitle(offer.title ?? "");
        setDiscountLabel(offer.discount_label ?? "");
        setDescription(offer.description ?? "");
        setFeaturesInput((offer.features ?? []).join("\n"));
        setIcon(offer.icon ?? "");
        setBackgroundClass(offer.background_class ?? "");
        setTextClass(offer.text_class ?? "");
        setCtaLabel(offer.primary_cta_label ?? "");
        setCtaUrl(offer.primary_cta_url ?? "");
        setStatus(offer.status ?? "");
        setStartsAt(toLocalDatetimeInputValue(offer.starts_at));
        setEndsAt(toLocalDatetimeInputValue(offer.ends_at));
        setFormError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsSaving(false);
        setFormError(null);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSaving) {
            return;
        }

        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setFormError("Introdu un titlu pentru ofertă.");
            return;
        }

        const selectedStatus = status && status.toString().trim().length > 0 ? (status as AdminOffer["status"]) : undefined;
        const features = collectStringValues(featuresInput);
        const startsAtIso = toIsoStringFromInput(startsAt);
        const endsAtIso = toIsoStringFromInput(endsAt);

        const payload: OfferPayload = {
            title: trimmedTitle,
            discount_label: discountLabel.trim() ? discountLabel.trim() : null,
            description: description.trim() ? description.trim() : null,
            features: features.length > 0 ? features : [],
            icon: icon && icon.toString().length > 0 ? (icon as NonNullable<AdminOffer["icon"]>) : null,
            background_class: backgroundClass.trim() ? backgroundClass.trim() : null,
            text_class: textClass.trim() ? textClass.trim() : null,
            primary_cta_label: ctaLabel.trim() ? ctaLabel.trim() : null,
            primary_cta_url: ctaUrl.trim() ? ctaUrl.trim() : null,
            status: selectedStatus ?? null,
            starts_at: startsAtIso,
            ends_at: endsAtIso,
        };

        setIsSaving(true);
        setFormError(null);

        try {
            if (editingOffer) {
                await apiClient.updateOffer(editingOffer.id, payload);
            } else {
                await apiClient.createOffer(payload);
            }
            await loadOffers();
            closeModal();
            resetForm();
        } catch (error) {
            console.error("Nu am putut salva oferta", error);
            setFormError("A apărut o eroare la salvare. Încearcă din nou.");
        } finally {
            setIsSaving(false);
        }
    };

    const columns: Column<AdminOffer>[] = useMemo(
        () => [
            {
                id: "title",
                header: "Titlu",
                accessor: (row) => row.title,
                sortable: true,
            },
            {
                id: "discount",
                header: "Beneficiu",
                accessor: (row) => row.discount_label ?? "",
                sortable: true,
                cell: (row) => row.discount_label ?? "—",
            },
            {
                id: "status",
                header: "Status",
                accessor: (row) => row.status ?? "",
                sortable: true,
                cell: (row) => formatStatusLabel(row.status),
            },
            {
                id: "period",
                header: "Perioadă",
                accessor: (row) => row.starts_at ?? row.ends_at ?? "",
                cell: (row) => formatPeriod(row.starts_at, row.ends_at),
            },
            {
                id: "actions",
                header: "Acțiuni",
                accessor: () => "",
                cell: (row) => (
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(row);
                        }}
                        aria-label={`Editează ${row.title}`}
                        className="text-jade hover:text-jadeLight"
                    >
                        <Edit className="h-4 w-4" />
                    </button>
                ),
            },
        ],
        [],
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-berkeley">Gestionare oferte</h1>
                    <p className="text-sm text-gray-600">
                        Configurează pachete promoționale pentru landing page și pagina publică de oferte.
                    </p>
                </div>
                <Button onClick={openAddModal} className="self-start sm:self-auto">
                    <Plus className="mr-2 h-4 w-4" /> Adaugă ofertă
                </Button>
            </div>

            {isLoading ? (
                <div className="rounded-lg border border-dashed border-berkeley/30 p-6 text-center text-sm text-berkeley">
                    Se încarcă lista de oferte...
                </div>
            ) : (
                <DataTable
                    data={offers}
                    columns={columns}
                    renderRowDetails={(offer) => (
                        <div className="space-y-3 text-sm text-gray-700">
                            {offer.description && <p>{offer.description}</p>}
                            {offer.features && offer.features.length > 0 && (
                                <div>
                                    <p className="font-medium">Beneficii incluse:</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5">
                                        {offer.features.map((feature, index) => (
                                            <li key={`${offer.id}-feature-${index}`}>{feature}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                {offer.primary_cta_label && (
                                    <span className="inline-flex items-center gap-1">
                                        <BadgePercent className="h-3 w-3" /> {offer.primary_cta_label}
                                    </span>
                                )}
                                {offer.primary_cta_url && (
                                    <span className="inline-flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> {offer.primary_cta_url}
                                    </span>
                                )}
                                {offer.background_class && <span>Fundal: {offer.background_class}</span>}
                                {offer.text_class && <span>Text: {offer.text_class}</span>}
                            </div>
                        </div>
                    )}
                />
            )}

            <Popup open={isModalOpen} onClose={closeModal} className="max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {editingOffer ? "Editează oferta" : "Adaugă ofertă"}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Completează detaliile afișate în landing și pagina publică.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <Label htmlFor="offer-title">Titlu</Label>
                            <Input
                                id="offer-title"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="Ex: Weekend fără garanție"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="offer-discount">Beneficiu</Label>
                            <Input
                                id="offer-discount"
                                value={discountLabel}
                                onChange={(event) => setDiscountLabel(event.target.value)}
                                placeholder="Ex: -20% la rezervare"
                            />
                        </div>
                        <div>
                            <Label htmlFor="offer-status">Status</Label>
                            <Select
                                id="offer-status"
                                value={status ?? ""}
                                onChange={(event) => setStatus(event.target.value as AdminOffer["status"] | "")}
                            >
                                <option value="">Selectează statusul</option>
                                {statusOptions.map((option) => (
                                    <option key={option.value ?? "none"} value={option.value ?? ""}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="offer-icon">Pictogramă</Label>
                            <Select
                                id="offer-icon"
                                value={icon ?? ""}
                                onChange={(event) => setIcon(event.target.value as AdminOffer["icon"] | "")}
                            >
                                <option value="">Selectează pictograma</option>
                                {iconOptions.map((option) => (
                                    <option key={option.value ?? "none"} value={option.value ?? ""}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <fieldset>
                            <legend className="text-sm font-semibold text-slate-900">Stil fundal</legend>
                            <p className="mt-1 text-xs text-slate-500">
                                Selectează rapid fundalul promoției. Poți reveni oricând la varianta implicită.
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {backgroundClassOptions.map((option) => {
                                    const isSelected = backgroundClass === option.value;
                                    return (
                                        <button
                                            key={option.value || "default"}
                                            type="button"
                                            onClick={() => setBackgroundClass(option.value)}
                                            aria-pressed={isSelected}
                                            className={cn(
                                                "flex h-full flex-col rounded-lg border p-4 text-left transition",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berkeley-500 focus-visible:ring-offset-2",
                                                isSelected
                                                    ? "border-berkeley-500 ring-2 ring-berkeley-500"
                                                    : "border-slate-200 hover:border-berkeley-400",
                                            )}
                                        >
                                            <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                                            <span
                                                className={cn(
                                                    "mt-3 block rounded-md px-3 py-2 text-sm font-semibold shadow-sm",
                                                    option.value ? option.value : "bg-white",
                                                    option.previewTextClass,
                                                )}
                                            >
                                                Oferta DaCars
                                            </span>
                                            <span className="mt-3 text-xs text-slate-600">{option.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {backgroundClass &&
                                !backgroundClassOptions.some((option) => option.value === backgroundClass) && (
                                    <p className="mt-2 text-xs text-amber-600">
                                        Clasa personalizată „{backgroundClass}” va fi păstrată la salvare.
                                    </p>
                                )}
                        </fieldset>
                        <fieldset>
                            <legend className="text-sm font-semibold text-slate-900">Stil text</legend>
                            <p className="mt-1 text-xs text-slate-500">
                                Ajustează culoarea mesajului pentru a avea lizibilitate excelentă pe fundalul ales.
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {textClassOptions.map((option) => {
                                    const isSelected = textClass === option.value;
                                    return (
                                        <button
                                            key={option.value || "default"}
                                            type="button"
                                            onClick={() => setTextClass(option.value)}
                                            aria-pressed={isSelected}
                                            className={cn(
                                                "flex h-full flex-col rounded-lg border p-4 text-left transition",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-berkeley-500 focus-visible:ring-offset-2",
                                                isSelected
                                                    ? "border-berkeley-500 ring-2 ring-berkeley-500"
                                                    : "border-slate-200 hover:border-berkeley-400",
                                            )}
                                        >
                                            <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                                            <span
                                                className={cn(
                                                    "mt-3 block rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm font-medium",
                                                    option.value || "text-slate-900",
                                                )}
                                            >
                                                Oferta DaCars
                                            </span>
                                            <span className="mt-3 text-xs text-slate-600">{option.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {textClass && !textClassOptions.some((option) => option.value === textClass) && (
                                <p className="mt-2 text-xs text-amber-600">
                                    Clasa personalizată „{textClass}” va fi păstrată la salvare.
                                </p>
                            )}
                        </fieldset>
                        <div>
                            <Label htmlFor="offer-cta-label">Text buton</Label>
                            <Input
                                id="offer-cta-label"
                                value={ctaLabel}
                                onChange={(event) => setCtaLabel(event.target.value)}
                                placeholder="Ex: Rezervă acum"
                            />
                        </div>
                        <div>
                            <Label htmlFor="offer-cta-url">URL buton</Label>
                            <Input
                                id="offer-cta-url"
                                value={ctaUrl}
                                onChange={(event) => setCtaUrl(event.target.value)}
                                placeholder="Ex: /checkout"
                            />
                        </div>
                        <div>
                            <Label htmlFor="offer-start">Disponibilă de la</Label>
                            <Input
                                id="offer-start"
                                type="datetime-local"
                                value={startsAt}
                                onChange={(event) => setStartsAt(event.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="offer-end">Disponibilă până la</Label>
                            <Input
                                id="offer-end"
                                type="datetime-local"
                                value={endsAt}
                                onChange={(event) => setEndsAt(event.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="offer-description">Descriere</Label>
                            <Textarea
                                id="offer-description"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={4}
                                placeholder="Detalii despre condițiile promoției"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="offer-features">Beneficii (unul pe linie)</Label>
                            <Textarea
                                id="offer-features"
                                value={featuresInput}
                                onChange={(event) => setFeaturesInput(event.target.value)}
                                rows={4}
                                placeholder={"Transfer gratuit\nKilometraj nelimitat"}
                            />
                        </div>
                    </div>

                    {formError && (
                        <p className="text-sm text-red-500" role="alert">
                            {formError}
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={closeModal} disabled={isSaving}>
                            Anulează
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? "Se salvează..." : "Salvează"}
                        </Button>
                    </div>
                </form>
            </Popup>
        </div>
    );
};

export default OffersAdminPage;

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useBooking } from "@/context/useBooking";
import { apiClient } from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import { trackMixpanelEvent } from "@/lib/mixpanelClient";
import { trackTikTokEvent, TIKTOK_EVENTS } from "@/lib/tiktokPixel";
import type { ApiListResult } from "@/types/api";
import type { CarCategory } from "@/types/car";

type ExtendedWindow = Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
};

const scheduleIdleTask = (task: () => void) => {
    if (typeof window === "undefined") {
        task();
        return () => {};
    }

    const { requestIdleCallback, cancelIdleCallback } = window as ExtendedWindow;

    if (typeof requestIdleCallback === "function") {
        const handle = requestIdleCallback(() => {
            task();
        });

        return () => {
            cancelIdleCallback?.(handle);
        };
    }

    const timeout = window.setTimeout(task, 150);

    return () => {
        window.clearTimeout(timeout);
    };
};

export type LocationOption = {
    value?: string;
    label?: string;
};

export type HeroBookingFormProps = {
    labels: Record<string, string>;
    placeholders: Record<string, string>;
    ariaLabels?: Record<string, string>;
    submitLabel: string;
    locale: string;
    locations: LocationOption[];
};

type HeroFormState = {
    start_date: string;
    end_date: string;
    location: string;
    car_type: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const formatDate = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const HeroBookingForm = ({
    labels,
    placeholders,
    ariaLabels,
    submitLabel,
    locale,
    locations,
}: HeroBookingFormProps) => {
    const resolvedLocations = useMemo(() => {
        return locations.length > 0
            ? locations
            : [{ value: "otopeni", label: "Aeroport Otopeni" }];
    }, [locations]);

    const [defaultDateRange, setDefaultDateRange] = useState<{ pickup: string; ret: string }>(() => ({
        pickup: "",
        ret: "",
    }));

    const [formData, setFormData] = useState<HeroFormState>(() => ({
        start_date: "",
        end_date: "",
        location: resolvedLocations[0]?.value ?? "otopeni",
        car_type: "",
    }));
    const { booking, setBooking } = useBooking();
    const [categories, setCategories] = useState<CarCategory[]>([]);
    const router = useRouter();

    const hasSyncedInitialBooking = useRef(false);

    useEffect(() => {
        if (resolvedLocations.length === 0) {
            return;
        }

        setFormData((previous) => {
            if (previous.location && resolvedLocations.some((option) => option.value === previous.location)) {
                return previous;
            }

            return {
                ...previous,
                location: resolvedLocations[0]?.value ?? "otopeni",
            };
        });
    }, [resolvedLocations]);

    useEffect(() => {
        const now = new Date();
        const pickup = formatDate(now);
        const ret = formatDate(addDays(now, 1));

        setDefaultDateRange({ pickup, ret });

        setFormData((previous) => ({
            ...previous,
            start_date: previous.start_date || pickup,
            end_date: previous.end_date || ret,
        }));
    }, []);

    const minstart_date = defaultDateRange.pickup;

    const minend_date = formData.start_date
        ? formatDate(startOfDay(addDays(new Date(formData.start_date), 1)))
        : defaultDateRange.ret;

    useEffect(() => {
        if (!formData.start_date || !formData.end_date) {
            return;
        }

        const pickup = formData.start_date;
        const dropoff = formData.end_date;

        if (!hasSyncedInitialBooking.current) {
            hasSyncedInitialBooking.current = true;
            return;
        }

        if (booking.startDate === pickup && booking.endDate === dropoff) {
            return;
        }

        setBooking({
            ...booking,
            startDate: pickup,
            endDate: dropoff,
        });

        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("booking:dates-adjusted", {
                    detail: { startDate: pickup, endDate: dropoff },
                }),
            );
        }
    }, [booking, formData.end_date, formData.start_date, setBooking]);

    useEffect(() => {
        let cancelled = false;
        let cancelIdleFetch = () => {};

        const getCategories = async () => {
            try {
                const res = await apiClient.getCarCategories({ language: locale });
                const list = extractList<Record<string, unknown>>(
                    res as ApiListResult<Record<string, unknown>>,
                );

                const normalized: Array<{
                    id: number;
                    name: string;
                    order?: number;
                    status?: string | null;
                }> = [];

                list.forEach((entry) => {
                    if (!isRecord(entry)) return;
                    const idCandidate = entry.id ?? entry.value ?? entry.key;
                    const id = Number(idCandidate);
                    if (!Number.isFinite(id)) return;
                    const nameSource = entry.name ?? entry.title ?? entry.label;
                    if (typeof nameSource !== "string" || nameSource.trim().length === 0) return;
                    normalized.push({
                        id,
                        name: nameSource.trim(),
                        order:
                            typeof entry.order === "number"
                                ? entry.order
                                : Number.isFinite(Number(entry.order))
                                    ? Number(entry.order)
                                    : undefined,
                        status:
                            typeof entry.status === "string"
                                ? entry.status
                                : null,
                    });
                });

                if (
                    normalized.length === 0 &&
                    isRecord(res) &&
                    !("data" in res) &&
                    !("items" in res) &&
                    !("results" in res) &&
                    !("payload" in res)
                ) {
                    Object.entries(res).forEach(([id, name]) => {
                        const numericId = Number(id);
                        if (!Number.isFinite(numericId)) return;
                        const title = typeof name === "string" ? name : String(name);
                        if (title.trim().length === 0) return;
                        normalized.push({ id: numericId, name: title.trim() });
                    });
                }

                const cat: CarCategory[] = normalized
                    .filter((item) => !item.status || item.status === "published")
                    .map(({ id, name, order }) => ({ id, name, order }));

                cat.sort((a, b) => {
                    const ao = a.order ?? Number.POSITIVE_INFINITY;
                    const bo = b.order ?? Number.POSITIVE_INFINITY;
                    return ao - bo || a.id - b.id;
                });

                if (!cancelled) {
                    setCategories(cat);
                }
            } catch (error) {
                if (process.env.NODE_ENV !== "production") {
                    console.error(
                        "Nu am putut încărca categoriile pentru formularul hero",
                        error,
                    );
                }
            }
        };

        cancelIdleFetch = scheduleIdleTask(() => {
            void getCategories();
        });

        return () => {
            cancelled = true;
            cancelIdleFetch();
        };
    }, [locale]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (field: "location" | "car_type") => (value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const params = new URLSearchParams({
            start_date: formData.start_date,
            end_date: formData.end_date,
        });

        if (formData.location && formData.location.length > 0) {
            params.set("location", formData.location);
        }

        if (formData.car_type && formData.car_type.length > 0) {
            params.set("car_type", formData.car_type);
        }

        try {
            trackMixpanelEvent("hero_form_submit", {
                start_date: formData.start_date,
                end_date: formData.end_date,
                location: formData.location,
                car_type: formData.car_type,
            });

            trackTikTokEvent(TIKTOK_EVENTS.SUBMIT_FORM, {
                contents: [
                    {
                        content_id: "hero_booking_form",
                        content_name: "booking", // eslint-disable-line camelcase -- cerință pixel TikTok
                    },
                ],
            });
        } catch (error) {
            if (process.env.NODE_ENV !== "production") {
                console.error(
                    "Nu am putut trimite evenimentele de tracking pentru formularul hero",
                    error,
                );
            }
        }

        router.push(`/cars?${params.toString()}`);
    };

    const fieldWrapperClass = "space-y-2 w-full";
    const controlClass = "h-12 w-full text-sm sm:text-base min-h-[3rem] max-h-[3rem]";
    const dateTimeControlClass = `${controlClass} pl-10 pr-4 datetime-field`;
    const selectControlClass = `${controlClass} pl-10 pr-10 text-[#191919]`;

    return (
        <form onSubmit={handleSubmit} className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className={fieldWrapperClass}>
                <Label
                    htmlFor="hero-pickup-date"
                    className="text-sm text-white font-medium font-['DM_Sans']"
                >
                    {labels.pickup ?? "Data ridicare"}
                </Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="hero-pickup-date"
                        type="datetime-local"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        min={minstart_date || undefined}
                        className={`${dateTimeControlClass} appearance-none flex items-center`}
                        style={{
                            minHeight: "3rem",
                            maxHeight: "3rem",
                            height: "3rem",
                            lineHeight: "1.5",
                        }}
                    />
                </div>
            </div>

            <div className={fieldWrapperClass}>
                <Label
                    htmlFor="hero-return-date"
                    className="text-sm text-white font-medium font-['DM_Sans']"
                >
                    {labels.return ?? "Data returnare"}
                </Label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                        id="hero-return-date"
                        type="datetime-local"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        min={minend_date || undefined}
                        className={`${dateTimeControlClass} appearance-none flex items-center`}
                        style={{
                            minHeight: "3rem",
                            maxHeight: "3rem",
                            height: "3rem",
                            lineHeight: "1.5",
                        }}
                    />
                </div>
            </div>

            <div className={fieldWrapperClass}>
                <Label
                    htmlFor="hero-location"
                    className="text-sm text-white font-medium font-['DM_Sans']"
                >
                    {labels.location ?? "Locația"}
                </Label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Select
                        id="hero-location"
                        className={selectControlClass}
                        value={formData.location}
                        onValueChange={handleSelectChange("location")}
                        placeholder={placeholders.location ?? "Alege locația"}
                        style={{
                            minHeight: "3rem",
                            maxHeight: "3rem",
                            height: "3rem",
                            lineHeight: "1.5",
                        }}
                    >
                        {resolvedLocations.map((option) => (
                            <option key={option.value ?? "default"} value={option.value ?? ""}>
                                {option.label ?? option.value}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <div className={fieldWrapperClass}>
                <Label
                    htmlFor="hero-car-type"
                    className="text-sm text-white font-medium font-['DM_Sans']"
                >
                    {labels.carType ?? "Tip mașină"}
                </Label>
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Select
                        id="hero-car-type"
                        className={selectControlClass}
                        value={formData.car_type}
                        onValueChange={handleSelectChange("car_type")}
                        style={{
                            minHeight: "3rem",
                            maxHeight: "3rem",
                            height: "3rem",
                            lineHeight: "1.5",
                        }}
                    >
                        <option value="">{placeholders.carType ?? "Toate tipurile"}</option>
                        {categories?.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <Button
                type="submit"
                className="px-6 py-3 self-end"
                aria-label={ariaLabels?.submit ?? submitLabel}
            >
                {submitLabel}
            </Button>
        </form>
    );
};

export default HeroBookingForm;

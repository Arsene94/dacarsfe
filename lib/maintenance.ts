import apiClient from "@/lib/api";
import type { MaintenanceSettings } from "@/types/settings";

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const normalizeAllowPaths = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .map((entry) => (isNonEmptyString(entry) ? entry.trim() : null))
            .filter((entry): entry is string => Boolean(entry));
    }

    return [];
};

export const normalizeMaintenanceSettings = (value: unknown): MaintenanceSettings | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const payload = value as MaintenanceSettings & Record<string, unknown>;

    return {
        enabled: Boolean(payload.enabled),
        message: isNonEmptyString(payload.message) ? payload.message.trim() : null,
        resume_at: isNonEmptyString(payload.resume_at) ? payload.resume_at : null,
        updated_at: isNonEmptyString(payload.updated_at) ? payload.updated_at : null,
        updated_by: isNonEmptyString(payload.updated_by) ? payload.updated_by : null,
        allow_paths: normalizeAllowPaths(payload.allow_paths),
    };
};

export const fetchMaintenanceSettings = async (): Promise<MaintenanceSettings | null> => {
    try {
        const response = await apiClient.getMaintenanceSettings();
        if (response && typeof response === "object" && "data" in response) {
            const payload = (response as { data?: unknown }).data;
            return normalizeMaintenanceSettings(payload);
        }
    } catch (error) {
        console.error("Nu s-au putut încărca setările de mentenanță", error);
    }

    return null;
};

export const formatDateTimeInputValue = (value: string | null | undefined): string => {
    if (!isNonEmptyString(value)) {
        return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const pad = (input: number) => input.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const toIsoStringOrNull = (value: string | null | undefined): string | null => {
    if (!isNonEmptyString(value)) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
};

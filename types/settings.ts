export interface MaintenanceSettings {
    enabled: boolean;
    message?: string | null;
    resume_at?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
    allow_paths?: string[] | null;
}

export interface MaintenanceSettingsResponse {
    data: MaintenanceSettings;
}

export type MaintenanceSettingsPayload = Partial<{
    enabled: boolean;
    message: string | null;
    resume_at: string | null;
    allow_paths: string[] | null;
}>;

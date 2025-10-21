export type AnalyticsDeviceInfo = {
    width?: number;
    height?: number;
    platform?: string;
    language?: string;
    timezone?: string;
};

export type AnalyticsMetadata = {
    scroll_percentage?: number;
    scroll_pixels?: number;
    duration_ms?: number;
    interaction_target?: string;
    interaction_label?: string;
    additional?: Record<string, unknown> | null;
} & Record<string, unknown>;

export type AnalyticsEventInput = {
    type: string;
    occurredAt?: Date | string;
    pageUrl?: string;
    referrerUrl?: string | null;
    metadata?: AnalyticsMetadata | null;
    includeDevice?: boolean;
};

export type AnalyticsQueuedEvent = {
    type: string;
    occurred_at: string;
    page_url: string;
    referrer_url?: string | null;
    metadata?: AnalyticsMetadata;
    device?: AnalyticsDeviceInfo;
};

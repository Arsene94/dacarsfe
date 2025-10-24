export interface MarketingOverview {
    total_customers: number;
    retention_rate: number;
    average_LTV: number;
    average_rating: number;
}

export type MarketingOverviewApi = Partial<
    Record<
        | 'total_customers'
        | 'totalCustomers'
        | 'customers'
        | 'clients'
        | 'total_clients'
        | 'totalClients',
        number | string
    >
> &
    Partial<
        Record<
            | 'retention_rate'
            | 'retentionRate'
            | 'retention'
            | 'retained_customers'
            | 'retention_percent',
            number | string
        >
    > &
    Partial<
        Record<
            | 'average_LTV'
            | 'averageLTV'
            | 'ltv'
            | 'avg_ltv'
            | 'lifetime_value'
            | 'average_customer_value',
            number | string
        >
    > &
    Partial<
        Record<
            | 'average_rating'
            | 'avg_rating'
            | 'rating'
            | 'satisfaction_score'
            | 'nps'
            | 'csat',
            number | string
        >
    > &
    Record<string, unknown>;

export interface MarketingChannelPerformance {
    id: number | string;
    channel: string;
    bookings: number;
    avg_revenue: number | null;
    total_revenue: number | null;
    conversion_rate: number;
    CPA: number | null;
    cost_per_lead: number | null;
}

export type MarketingChannelApi = Partial<
    Record<'id' | 'channel_id' | 'source_id' | 'uuid', number | string>
> &
    Partial<
        Record<
            | 'channel'
            | 'source'
            | 'name'
            | 'label'
            | 'utm_source'
            | 'utmSource',
            string
        >
    > &
    Partial<
        Record<
            | 'bookings'
            | 'booking_count'
            | 'bookingCount'
            | 'reservations'
            | 'total_bookings'
            | 'conversions'
            | 'leads',
            number | string
        >
    > &
    Partial<
        Record<
            | 'avg_revenue'
            | 'average_revenue'
            | 'averageRevenue'
            | 'average_value'
            | 'avg_value'
            | 'averageValue',
            number | string
        >
    > &
    Partial<
        Record<
            | 'total_revenue'
            | 'revenue'
            | 'totalRevenue'
            | 'revenue_total'
            | 'revenueTotal',
            number | string
        >
    > &
    Partial<
        Record<
            | 'conversion_rate'
            | 'conversionRate'
            | 'conversion'
            | 'rate'
            | 'retention_rate'
            | 'retentionRate',
            number | string
        >
    > &
    Partial<
        Record<'CPA' | 'cpa' | 'cost_per_acquisition' | 'cost', number | string>
    > &
    Partial<
        Record<'cost_per_lead' | 'CPL' | 'cpl', number | string>
    > &
    Record<string, unknown>;

export interface MarketingRetentionPoint {
    id: number | string;
    label: string;
    retention_rate: number;
    period?: string | null;
}

export type MarketingRetentionPointApi = Partial<
    Record<'id' | 'period_id' | 'uuid' | 'period', number | string>
> &
    Partial<
        Record<'label' | 'name' | 'title' | 'period_label' | 'date_label', string>
    > &
    Partial<
        Record<'date' | 'day' | 'week' | 'month' | 'timestamp', string>
    > &
    Partial<
        Record<
            | 'retention_rate'
            | 'retentionRate'
            | 'retention'
            | 'rate'
            | 'value'
            | 'percentage',
            number | string
        >
    > &
    Record<string, unknown>;

export type MarketingSourcesResponse =
    | Array<MarketingChannelApi | MarketingRetentionPointApi>
    | {
          top_channels?: MarketingChannelApi[] | null;
          channels?: MarketingChannelApi[] | null;
          sources?: MarketingChannelApi[] | null;
          performance?: MarketingChannelApi[] | null;
          data?: MarketingChannelApi[] | MarketingRetentionPointApi[] | null;
          retention?: MarketingRetentionPointApi[] | null;
          retention_trend?: MarketingRetentionPointApi[] | null;
          retention_trends?: MarketingRetentionPointApi[] | null;
          retention_series?: MarketingRetentionPointApi[] | null;
          [key: string]: unknown;
      }
    | null
    | undefined;

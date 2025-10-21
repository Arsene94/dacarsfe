import type { ApiLinks, ApiMeta } from './api';

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

export type AnalyticsDateRange = {
  from: string;
  to: string;
  days?: number | null;
};

export type AdminAnalyticsSummaryParams = {
  from?: string;
  to?: string;
  days?: number;
};

export type AdminAnalyticsTopPagesParams = AdminAnalyticsSummaryParams & {
  limit?: number;
  event_type?: string;
};

export type AdminAnalyticsVisitorsParams = AdminAnalyticsSummaryParams & {
  per_page?: number;
  page?: number;
};

export type AdminAnalyticsVisitorDetailParams = AdminAnalyticsSummaryParams & {
  limit?: number;
};

export type AdminAnalyticsEventsParams = AdminAnalyticsSummaryParams & {
  visitor_uuid?: string;
  session_uuid?: string;
  event_type?: string;
  page_url?: string;
  per_page?: number;
  page?: number;
};

export type AdminAnalyticsTopPage = {
  page_url: string;
  total_events: number;
  unique_visitors?: number;
  share?: number;
};

export type AdminAnalyticsEventTypeStat = {
  type: string;
  total_events: number;
  share?: number;
  unique_visitors?: number;
};

export type AdminAnalyticsDailyActivityPoint = {
  date: string;
  events: number;
  visitors: number;
};

export type AdminAnalyticsScrollStats = {
  average_percentage?: number | null;
  max_percentage?: number | null;
  average_pixels?: number | null;
  max_pixels?: number | null;
  total_events: number;
};

export type AdminAnalyticsSummaryTotals = {
  events: number;
  unique_visitors: number;
  unique_sessions: number;
  average_events_per_visitor: number;
  average_events_per_session: number;
};

export type AdminAnalyticsSummaryResponse = {
  range: AnalyticsDateRange;
  totals: AdminAnalyticsSummaryTotals;
  events_by_type: AdminAnalyticsEventTypeStat[];
  daily_activity: AdminAnalyticsDailyActivityPoint[];
  top_pages: AdminAnalyticsTopPage[];
  scroll: AdminAnalyticsScrollStats;
};

export type AdminAnalyticsTopPagesResponse = {
  range: AnalyticsDateRange;
  event_type?: string | null;
  pages: AdminAnalyticsTopPage[];
};

export type AdminAnalyticsVisitorSummary = {
  visitor_uuid: string;
  total_events: number;
  total_sessions: number;
  first_seen: string;
  last_seen: string;
};

export type AdminAnalyticsVisitorsResponse = {
  range: AnalyticsDateRange;
  data: AdminAnalyticsVisitorSummary[];
  meta?: ApiMeta;
  links?: ApiLinks;
};

export type AdminAnalyticsVisitorSession = {
  session_uuid: string;
  first_seen: string;
  last_seen: string;
  events: number;
};

export type AdminAnalyticsVisitorPageStat = {
  page_url: string;
  total_events: number;
};

export type AdminAnalyticsVisitorDetailTotals = {
  events: number;
  pages: number;
  first_seen: string;
  last_seen: string;
};

export type AdminAnalyticsVisitorDetailResponse = {
  visitor_uuid: string;
  range: AnalyticsDateRange;
  totals: AdminAnalyticsVisitorDetailTotals;
  events_by_type: AdminAnalyticsEventTypeStat[];
  pages: AdminAnalyticsVisitorPageStat[];
  sessions: AdminAnalyticsVisitorSession[];
  recent_events: AdminAnalyticsEvent[];
};

export type AdminAnalyticsEventScroll = {
  percentage?: number | null;
  pixels?: number | null;
};

export type AdminAnalyticsEvent = {
  id: number;
  visitor_uuid: string;
  session_uuid?: string | null;
  event_type: string;
  page_url: string;
  referrer_url?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  metadata?: AnalyticsMetadata | null;
  device?: AnalyticsDeviceInfo | null;
  occurred_at: string;
  created_at?: string;
  updated_at?: string;
  duration_ms?: number | null;
  scroll?: AdminAnalyticsEventScroll | null;
};

export type AdminAnalyticsEventDetailResponse = AdminAnalyticsEvent;

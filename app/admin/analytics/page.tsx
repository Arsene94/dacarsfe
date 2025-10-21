"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Loader2, RefreshCw, Search, Target, Users } from "lucide-react";
import apiClient from "@/lib/api";
import { extractList } from "@/lib/apiResponse";
import SummaryCards from "@/components/admin/analytics/SummaryCards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popup } from "@/components/ui/popup";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import type { Column } from "@/types/ui";
import type { ApiListResult, ApiMeta } from "@/types/api";
import type {
  AdminAnalyticsEvent,
  AdminAnalyticsEventTypeStat,
  AdminAnalyticsSummaryResponse,
  AdminAnalyticsTopPage,
  AdminAnalyticsTopPagesResponse,
  AdminAnalyticsVisitorDetailResponse,
  AdminAnalyticsVisitorSummary,
  AdminAnalyticsVisitorsResponse,
  AnalyticsDateRange,
} from "@/types/analytics";

const DEFAULT_DAYS = 7;
const EVENTS_PER_PAGE = 25;
const VISITORS_PER_PAGE = 10;

const dateTimeFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat("ro-RO", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 0,
});

const shareFormatter = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const toIsoString = (value: string): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const extractListAndMeta = <T,>(result: ApiListResult<T>): { data: T[]; meta?: ApiMeta } => {
  if (Array.isArray(result)) {
    return { data: result };
  }
  const data = extractList(result);
  const container = result as Record<string, unknown>;
  const metaCandidate = (container.meta ?? container.pagination) as ApiMeta | undefined;
  if (metaCandidate && typeof metaCandidate === "object") {
    return { data, meta: metaCandidate };
  }
  const fallback: ApiMeta = {};
  let hasMeta = false;
  const copyNumeric = (key: keyof ApiMeta) => {
    const value = container[key as string];
    if (typeof value === "number") {
      fallback[key] = value;
      hasMeta = true;
    }
  };
  copyNumeric("current_page");
  copyNumeric("currentPage");
  copyNumeric("per_page");
  copyNumeric("perPage");
  copyNumeric("total");
  copyNumeric("last_page");
  copyNumeric("lastPage");
  return { data, meta: hasMeta ? fallback : undefined };
};

const getMetaNumber = (meta: ApiMeta | undefined, keys: readonly string[]): number | null => {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const resolvePageCount = (meta: ApiMeta | undefined): number | null => {
  const last = getMetaNumber(meta, ["last_page", "lastPage"]);
  if (last && last > 0) return last;
  const total = getMetaNumber(meta, ["total"]);
  const perPage = getMetaNumber(meta, ["per_page", "perPage"]);
  if (total && perPage) {
    return Math.max(1, Math.ceil(total / perPage));
  }
  return null;
};

const formatDateTime = (value: string | null | undefined, fallback = "—"): string => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateTimeFormatter.format(parsed);
};

const formatShortDateTime = (value: string | null | undefined, fallback = "—"): string => {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : shortDateFormatter.format(parsed);
};

const buildScrollLabel = (event: AdminAnalyticsEvent): string => {
  const percentage = event.scroll?.percentage;
  const pixels = event.scroll?.pixels;
  if (typeof percentage === "number" && Number.isFinite(percentage)) {
    return `${percentage.toFixed(1)}%`;
  }
  if (typeof pixels === "number" && Number.isFinite(pixels)) {
    return `${Math.round(pixels)} px`;
  }
  return "—";
};

const formatDuration = (durationMs: number | null | undefined): string => {
  if (typeof durationMs !== "number" || Number.isNaN(durationMs) || durationMs <= 0) {
    return "—";
  }
  return `${(durationMs / 1000).toFixed(1)} s`;
};

type EventFilterState = {
  visitorUuid: string;
  sessionUuid: string;
  pageUrl: string;
  eventType: string;
};

const emptyMetadataFallback = "{ }";

const serializeMetadata = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return emptyMetadataFallback;
  }
  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error) {
    console.warn("Nu am putut serializa metadata analytics", error);
    return emptyMetadataFallback;
  }
};

const describeDevice = (device: Record<string, unknown> | null | undefined): string => {
  if (!device || Object.keys(device).length === 0) {
    return "Dispozitiv necunoscut";
  }
  const parts: string[] = [];
  if (typeof device.platform === "string" && device.platform.trim().length > 0) {
    parts.push(device.platform.trim());
  }
  if (typeof device.width === "number" && typeof device.height === "number") {
    parts.push(`${device.width}×${device.height}px`);
  }
  if (typeof device.language === "string" && device.language.trim().length > 0) {
    parts.push(device.language.trim());
  }
  if (typeof device.timezone === "string" && device.timezone.trim().length > 0) {
    parts.push(device.timezone.trim());
  }
  return parts.length > 0 ? parts.join(" • ") : "Dispozitiv necunoscut";
};

export default function AdminAnalyticsPage() {
  const [rangePreset, setRangePreset] = useState<string>(String(DEFAULT_DAYS));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [topPagesEventType, setTopPagesEventType] = useState("");

  const [summary, setSummary] = useState<AdminAnalyticsSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [topPages, setTopPages] = useState<AdminAnalyticsTopPagesResponse | null>(null);

  const [events, setEvents] = useState<AdminAnalyticsEvent[]>([]);
  const [eventsMeta, setEventsMeta] = useState<ApiMeta | undefined>(undefined);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventFilterForm, setEventFilterForm] = useState<EventFilterState>({
    visitorUuid: "",
    sessionUuid: "",
    pageUrl: "",
    eventType: "",
  });
  const [eventFilters, setEventFilters] = useState<EventFilterState>(eventFilterForm);

  const [visitorsResponse, setVisitorsResponse] =
    useState<AdminAnalyticsVisitorsResponse | null>(null);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);
  const [visitorsPage, setVisitorsPage] = useState(1);

  const [detailVisitorUuid, setDetailVisitorUuid] = useState<string | null>(null);
  const [visitorDetail, setVisitorDetail] =
    useState<AdminAnalyticsVisitorDetailResponse | null>(null);
  const [visitorDetailLoading, setVisitorDetailLoading] = useState(false);
  const [visitorDetailError, setVisitorDetailError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const buildRangeParams = useCallback((): { from?: string; to?: string; days?: number } => {
    if (rangePreset === "custom") {
      const fromIso = toIsoString(customFrom);
      const toIso = toIsoString(customTo);
      const params: { from?: string; to?: string } = {};
      if (fromIso) params.from = fromIso;
      if (toIso) params.to = toIso;
      return params;
    }
    const numeric = Number(rangePreset);
    if (Number.isFinite(numeric) && numeric > 0) {
      return { days: Math.floor(numeric) };
    }
    return { days: DEFAULT_DAYS };
  }, [customFrom, customTo, rangePreset]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const params = buildRangeParams();
      const [summaryResponse, topPagesResponse] = await Promise.all([
        apiClient.fetchAdminAnalyticsSummary(params),
        apiClient.fetchAdminAnalyticsTopPages({
          ...params,
          limit: 10,
          event_type: topPagesEventType ? topPagesEventType : undefined,
        }),
      ]);
      setSummary(summaryResponse);
      setTopPages(topPagesResponse);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nu am putut încărca rezumatul analytics.";
      setSummaryError(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [buildRangeParams, topPagesEventType]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const params = buildRangeParams();
      const response = await apiClient.fetchAdminAnalyticsEvents({
        ...params,
        per_page: EVENTS_PER_PAGE,
        page: eventsPage,
        visitor_uuid: eventFilters.visitorUuid || undefined,
        session_uuid: eventFilters.sessionUuid || undefined,
        page_url: eventFilters.pageUrl || undefined,
        event_type: eventFilters.eventType || undefined,
      });
      const { data, meta } = extractListAndMeta(response);
      setEvents(data);
      setEventsMeta(meta);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nu am putut încărca evenimentele.";
      setEventsError(message);
    } finally {
      setEventsLoading(false);
    }
  }, [buildRangeParams, eventFilters, eventsPage]);

  const loadVisitors = useCallback(async () => {
    setVisitorsLoading(true);
    setVisitorsError(null);
    try {
      const params = buildRangeParams();
      const response = await apiClient.fetchAdminAnalyticsVisitors({
        ...params,
        per_page: VISITORS_PER_PAGE,
        page: visitorsPage,
      });
      setVisitorsResponse(response);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nu am putut încărca vizitatorii de top.";
      setVisitorsError(message);
    } finally {
      setVisitorsLoading(false);
    }
  }, [buildRangeParams, visitorsPage]);

  const loadVisitorDetail = useCallback(
    async (visitorUuid: string) => {
      setDetailVisitorUuid(visitorUuid);
      setVisitorDetail(null);
      setVisitorDetailError(null);
      setVisitorDetailLoading(true);
      setShowDetail(true);
      try {
        const params = buildRangeParams();
        const response = await apiClient.fetchAdminAnalyticsVisitorDetail(visitorUuid, {
          ...params,
          limit: 100,
        });
        setVisitorDetail(response);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nu am putut încărca detaliile vizitatorului.";
        setVisitorDetailError(message);
      } finally {
        setVisitorDetailLoading(false);
      }
    },
    [buildRangeParams],
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  const eventTypeOptions = useMemo(() => {
    const options = new Set<string>();
    summary?.events_by_type?.forEach((item) => {
      if (item.type) options.add(item.type);
    });
    if (eventFilters.eventType) options.add(eventFilters.eventType);
    if (topPagesEventType) options.add(topPagesEventType);
    return Array.from(options).sort();
  }, [eventFilters.eventType, summary?.events_by_type, topPagesEventType]);

  const handleRangeSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setEventsPage(1);
      setVisitorsPage(1);
      void loadSummary();
      void loadEvents();
      void loadVisitors();
    },
    [loadEvents, loadSummary, loadVisitors],
  );

  const handleResetRange = useCallback(() => {
    setRangePreset(String(DEFAULT_DAYS));
    setCustomFrom("");
    setCustomTo("");
  }, []);

  const handleApplyEventFilters = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setEventsPage(1);
      setEventFilters(eventFilterForm);
    },
    [eventFilterForm],
  );

  const handleClearEventFilters = useCallback(() => {
    const empty: EventFilterState = {
      visitorUuid: "",
      sessionUuid: "",
      pageUrl: "",
      eventType: "",
    };
    setEventFilterForm(empty);
    setEventFilters(empty);
    setEventsPage(1);
  }, []);

  const currentEventsPage = useMemo(() => {
    const metaPage = getMetaNumber(eventsMeta, ["current_page", "currentPage"]);
    return metaPage ?? eventsPage;
  }, [eventsMeta, eventsPage]);

  const eventsPageCount = useMemo(() => resolvePageCount(eventsMeta), [eventsMeta]);

  const currentVisitorsPage = useMemo(() => {
    const metaPage = getMetaNumber(visitorsResponse?.meta, ["current_page", "currentPage"]);
    return metaPage ?? visitorsPage;
  }, [visitorsPage, visitorsResponse?.meta]);

  const visitorsPageCount = useMemo(
    () => resolvePageCount(visitorsResponse?.meta),
    [visitorsResponse?.meta],
  );

  const eventColumns = useMemo<Column<AdminAnalyticsEvent>[]>(
    () => [
      {
        id: "occurred_at",
        header: "Moment",
        accessor: (event) => new Date(event.occurred_at),
        cell: (event) => (
          <span className="text-sm text-slate-700">{formatDateTime(event.occurred_at)}</span>
        ),
        sortable: true,
      },
      {
        id: "event_type",
        header: "Tip",
        accessor: (event) => event.event_type,
        cell: (event) => (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
            {event.event_type}
          </span>
        ),
        sortable: true,
      },
      {
        id: "page",
        header: "Pagină",
        accessor: (event) => event.page_url,
        cell: (event) => (
          <span className="break-words text-sm text-slate-700">{event.page_url}</span>
        ),
      },
      {
        id: "visitor",
        header: "Vizitator",
        accessor: (event) => event.visitor_uuid,
        cell: (event) => (
          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {event.visitor_uuid}
          </code>
        ),
      },
      {
        id: "session",
        header: "Sesiune",
        accessor: (event) => event.session_uuid ?? "",
        cell: (event) =>
          event.session_uuid ? (
            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {event.session_uuid}
            </code>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
      {
        id: "scroll",
        header: "Scroll",
        accessor: (event) => event.scroll?.percentage ?? event.scroll?.pixels ?? 0,
        cell: (event) => <span className="text-sm text-slate-700">{buildScrollLabel(event)}</span>,
      },
      {
        id: "duration",
        header: "Durată",
        accessor: (event) => event.duration_ms ?? 0,
        cell: (event) => (
          <span className="text-sm text-slate-700">{formatDuration(event.duration_ms)}</span>
        ),
      },
    ],
    [],
  );

  const visitorColumns = useMemo<Column<AdminAnalyticsVisitorSummary>[]>(
    () => [
      {
        id: "visitor_uuid",
        header: "Vizitator",
        accessor: (visitor) => visitor.visitor_uuid,
        cell: (visitor) => (
          <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {visitor.visitor_uuid}
          </code>
        ),
      },
      {
        id: "total_events",
        header: "Evenimente",
        accessor: (visitor) => visitor.total_events,
        cell: (visitor) => (
          <span className="text-sm font-semibold text-slate-700">
            {numberFormatter.format(visitor.total_events)}
          </span>
        ),
        sortable: true,
      },
      {
        id: "total_sessions",
        header: "Sesiuni",
        accessor: (visitor) => visitor.total_sessions,
        cell: (visitor) => (
          <span className="text-sm text-slate-700">
            {numberFormatter.format(visitor.total_sessions)}
          </span>
        ),
      },
      {
        id: "first_seen",
        header: "Prima apariție",
        accessor: (visitor) => new Date(visitor.first_seen),
        cell: (visitor) => (
          <span className="text-sm text-slate-700">
            {formatShortDateTime(visitor.first_seen)}
          </span>
        ),
      },
      {
        id: "last_seen",
        header: "Ultima activitate",
        accessor: (visitor) => new Date(visitor.last_seen),
        cell: (visitor) => (
          <span className="text-sm text-slate-700">
            {formatShortDateTime(visitor.last_seen)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: () => "",
        cell: (visitor) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void loadVisitorDetail(visitor.visitor_uuid);
            }}
          >
            Detalii
          </Button>
        ),
      },
    ],
    [loadVisitorDetail],
  );

  const renderEventDetails = (event: AdminAnalyticsEvent) => (
    <div className="space-y-3 bg-white p-4 text-sm text-slate-700">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Referrer</p>
          <p className="break-all text-sm text-slate-700">{event.referrer_url ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Agent utilizator</p>
          <p className="break-words text-sm text-slate-700">{event.user_agent ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Adresă IP</p>
          <p className="text-sm text-slate-700">{event.ip_address ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Dispozitiv</p>
          <p className="text-sm text-slate-700">{describeDevice(event.device)}</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">Metadate</p>
        <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-900/90 p-3 text-xs text-slate-100">
          {serializeMetadata(event.metadata)}
        </pre>
      </div>
    </div>
  );

  const handleCloseDetail = () => {
    setShowDetail(false);
    setDetailVisitorUuid(null);
    setVisitorDetail(null);
    setVisitorDetailError(null);
  };

  const renderEventTypeCard = (item: AdminAnalyticsEventTypeStat) => (
    <div
      key={item.type}
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-jade/10 text-jade">
          <Target className="h-4 w-4" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{item.type}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">
        {numberFormatter.format(item.total_events)}
      </p>
      {typeof item.share === "number" ? (
        <p className="text-xs text-slate-500">
          {shareFormatter.format(item.share * 100)}% din totalul evenimentelor
        </p>
      ) : null}
    </div>
  );

  const renderTopPageRow = (page: AdminAnalyticsTopPage) => (
    <tr key={page.page_url} className="border-b border-slate-100">
      <td className="px-4 py-3 text-sm text-slate-700">{page.page_url}</td>
      <td className="px-4 py-3 text-sm text-right text-slate-700">
        {numberFormatter.format(page.total_events)}
      </td>
      <td className="px-4 py-3 text-sm text-right text-slate-700">
        {page.unique_visitors != null ? numberFormatter.format(page.unique_visitors) : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-right text-slate-700">
        {page.share != null ? `${shareFormatter.format(page.share * 100)}%` : "—"}
      </td>
    </tr>
  );

  const dailyActivity = summary?.daily_activity ?? [];
  const maxDailyEvents = dailyActivity.reduce(
    (max, item) => (item.events > max ? item.events : max),
    0,
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-berkeley">Analytics vizitatori anonimi</h1>
        <p className="text-sm text-slate-600">
          Monitorizează evenimentele publice, paginile de top și traseul vizitatorilor pentru rutele publice.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleRangeSubmit}>
          <div className="md:col-span-1">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CalendarRange className="h-4 w-4" /> Interval rapid
            </label>
            <Select value={rangePreset} onValueChange={setRangePreset} className="mt-2">
              <option value="7">Ultimele 7 zile</option>
              <option value="14">Ultimele 14 zile</option>
              <option value="30">Ultimele 30 de zile</option>
              <option value="60">Ultimele 60 de zile</option>
              <option value="90">Ultimele 90 de zile</option>
              <option value="custom">Interval personalizat</option>
            </Select>
          </div>
          {rangePreset === "custom" ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600">De la</label>
                <Input
                  type="datetime-local"
                  className="mt-2"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Până la</label>
                <Input
                  type="datetime-local"
                  className="mt-2"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-600">Descriere interval</label>
              <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-500">
                Selectează opțiunea „Interval personalizat” pentru a introduce manual datele exacte.
              </div>
            </div>
          )}
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-1">
            <Button type="submit" className="flex-1" disabled={summaryLoading}>
              Aplică interval
            </Button>
            <Button type="button" variant="outline" onClick={handleResetRange}>
              Resetează
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void loadSummary();
                void loadEvents();
                void loadVisitors();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-500" />
            <span>
              Vizitatori unici în interval: {summary ? numberFormatter.format(summary.totals.unique_visitors) : "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600">Top pagini filtrate după tip</label>
            <Select
              value={topPagesEventType}
              onValueChange={setTopPagesEventType}
              className="min-w-[180px]"
            >
              <option value="">Toate evenimentele</option>
              {eventTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {summaryError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {summaryError}
        </div>
      ) : null}

      <SummaryCards
        totals={summary?.totals}
        scroll={summary?.scroll}
        range={summary?.range as AnalyticsDateRange | undefined}
        loading={summaryLoading}
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-berkeley">Distribuția evenimentelor</h2>
          <p className="text-sm text-slate-600">
            Evenimentele sunt grupate pe tip pentru a evidenția interacțiunile importante și acoperirea paginilor.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary?.events_by_type?.length ? (
            summary.events_by_type.map((item) => renderEventTypeCard(item))
          ) : (
            <p className="text-sm text-slate-500">Nu există evenimente în intervalul selectat.</p>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">Activitate zilnică</h3>
          {dailyActivity.length === 0 ? (
            <p className="text-sm text-slate-500">Nu există activitate pentru intervalul selectat.</p>
          ) : (
            <ul className="space-y-2">
              {dailyActivity.map((entry) => {
                const width = maxDailyEvents > 0 ? Math.round((entry.events / maxDailyEvents) * 100) : 0;
                return (
                  <li key={entry.date} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{entry.date}</span>
                      <span>
                        {numberFormatter.format(entry.events)} evenimente / {numberFormatter.format(entry.visitors)} vizitatori
                      </span>
                    </div>
                    <div className="h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-jade" style={{ width: `${width}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-berkeley">Pagini cu expunere ridicată</h2>
          <p className="text-sm text-slate-600">
            Lista agregată din endpoint-ul de top pagini, filtrată după tipul selectat.
          </p>
        </header>
        {topPages?.pages?.length ? (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pagină</th>
                  <th className="px-4 py-3 text-right">Evenimente</th>
                  <th className="px-4 py-3 text-right">Vizitatori</th>
                  <th className="px-4 py-3 text-right">Pondere</th>
                </tr>
              </thead>
              <tbody>
                {topPages.pages.map((page) => renderTopPageRow(page))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nu există pagini înregistrate pentru intervalul curent.</p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-berkeley">Evenimente brute</h2>
            <p className="text-sm text-slate-600">
              Vizualizează feed-ul de evenimente colectate prin endpoint-ul public și inspectează metadata.
            </p>
          </div>
          <form className="flex flex-wrap items-end gap-3" onSubmit={handleApplyEventFilters}>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">Vizitator UUID</label>
              <Input
                value={eventFilterForm.visitorUuid}
                onChange={(event) =>
                  setEventFilterForm((prev) => ({ ...prev, visitorUuid: event.target.value }))
                }
                placeholder="Filtrează după vizitator"
                className="mt-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">Sesiune UUID</label>
              <Input
                value={eventFilterForm.sessionUuid}
                onChange={(event) =>
                  setEventFilterForm((prev) => ({ ...prev, sessionUuid: event.target.value }))
                }
                placeholder="Filtrează după sesiune"
                className="mt-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">URL pagină</label>
              <Input
                value={eventFilterForm.pageUrl}
                onChange={(event) =>
                  setEventFilterForm((prev) => ({ ...prev, pageUrl: event.target.value }))
                }
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-600">Tip eveniment</label>
              <Select
                value={eventFilterForm.eventType}
                onValueChange={(value) =>
                  setEventFilterForm((prev) => ({ ...prev, eventType: value }))
                }
                className="mt-1 min-w-[160px]"
              >
                <option value="">Toate</option>
                {eventTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary" className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Aplică filtre
            </Button>
            <Button type="button" variant="outline" onClick={handleClearEventFilters}>
              Resetează
            </Button>
          </form>
        </header>

        {eventsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {eventsError}
          </div>
        ) : null}

        {eventsLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-600">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Se încarcă evenimentele...
          </div>
        ) : (
          <DataTable data={events} columns={eventColumns} renderRowDetails={renderEventDetails} />
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
          <span>
            Pagina {currentEventsPage}
            {eventsPageCount ? ` din ${eventsPageCount}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentEventsPage <= 1}
              onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={eventsPageCount != null && currentEventsPage >= eventsPageCount}
              onClick={() => setEventsPage((prev) => prev + 1)}
            >
              Următor
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-berkeley">Vizitatori de top</h2>
          <p className="text-sm text-slate-600">
            Vizualizează vizitatorii anonimi cu cea mai mare activitate și accesează traseul lor complet.
          </p>
        </header>

        {visitorsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {visitorsError}
          </div>
        ) : null}

        {visitorsLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-600">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Se încarcă vizitatorii...
          </div>
        ) : visitorsResponse?.data?.length ? (
          <DataTable data={visitorsResponse.data} columns={visitorColumns} />
        ) : (
          <p className="text-sm text-slate-500">Nu există vizitatori înregistrați pentru intervalul curent.</p>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-600">
          <span>
            Pagina {currentVisitorsPage}
            {visitorsPageCount ? ` din ${visitorsPageCount}` : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentVisitorsPage <= 1}
              onClick={() => setVisitorsPage((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={visitorsPageCount != null && currentVisitorsPage >= visitorsPageCount}
              onClick={() => setVisitorsPage((prev) => prev + 1)}
            >
              Următor
            </Button>
          </div>
        </div>
      </section>

      {showDetail ? (
        <Popup open={showDetail} onClose={handleCloseDetail} className="max-w-5xl">
          <div className="space-y-4">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-berkeley">Vizitator anonim</h2>
                {detailVisitorUuid ? (
                  <code className="mt-1 block rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {detailVisitorUuid}
                  </code>
                ) : null}
              </div>
              <Button variant="outline" onClick={handleCloseDetail}>
                Închide
              </Button>
            </header>

            {visitorDetailLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-600">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Se încarcă detaliile vizitatorului...
              </div>
            ) : visitorDetailError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {visitorDetailError}
              </div>
            ) : visitorDetail ? (
              <div className="space-y-6">
                <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-sm font-semibold text-slate-600">Rezumat</h3>
                  <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Evenimente</dt>
                      <dd className="text-base font-semibold text-slate-800">
                        {numberFormatter.format(visitorDetail.totals.events)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Pagini</dt>
                      <dd className="text-base font-semibold text-slate-800">
                        {numberFormatter.format(visitorDetail.totals.pages)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Prima apariție</dt>
                      <dd>{formatDateTime(visitorDetail.totals.first_seen)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Ultima activitate</dt>
                      <dd>{formatDateTime(visitorDetail.totals.last_seen)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600">Evenimente pe tip</h3>
                  {visitorDetail.events_by_type.length === 0 ? (
                    <p className="text-sm text-slate-500">Nu există evenimente înregistrate.</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {visitorDetail.events_by_type.map((item) => (
                        <li
                          key={item.type}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-slate-600">{item.type}</span>
                          <span className="text-slate-700">
                            {numberFormatter.format(item.total_events)} evenimente
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600">Pagini vizitate</h3>
                  {visitorDetail.pages.length === 0 ? (
                    <p className="text-sm text-slate-500">Nu există pagini pentru acest vizitator.</p>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Pagină</th>
                            <th className="px-4 py-2 text-right">Evenimente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitorDetail.pages.map((page) => (
                            <tr key={`${page.page_url}-${page.total_events}`} className="border-t border-slate-100">
                              <td className="px-4 py-2 text-slate-700">{page.page_url}</td>
                              <td className="px-4 py-2 text-right text-slate-700">
                                {numberFormatter.format(page.total_events)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600">Sesiuni</h3>
                  {visitorDetail.sessions.length === 0 ? (
                    <p className="text-sm text-slate-500">Nu există sesiuni disponibile.</p>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Sesiune</th>
                            <th className="px-4 py-2">Interval</th>
                            <th className="px-4 py-2 text-right">Evenimente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitorDetail.sessions.map((session) => (
                            <tr key={session.session_uuid} className="border-t border-slate-100">
                              <td className="px-4 py-2">
                                <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                  {session.session_uuid}
                                </code>
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-700">
                                {formatShortDateTime(session.first_seen)} – {formatShortDateTime(session.last_seen)}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-700">
                                {numberFormatter.format(session.events)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600">Evenimente recente</h3>
                  {visitorDetail.recent_events.length === 0 ? (
                    <p className="text-sm text-slate-500">Nu există evenimente recente în interval.</p>
                  ) : (
                    <ul className="space-y-2">
                      {visitorDetail.recent_events.map((event) => (
                        <li
                          key={`${event.id}-${event.occurred_at}`}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-slate-700">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase text-slate-600">
                              {event.event_type}
                            </span>
                            <span>{formatShortDateTime(event.occurred_at)}</span>
                            <span className="text-slate-500">•</span>
                            <span className="break-all text-slate-700">{event.page_url}</span>
                          </div>
                          <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            <div>Scroll: {buildScrollLabel(event)}</div>
                            <div>Durată: {formatDuration(event.duration_ms)}</div>
                            <div>Referrer: {event.referrer_url ?? "—"}</div>
                            <div>Target: {event.metadata?.interaction_target ?? "—"}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Selectează un vizitator pentru a vedea detalii.</p>
            )}
          </div>
        </Popup>
      ) : null}
    </div>
  );
}

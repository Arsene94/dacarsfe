# Marketing Analytics API

Marketing attribution metrics are exposed from the public API namespace under the `/api/analytics/marketing` prefix.
All routes accept optional `start_date` and `end_date` query parameters (ISO dates) to restrict calculations to a
specific reporting window. When omitted, lifetime data is returned.

Marketing channels are aggregated in the `dacars_traffic_sources` table, which stores:
`name`, `channel`, `campaign_id`, `cost`, `leads`, `conversions`, `start_date`, and `end_date`.
Each record exposes a dynamic `cost_per_lead` accessor derived from the stored cost and
lead count. The `TrackReferralSource` middleware records a lead whenever a new visitor
arrives with UTM parameters or an identifiable referrer, while public reservations
link directly to a `traffic_source_id` and bump the associated lead counter during
checkout.

Daily spend imported from the TikTok Ads API is normalised inside
`dacars_traffic_daily_performance` (columns: `traffic_source_id`, `date`, `spend`,
`conversions`, `cpl`, `metadata`). The scheduled job `UpdateCampaignCosts`
calls `/open_api/v1.3/report/integrated/get/` each night (`02:00` server time)
for every TikTok campaign stored locally. The job reconciles the per-day
metrics with the aggregated totals in `dacars_traffic_sources` and keeps a
structured JSON payload in `metadata` for debugging the raw API response.

Environment configuration lives in `.env` (`TIKTOK_ACCESS_TOKEN` and
`TIKTOK_ADVERTISER_ID`) and is mirrored in `config/services.php` under the
`tiktok` key. Missing credentials simply skip the sync without breaking the
queue worker, but errors returned by the Business API are logged with the
campaign identifier to simplify rotation of expired tokens.

## GET /api/analytics/marketing/overview

Returns global KPIs that blend customer retention and sentiment data.

```
{
  "total_customers": 1450,
  "retention_rate": 63.2,
  "average_LTV": 485.6,
  "average_rating": 4.7
}
```

- `retention_rate` is based on the ratio of customers with more than one completed reservation against the total
  number of registered customers.
- `average_LTV` is the mean lifetime revenue per tracked customer (using reservation totals).
- `average_rating` uses `dacars_feedback.rating` values when that table is present.

## GET /api/analytics/marketing/sources

Summarises booking performance by marketing channel (via `reservations.traffic_source_id`). The payload always returns an ordered list
with the most valuable channels first (capped at 10 entries).

```
{
  "top_channels": [
    {
      "channel": "facebook",
      "bookings": 24,
      "avg_revenue": 565.75,
      "total_revenue": 13578.0,
      "CPA": 14.5,
      "conversion_rate": 4.3
    }
  ]
}
```

- `CPA` divides the aggregated marketing cost by the number of recorded conversions for
  that channel (falling back to the booking count when no conversions have been synced).
- `conversion_rate` divides the stored conversion count by the captured leads from the
  marketing source metadata.
- Channels without explicit attribution fall back to `direct`.

## GET /api/analytics/marketing/retention

Provides a deeper breakdown of customer behaviour for cohort analysis.

```
{
  "tracked_customers": 820,
  "returning_customers": 286,
  "single_booking_customers": 534,
  "average_repeat_bookings": 2.4,
  "average_revenue_returning": 812.5,
  "average_LTV": 485.6
}
```

`average_repeat_bookings` counts how many reservations returning customers make on average, while
`average_revenue_returning` focuses on revenue for those same customers. `average_LTV` mirrors the value from
`/overview` for easy comparisons.

## POST /api/track-source

Sincronizează manual informațiile de atribuire captate din cookies sau parametri UTM către Laravel.
Endpoint-ul acceptă un payload JSON cu următoarele chei:

```json
{
  "source": "google",
  "medium": "cpc",
  "campaign": "promo-octombrie",
  "referrer": "https://www.google.com",
  "session_id": "abc123xyz"
}
```

- `source` (**obligatoriu**) – canalul identificat (ex. `google`, `facebook`, `direct`).
- `medium` – tipul traficului (ex. `cpc`, `referral`, `email`).
- `campaign` – identificatorul campaniei din rețeaua de ads.
- `referrer` – URL-ul complet al paginii care a trimis vizitatorul.
- `session_id` – sesiunea de tracking generată anterior de backend (dacă există). Folosită pentru a evita duplicatele.

### Răspuns 200

```json
{
  "session_id": "abc123xyz",
  "status": "tracked",
  "synced_at": "2025-01-14T12:36:42Z"
}
```

- `session_id` – ID-ul stabilit de backend pentru a lega lead-ul de rezervări viitoare.
- `status` – confirmă faptul că payload-ul a fost procesat.
- `synced_at` – momentul ultimei sincronizări (ISO 8601). Poate lipsi dacă backend-ul nu furnizează valoarea.

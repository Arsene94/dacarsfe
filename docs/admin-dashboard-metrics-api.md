# Admin Dashboard & Metrics API

Provides lightweight endpoints for the operations dashboard widgets. All routes require an authenticated Sanctum admin token and the permissions listed below.

## Activity widget (`/api/widgets/activity/{period?}`)
| Method | Description | Permission |
| --- | --- | --- |
| GET | `/api/widgets/activity/{period?}` | Returns upcoming pick-up/return bookings for the selected day. | `dashboard.view_widget_activity` |

### Path parameter
`period` accepts Romanian and English aliases:
- `azi`, `today`
- `maine`, `tomorrow`
- `2zile`, `2days`
- `3zile`, `3days`
- `4zile`, `4days`
- `5zile`, `5days`

Default is `azi` (today).

### Query parameters
- `paginate` – number of records per page (default 20, minimum 1).

### Response
```json
{
  "day": "2025-02-15",
  "period": "today",
  "hours": ["09:00", "13:30", "19:00"],
  "data": [
    {
      "id": 412,
      "booking_number": "#1058821",
      "flight_number": "RO317",
      "customer_name": "Maria Enache",
      "customer_phone": "+40 723 555 111",
      "note": "Predare la terminal Plecări.",
      "status": "reserved",
      "car_id": 17,
      "customer_id": 88,
      "rental_start_date": "2025-02-15T09:00:00+02:00",
      "rental_end_date": "2025-02-20T09:00:00+02:00",
      "total": 247,
      "sub_total": 216,
      "total_services": 12,
      "advance_payment": 100,
      "price_per_day": 36,
      "coupon_amount": 15,
      "coupon_type": "percent",
      "with_deposit": true,
      "services": [
        { "id": 1, "name": "Scaun copil" },
        { "id": 3, "name": "Asigurare CASCO extinsă" }
      ],
      "child_seat_service_name": "Scaun copil",
      "days": 6,
      "services_list": [
        { "id": 1, "name": "Scaun copil" },
        { "id": 3, "name": "Asigurare CASCO extinsă" }
      ],
      "remaining_balance": 237,
      "extension": {
        "from": "2025-02-20T09:00:00+02:00",
        "to": "2025-02-22T10:00:00+02:00",
        "days": 2,
        "price_per_day": 45,
        "total": 90,
        "paid": false,
        "remaining_payment": 90
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 6,
    "last_page": 1,
    "from": 1,
    "to": 6
  }
}
```

`coupon_type` mirrors the values accepted by the booking quote endpoint, including the new `percentage` option. `discount`
exposes the applied currency value, while `coupon_amount` mirrors the operator input (for example the per-day value typed for
manual discounts) so forms can reuse the same value when editing. `remaining_balance` captures the amount still to be collected,
automatically adding the extension total when `extension.paid=false`. The nested `extension` object is only present when a
reservation has been extended and includes the original end date (`from`), the new end date (`to`), the extra days, rate, total
and whether the extra period has already been paid.

---

## KPI metrics (`/api/admin/metrics/*`)
| Endpoint | Description | Permission | Query parameters |
| --- | --- | --- | --- |
| GET `/api/admin/metrics/bookings-today` | Count bookings occurring today. | `metrics.view_bookings_today` | `by` (`created`, `start`, `end`); `statuses` (CSV or `all`). |
| GET `/api/admin/metrics/cars-total` | Count cars (optionally filter by status). | `metrics.view_cars_total` | `status` (e.g. `available`). |
| GET `/api/admin/metrics/bookings-total` | Total bookings (filter by status set). | `metrics.view_bookings_total` | `statuses` (CSV or `all`). |

### Examples
```
GET /api/admin/metrics/bookings-today?by=start&statuses=reserved,completed
```
Response:
```json
{
  "date": "2025-02-15",
  "by": "start",
  "statuses": ["reserved", "completed"],
  "count": 18
}
```

```
GET /api/admin/metrics/cars-total?status=available
```
Response:
```json
{
  "status": "available",
  "count": 142
}
```

```
GET /api/admin/metrics/bookings-total?statuses=all
```
Response:
```json
{
  "statuses": "all",
  "count": 2284
}
```

### Notes
- Results are cached for 60 seconds; repeated requests within that window reuse cached values.
- Passing `statuses=all` skips the default filter set.

---

## Admin performance reports (`/api/admin/reports/*`)

The performance dashboards consume a dedicated set of reporting endpoints. They require an authenticated Sanctum admin along with one of the permissions in the `reports.*` family (`reports.analytics`, `reports.insights`, `reports.performance`, `reports.kpi`).

### Surse de date și clasificări

- Indicatorii de volum și operaționali (număr rezervări, durată medie, utilizarea flotei, mix de canale) se calculează în continuare din rezervările existente în sistem și iau în considerare doar statusurile `reserved` și `completed` pentru a reflecta volume confirmate sau finalizate.
- Veniturile și costurile aferente rapoartelor provin exclusiv din `CarCashflow` (înregistrările de tip `income` și `expense`). Sumele sunt salvate în RON și sunt convertite în EUR în răspunsuri la un curs fix 1 EUR = 5 RON; ambele valori sunt returnate prin câmpuri dedicate (`currency_secondary`, respectiv perechile `*_ron`).
- Tipurile de cheltuieli din `CarCashflow` sunt agregate pe patru categorii în rapoarte: `car`, `fuel` și `parking_wash` intră în bucket-ul „fleet”, `company_operations`, `salary` și `house` în „operations”, `marketing` rămâne dedicat, iar `other` acoperă restul. Înregistrările mai vechi fără `expense_type` folosesc în continuare câmpul `category` pentru mapare retroactivă.
- În analizele pe mașini și segmente sunt contabilizate doar cheltuielile cu `expense_type = car` (sau cele moștenite fără tip dar cu mașină atașată), pentru a evita distribuirea costurilor generale pe flota întreagă.
- Mixul de clienți și canale reutilizează aceeași clasificare pentru fiecare rezervare: `Direct` (cont client sau rezervare creată manual), `Corporate` (contracte/discount-uri corporate identificate prin codurile de cupon, ofertele aplicate sau detaliile firmei din profil), `OTA` (Online Travel Agencies precum Booking.com, Expedia, Trip.com, detectate după coduri dedicate, note sau domeniul adresei de e-mail) și `Agenții` pentru parteneri offline tradiționali marcați în note, cupon sau oferte.

| Method & Endpoint | Utilizare UI | Observații |
| --- | --- | --- |
| `GET /api/admin/reports/overview` | Populează pagina `/admin/reports` cu rezumatul săptămânal și graficul trimestrial. | Acceptă filtrare pe săptămână de referință și cod de trimestru. |
| `GET /api/admin/reports/weekly` | Alimentează raportul `/admin/reports/weekly`. | Permite comparație cu săptămâna precedentă, anul anterior sau un interval custom. |
| `GET /api/admin/reports/monthly` | Randează raportul `/admin/reports/monthly`. | Suportă comparații cu luna anterioară, același interval din anul trecut sau un alt input. |
| `GET /api/admin/reports/quarterly` | Rapoarte consolidate pentru `/admin/reports/quarterly`. | Returnează KPI-uri QoQ/YoY și profit pe segmente. |
| `GET /api/admin/reports/annual` | Construiește dashboard-ul `/admin/reports/annual`. | Include breakdown-uri pe trimestre, segmente, orașe, canale și recomandări strategice. |

### Overview report (`GET /api/admin/reports/overview`)

Aggregates the quick KPIs and quarter comparison chart from `/admin/reports`.

| Query parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `week_start` | ISO date (YYYY-MM-DD) | No | Monday that anchors the 7-day window. Defaults to the current week in the supplied timezone. |
| `quarter` | `YYYY-Q{1-4}` | No | Target quarter for the comparison chart; falls back to the active quarter. |
| `timezone` | Olson string | No | Timezone for period calculations. Defaults to `Europe/Bucharest`. |

**Response**

```json
{
  "week": {
    "start": "2025-03-10",
    "end": "2025-03-16",
    "currency": "EUR",
    "currency_secondary": "RON",
    "revenue": {
      "current": 48200,
      "previous": 44100,
      "current_ron": 241000,
      "previous_ron": 220500
    },
    "bookings": { "current": 138, "previous": 124 },
    "fleet_utilization": { "current": 0.78, "previous": 0.74 }
  },
  "quarter": {
    "code": "2025-Q1",
    "comparison_code": "2024-Q1",
    "chart": [
      {
        "label": "Ianuarie",
        "current": 182000,
        "previous": 165000,
        "current_ron": 910000,
        "previous_ron": 825000
      },
      {
        "label": "Februarie",
        "current": 195400,
        "previous": 172500,
        "current_ron": 977000,
        "previous_ron": 862500
      },
      {
        "label": "Martie",
        "current": 221300,
        "previous": 204000,
        "current_ron": 1106500,
        "previous_ron": 1020000
      }
    ]
  },
  "links": [
    { "slug": "weekly", "title": "Raport săptămânal", "href": "/admin/reports/weekly" },
    { "slug": "monthly", "title": "Raport lunar", "href": "/admin/reports/monthly" },
    { "slug": "quarterly", "title": "Raport trimestrial", "href": "/admin/reports/quarterly" },
    { "slug": "annual", "title": "Raport anual", "href": "/admin/reports/annual" }
  ]
}
```

### Weekly report (`GET /api/admin/reports/weekly`)

Delivers the analytics for a 7-day window rendered on `/admin/reports/weekly`.

| Query parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `start_date` | ISO date (YYYY-MM-DD) | Yes | Monday that begins the analysis window. |
| `compare_with` | Enum (`previous_week`, `same_week_last_year`, `custom`) | No | How to choose the comparison interval. Default is `previous_week`. |
| `custom_compare_start` | ISO date | Conditionally | Required when `compare_with=custom`; represents the Monday that anchors the comparison period. |
| `timezone` | Olson string | No | Timezone for date boundaries; defaults to `Europe/Bucharest`. |

**Response**

```json
{
  "period": {
    "start": "2025-03-10",
    "end": "2025-03-16",
    "comparison_start": "2025-03-03",
    "comparison_end": "2025-03-09"
  },
  "totals": {
    "currency": "EUR",
    "currency_secondary": "RON",
    "revenue": {
      "current": 48200,
      "previous": 44100,
      "current_ron": 241000,
      "previous_ron": 220500
    },
    "bookings": { "current": 138, "previous": 124 },
    "cancellations": { "current": 11, "previous": 15 },
    "average_duration_days": { "current": 4.2, "previous": 3.9 },
    "yoy": { "revenue_ratio": 0.11, "bookings_current": 138, "bookings_previous": 117 }
  },
  "daily_revenue": [
    {
      "label": "L",
      "current": 6200,
      "previous": 5800,
      "current_ron": 31000,
      "previous_ron": 29000
    },
    {
      "label": "Ma",
      "current": 6700,
      "previous": 6120,
      "current_ron": 33500,
      "previous_ron": 30600
    },
    {
      "label": "Mi",
      "current": 8200,
      "previous": 7050,
      "current_ron": 41000,
      "previous_ron": 35250
    },
    {
      "label": "J",
      "current": 7600,
      "previous": 6980,
      "current_ron": 38000,
      "previous_ron": 34900
    },
    {
      "label": "V",
      "current": 7200,
      "previous": 6890,
      "current_ron": 36000,
      "previous_ron": 34450
    },
    {
      "label": "S",
      "current": 9300,
      "previous": 8450,
      "current_ron": 46500,
      "previous_ron": 42250
    },
    {
      "label": "D",
      "current": 7200,
      "previous": 6810,
      "current_ron": 36000,
      "previous_ron": 34050
    }
  ],
  "channel_mix": [
    { "label": "Direct", "current_percent": 54, "previous_percent": 49 },
    { "label": "Corporate", "current_percent": 26, "previous_percent": 24 },
    { "label": "OTA", "current_percent": 12, "previous_percent": 16 },
    { "label": "Agenții", "current_percent": 8, "previous_percent": 11 }
  ],
  "occupancy_by_segment": [
    { "label": "Economy", "current": 0.74, "previous": 0.71 },
    { "label": "Compact", "current": 0.79, "previous": 0.75 },
    { "label": "SUV", "current": 0.88, "previous": 0.77 },
    { "label": "Premium", "current": 0.65, "previous": 0.62 }
  ],
  "risk_indicators": {
    "cancellation_rate": 0.079,
    "late_returns_count": 6,
    "late_returns_value": 720,
    "late_returns_value_ron": 3600
  },
  "recommendations": [
    "Activează o campanie flash pentru segmentul economy în weekend pentru a reduce stocul disponibil.",
    "Propune partenerilor corporate un upgrade către SUV în lunile următoare pentru a crește ARPU.",
    "Optimizează paginile de destinație: conversia din trafic organic este 6.4%."
  ]
}
```

### Monthly report (`GET /api/admin/reports/monthly`)

Feeds the `/admin/reports/monthly` dashboard with financial and customer insights.

| Query parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `month` | `YYYY-MM` | Yes | Calendar month to analyse. |
| `compare_with` | Enum (`previous_month`, `same_month_last_year`, `custom`) | No | Comparison baseline. Defaults to `previous_month`. |
| `custom_compare` | `YYYY-MM` | Conditionally | Required when `compare_with=custom`. |
| `timezone` | Olson string | No | Timezone used for boundary normalization. Defaults to `Europe/Bucharest`. |

**Response**

```json
{
  "period": {
    "month": "2025-03",
    "label": "Martie 2025",
    "comparison": { "month": "2025-02", "label": "Februarie 2025" }
  },
  "financials": {
    "currency": "EUR",
    "currency_secondary": "RON",
    "revenue": {
      "current": 221300,
      "previous": 208400,
      "current_ron": 1106500,
      "previous_ron": 1042000
    },
    "net_profit": {
      "current": 68400,
      "previous": 61200,
      "current_ron": 342000,
      "previous_ron": 306000
    },
    "avg_daily_rate": {
      "current": 74.6,
      "previous": 71.2,
      "current_ron": 373.0,
      "previous_ron": 356.0
    },
    "fleet_utilization": { "current": 0.81, "previous": 0.77 }
  },
  "bookings": {
    "total": { "current": 612, "previous": 584 },
    "corporate_share": { "current": 0.34, "previous": 0.31 },
    "top_cities": [
      { "city": "București", "current": 212, "previous": 201 },
      { "city": "Cluj-Napoca", "current": 118, "previous": 109 },
      { "city": "Iași", "current": 84, "previous": 78 }
    ]
  },
  "six_month_trend": [
    {
      "label": "Oct 2024",
      "revenue": 178200,
      "profit": 51400,
      "revenue_ron": 891000,
      "profit_ron": 257000
    },
    {
      "label": "Nov 2024",
      "revenue": 186500,
      "profit": 53800,
      "revenue_ron": 932500,
      "profit_ron": 269000
    },
    {
      "label": "Dec 2024",
      "revenue": 215300,
      "profit": 64200,
      "revenue_ron": 1076500,
      "profit_ron": 321000
    },
    {
      "label": "Ian 2025",
      "revenue": 182000,
      "profit": 55600,
      "revenue_ron": 910000,
      "profit_ron": 278000
    },
    {
      "label": "Feb 2025",
      "revenue": 195400,
      "profit": 60100,
      "revenue_ron": 977000,
      "profit_ron": 300500
    },
    {
      "label": "Mar 2025",
      "revenue": 221300,
      "profit": 68400,
      "revenue_ron": 1106500,
      "profit_ron": 342000
    }
  ],
  "customer_mix": [
    { "label": "Direct", "current_percent": 48, "previous_percent": 44 },
    { "label": "Corporate", "current_percent": 34, "previous_percent": 31 },
    { "label": "OTA", "current_percent": 11, "previous_percent": 15 },
    { "label": "Agenții", "current_percent": 7, "previous_percent": 10 }
  ],
  "cost_structure": {
    "fleet": {
      "current": 76400,
      "previous": 73100,
      "current_ron": 382000,
      "previous_ron": 365500
    },
    "operations": {
      "current": 29800,
      "previous": 28400,
      "current_ron": 149000,
      "previous_ron": 142000
    },
    "marketing": {
      "current": 18600,
      "previous": 21400,
      "current_ron": 93000,
      "previous_ron": 107000
    },
    "other": {
      "current": 9800,
      "previous": 9400,
      "current_ron": 49000,
      "previous_ron": 47000
    }
  },
  "focus_areas": [
    "Veniturile totale au crescut cu 6.2% față de perioada comparată (221 300 EUR vs 208 400 EUR). Continuă campaniile cu tracțiune ridicată.",
    "Utilizarea flotei a urcat la 81.0% (+4.0 pp). Menține rotația pe segmentele cu cerere ridicată.",
    "Cheltuielile marketing au scăzut la 18 600 EUR (- 2 800 EUR față de perioada comparată). Evaluează impactul asupra operațiunilor."
  ]
}
```

Focus area-urile sunt generate din datele curente (variații de venit, utilizare, mix de canale, top orașe și costuri) și pot diferi de exemplul de mai sus în funcție de rezultatele reale.

### Quarterly report (`GET /api/admin/reports/quarterly`)

Backs the `/admin/reports/quarterly` view with YoY/QoQ comparisons.

| Query parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `quarter` | `YYYY-Q{1-4}` | Yes | Target quarter to summarise. |
| `compare_with` | Enum (`previous_quarter`, `same_quarter_last_year`, `custom`) | No | Determines the reference quarter. Defaults to `same_quarter_last_year`. |
| `custom_compare` | `YYYY-Q{1-4}` | Conditionally | Required when `compare_with=custom`. |
| `timezone` | Olson string | No | Timezone applied to quarter boundaries; defaults to `Europe/Bucharest`. |

**Response**

```json
{
  "period": {
    "quarter": "2025-Q1",
    "label": "Trimestrul I 2025",
    "comparison": { "quarter": "2024-Q1", "label": "Trimestrul I 2024" }
  },
  "kpi": {
    "currency": "EUR",
    "currency_secondary": "RON",
    "revenue": {
      "current": 598700,
      "previous": 541500,
      "current_ron": 2993500,
      "previous_ron": 2707500
    },
    "net_profit": {
      "current": 182400,
      "previous": 168900,
      "current_ron": 912000,
      "previous_ron": 844500
    },
    "ebitda_margin": { "current": 0.31, "previous": 0.29 },
    "fleet_utilization": { "current": 0.79, "previous": 0.75 }
  },
  "quarterly_revenue": [
    {
      "label": "Ianuarie",
      "current": 182000,
      "previous": 165000,
      "current_ron": 910000,
      "previous_ron": 825000
    },
    {
      "label": "Februarie",
      "current": 195400,
      "previous": 172500,
      "current_ron": 977000,
      "previous_ron": 862500
    },
    {
      "label": "Martie",
      "current": 221300,
      "previous": 204000,
      "current_ron": 1106500,
      "previous_ron": 1020000
    }
  ],
  "profit_by_segment": [
    {
      "segment": "Economy",
      "current": 41200,
      "previous": 38600,
      "current_ron": 206000,
      "previous_ron": 193000
    },
    {
      "segment": "Compact",
      "current": 48200,
      "previous": 45100,
      "current_ron": 241000,
      "previous_ron": 225500
    },
    {
      "segment": "SUV",
      "current": 61200,
      "previous": 52800,
      "current_ron": 306000,
      "previous_ron": 264000
    },
    {
      "segment": "Premium",
      "current": 31800,
      "previous": 32400,
      "current_ron": 159000,
      "previous_ron": 162000
    }
  ],
  "fleet_availability": [
    { "label": "Activ", "current_percent": 82, "previous_percent": 79 },
    { "label": "Service", "current_percent": 9, "previous_percent": 11 },
    { "label": "Vânzare", "current_percent": 5, "previous_percent": 6 },
    { "label": "Rezervă", "current_percent": 4, "previous_percent": 4 }
  ],
  "strategic_insights": [
    "Segmentul SUV generează 34% din profitul trimestrial și are o rată de ocupare de 88%.",
    "Marjele EBITDA sunt mai ridicate cu 2 pp față de trimestrul precedent datorită optimizării costurilor operaționale.",
    "Recomandare: lansează abonamente corporate în București și Cluj pentru a consolida venituri recurente."
  ]
}
```

### Annual report (`GET /api/admin/reports/annual`)

Provides the strategic, year-long dashboard rendered in `/admin/reports/annual`.

| Query parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `year` | `YYYY` | Yes | Target year to analyse (e.g. `2025`). |
| `compare_with` | Enum (`previous_year`, `custom`) | No | Selects the comparison baseline. Defaults to `previous_year`. |
| `custom_compare` | `YYYY` | Conditionally | Required when `compare_with=custom`; represents the comparison year. |
| `timezone` | Olson string | No | Timezone used for normalising yearly boundaries (default `Europe/Bucharest`). |

**Response**

```json
{
  "period": {
    "year": "2025",
    "label": "Anul 2025",
    "comparison": { "year": "2024", "label": "Anul 2024" }
  },
  "executive_summary": {
    "currency": "EUR",
    "currency_secondary": "RON",
    "revenue": {
      "current": 812400,
      "previous": 748900,
      "current_ron": 4062000,
      "previous_ron": 3744500
    },
    "net_profit": {
      "current": 248600,
      "previous": 219300,
      "current_ron": 1243000,
      "previous_ron": 1096500
    },
    "bookings": { "current": 2482, "previous": 2310 },
    "average_booking_value": {
      "current": 327.4,
      "previous": 324.3,
      "current_ron": 1637.0,
      "previous_ron": 1621.5
    },
    "average_daily_rate": {
      "current": 72.8,
      "previous": 70.1,
      "current_ron": 364.0,
      "previous_ron": 350.5
    },
    "average_daily_rate_per_car": [
      { "car_id": 12, "car_name": "Dacia Duster 2024", "average_daily_rate": 83.5 },
      { "car_id": 5, "car_name": "VW Golf", "average_daily_rate": 71.3 }
    ],
    "fleet_utilization": { "current": 0.79, "previous": 0.74 },
    "cancellation_rate": { "current": 0.061, "previous": 0.074 },
    "lead_time_days": { "average": 6.4, "median": 4.8, "p90": 12.0 }
  },
  "quarter_breakdown": [
    {
      "quarter": "2025-Q1",
      "label": "Trimestrul I 2025",
      "revenue": {
        "current": 198200,
        "previous": 182300,
        "current_ron": 991000,
        "previous_ron": 911500,
        "growth_ratio": 0.087
      },
      "net_profit": {
        "current": 61200,
        "previous": 55800,
        "current_ron": 306000,
        "previous_ron": 279000,
        "growth_ratio": 0.097
      },
      "bookings": { "current": 602, "previous": 564, "growth_ratio": 0.067 },
      "fleet_utilization": 0.78,
      "average_daily_rate": {
        "current": 71.4,
        "previous": 68.9,
        "current_ron": 357.0,
        "previous_ron": 344.5
      },
      "average_daily_rate_per_car": [
        { "car_id": 12, "car_name": "Dacia Duster 2024", "average_daily_rate": 82.1 },
        { "car_id": 5, "car_name": "VW Golf", "average_daily_rate": 70.8 }
      ]
    },
    {
      "quarter": "2025-Q2",
      "label": "Trimestrul II 2025",
      "revenue": {
        "current": 201600,
        "previous": 184900,
        "current_ron": 1008000,
        "previous_ron": 924500,
        "growth_ratio": 0.09
      },
      "net_profit": {
        "current": 61800,
        "previous": 55900,
        "current_ron": 309000,
        "previous_ron": 279500,
        "growth_ratio": 0.106
      },
      "bookings": { "current": 618, "previous": 579, "growth_ratio": 0.067 },
      "fleet_utilization": 0.8,
      "average_daily_rate": {
        "current": 72.8,
        "previous": 69.5,
        "current_ron": 364.0,
        "previous_ron": 347.5
      }
    },
    {
      "quarter": "2025-Q3",
      "label": "Trimestrul III 2025",
      "revenue": {
        "current": 208900,
        "previous": 197600,
        "current_ron": 1044500,
        "previous_ron": 988000,
        "growth_ratio": 0.057
      },
      "net_profit": {
        "current": 64800,
        "previous": 58400,
        "current_ron": 324000,
        "previous_ron": 292000,
        "growth_ratio": 0.11
      },
      "bookings": { "current": 652, "previous": 613, "growth_ratio": 0.064 },
      "fleet_utilization": 0.82,
      "average_daily_rate": {
        "current": 74.1,
        "previous": 71.0,
        "current_ron": 370.5,
        "previous_ron": 355.0
      }
    },
    {
      "quarter": "2025-Q4",
      "label": "Trimestrul IV 2025",
      "revenue": {
        "current": 203700,
        "previous": 184100,
        "current_ron": 1018500,
        "previous_ron": 920500,
        "growth_ratio": 0.106
      },
      "net_profit": {
        "current": 60900,
        "previous": 49300,
        "current_ron": 304500,
        "previous_ron": 246500,
        "growth_ratio": 0.235
      },
      "bookings": { "current": 610, "previous": 554, "growth_ratio": 0.101 },
      "fleet_utilization": 0.76,
      "average_daily_rate": {
        "current": 72.8,
        "previous": 70.1,
        "current_ron": 364.0,
        "previous_ron": 350.5
      }
    }
  ],
  "segment_performance": {
    "segments": [
      {
        "segment": "SUV",
        "revenue": {
          "current": 248300,
          "previous": 226100,
          "current_ron": 1241500,
          "previous_ron": 1130500
        },
        "net_profit": {
          "current": 81200,
          "previous": 74200,
          "current_ron": 406000,
          "previous_ron": 371000,
          "growth_ratio": 0.094
        },
        "share": 0.306
      },
      {
        "segment": "Compact",
        "revenue": {
          "current": 198400,
          "previous": 184900,
          "current_ron": 992000,
          "previous_ron": 924500
        },
        "net_profit": {
          "current": 61800,
          "previous": 56100,
          "current_ron": 309000,
          "previous_ron": 280500,
          "growth_ratio": 0.101
        },
        "share": 0.244
      },
      {
        "segment": "Economy",
        "revenue": {
          "current": 182600,
          "previous": 175000,
          "current_ron": 913000,
          "previous_ron": 875000
        },
        "net_profit": {
          "current": 51400,
          "previous": 47200,
          "current_ron": 257000,
          "previous_ron": 236000,
          "growth_ratio": 0.089
        },
        "share": 0.225
      }
    ],
    "totals": {
      "revenue": 812400,
      "revenue_ron": 4062000,
      "net_profit": 248600,
      "net_profit_ron": 1243000
    }
  },
  "city_performance": {
    "top_cities": [
      { "city": "București", "current": 872, "previous": 821, "growth_ratio": 0.062 },
      { "city": "Cluj-Napoca", "current": 424, "previous": 392, "growth_ratio": 0.082 },
      { "city": "Iași", "current": 288, "previous": 261, "growth_ratio": 0.103 }
    ],
    "growth_leaders": [
      { "city": "Brașov", "current": 176, "previous": 138, "growth_ratio": 0.275 },
      { "city": "Constanța", "current": 162, "previous": 131, "growth_ratio": 0.237 },
      { "city": "Sibiu", "current": 118, "previous": 94, "growth_ratio": 0.255 }
    ]
  },
  "channel_performance": {
    "mix": [
      { "label": "Direct", "current_percent": 46.2, "previous_percent": 44.0 },
      { "label": "Corporate", "current_percent": 31.5, "previous_percent": 29.2 },
      { "label": "OTA", "current_percent": 13.1, "previous_percent": 16.4 },
      { "label": "Agenții", "current_percent": 9.2, "previous_percent": 10.4 }
    ],
    "year_over_year": [
      { "label": "Corporate", "delta_percent": 2.3 },
      { "label": "Direct", "delta_percent": 2.2 },
      { "label": "Agenții", "delta_percent": -1.2 },
      { "label": "OTA", "delta_percent": -3.3 }
    ],
    "dominant_channel": { "label": "Direct", "current_percent": 46.2, "delta_percent": 2.2 }
  },
  "customer_insights": {
    "new_customers": { "unique": 982, "bookings": 1140, "revenue": 312400 },
    "repeat_customers": { "unique": 436, "bookings": 1342, "revenue": 500000 },
    "repeat_ratio": 0.307,
    "repeat_revenue_share": 0.615,
    "average_repeat_booking_value": 372.6
  },
  "operational_health": {
    "cancellations": {
      "current_count": 152,
      "previous_count": 171,
      "current_rate": 0.061,
      "previous_rate": 0.074
    },
    "average_rental_duration_days": { "current": 4.6, "previous": 4.3 },
    "fleet_utilization": { "current": 0.79, "previous": 0.74 }
  },
  "strategic_recommendations": [
    "Veniturile anuale au crescut cu 8.5% față de anul de comparație. Continuă politicile tarifare și campaniile eficiente.",
    "Trimestrul IV 2025 a avut cea mai slabă evoluție a veniturilor (10.6%). Planifică acțiuni dedicate pentru sezonul rece.",
    "Segmentul SUV generează 30.6% din venituri și 81,200 € profit. Extinde flota pentru a acoperi cererea.",
    "Canalul Direct a ajuns la 46.2% din rezervări, în creștere cu 2.2 pp. Scalează investițiile media proprii.",
    "Rata de retenție a clienților este 30.7%. Adaugă beneficii premium pentru a crește fidelizarea peste 45%.",
    "Lead time-ul mediu este 6.4 zile – creează campanii early booking pentru a bloca cererea din sezonul de vârf."
  ]
}
```

---

## Error handling
Invalid `period` or `by` values fall back to defaults. Missing authentication or permissions result in `401/403` from the middleware stack. Validation errors (e.g. non-integer `paginate`) use the standard Laravel JSON format.

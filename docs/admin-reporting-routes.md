# Rute admin – rapoarte de performanță

Acest document descrie noile pagini din consola de administrare dedicate analizelor săptămânale, lunare și trimestriale.
Toate rutele fac parte din zona protejată `/admin` și reutilizează layout-ul și sidebar-ul existente.

## Rezumat rute

| Rută | Descriere | Elemente principale |
| --- | --- | --- |
| `/admin/reports` | Pagină overview care agregă indicatori rapizi și trimiteri către rapoartele dedicate. | Carduri cu KPI (încasări, rezervări, utilizare flotă), grafic comparativ trimestrial, linkuri către rapoarte detaliate. |
| `/admin/reports/weekly` | Raport săptămânal pentru ultimele 7 zile. | Grafic zilnic, analiză canale, indicatori de risc, recomandări operaționale. |
| `/admin/reports/monthly` | Raport lunar pentru luna selectată (martie 2025 în mock). | KPI financiari, evoluție pe 6 luni, mix clienți, structură costuri, zone de focus. |
| `/admin/reports/quarterly` | Raport consolidat pentru trimestrul curent (Q1 2025). | KPI YoY/QoQ, venituri trimestriale, profit pe segmente, disponibilitate flotă, recomandări strategice. |

## Contract API pentru backend

Toate rutele de mai jos vor fi expuse prin Laravel în spațiul `/api/admin/reports/*`, necesită autentificare Sanctum și o permisiune din familia `reports.*`.

| Method & Endpoint | Utilizare UI | Observații |
| --- | --- | --- |
| `GET /api/admin/reports/overview` | Populează cardurile și graficul din `/admin/reports`. | Acceptă filtrare pe săptămână și trimestru de referință. |
| `GET /api/admin/reports/weekly` | Completează raportul `/admin/reports/weekly`. | Acceptă interval săptămânal custom și timezone. |
| `GET /api/admin/reports/monthly` | Completează raportul `/admin/reports/monthly`. | Permite comparații vs lună anterioară și anul precedent. |
| `GET /api/admin/reports/quarterly` | Completează raportul `/admin/reports/quarterly`. | Returnează agregări pe trimestre și segmente. |

### `GET /api/admin/reports/overview`

**Query params**

- `week_start` (ISO date, opțional) – luni din săptămâna analizată; default este săptămâna curentă.
- `quarter` (string `YYYY-Q{1|2|3|4}`, opțional) – trimestrul pentru graficul comparativ; dacă nu se trimite se folosește trimestrul curent.
- `timezone` (string Olson, implicit `Europe/Bucharest`) – utilizat pentru agregarea datelor calendaristice.

**Response**

```json
{
  "week": {
    "start": "2025-03-10",
    "end": "2025-03-16",
    "currency": "EUR",
    "revenue": { "current": 48200, "previous": 44100 },
    "bookings": { "current": 138, "previous": 124 },
    "fleet_utilization": { "current": 0.78, "previous": 0.74 }
  },
  "quarter": {
    "code": "2025-Q1",
    "comparison_code": "2024-Q1",
    "chart": [
      { "label": "Ianuarie", "current": 182000, "previous": 165000 },
      { "label": "Februarie", "current": 195400, "previous": 172500 },
      { "label": "Martie", "current": 221300, "previous": 204000 }
    ]
  },
  "links": [
    { "slug": "weekly", "title": "Raport săptămânal", "href": "/admin/reports/weekly" },
    { "slug": "monthly", "title": "Raport lunar", "href": "/admin/reports/monthly" },
    { "slug": "quarterly", "title": "Raport trimestrial", "href": "/admin/reports/quarterly" }
  ]
}
```

### `GET /api/admin/reports/weekly`

**Query params**

- `start_date` (ISO date, obligatoriu) – luni pentru intervalul de 7 zile.
- `compare_with` (enum: `previous_week`, `same_week_last_year`, `custom`, default `previous_week`).
- `custom_compare_start` (ISO date, necesar doar dacă `compare_with=custom`).
- `timezone` (string Olson, implicit `Europe/Bucharest`).

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
    "revenue": { "current": 48200, "previous": 44100 },
    "bookings": { "current": 138, "previous": 124 },
    "cancellations": { "current": 11, "previous": 15 },
    "average_duration_days": { "current": 4.2, "previous": 3.9 },
    "yoy": { "revenue_ratio": 0.11, "bookings_current": 138, "bookings_previous": 117 }
  },
  "daily_revenue": [
    { "label": "L", "current": 6200, "previous": 5800 },
    { "label": "Ma", "current": 6700, "previous": 6120 },
    { "label": "Mi", "current": 8200, "previous": 7050 },
    { "label": "J", "current": 7600, "previous": 6980 },
    { "label": "V", "current": 7200, "previous": 6890 },
    { "label": "S", "current": 9300, "previous": 8450 },
    { "label": "D", "current": 7200, "previous": 6810 }
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
    "late_returns_value": 720
  },
  "recommendations": [
    "Activează o campanie flash pentru segmentul economy în weekend pentru a reduce stocul disponibil.",
    "Propune partenerilor corporate un upgrade către SUV în lunile următoare pentru a crește ARPU.",
    "Optimizează paginile de destinație: conversia din trafic organic este 6.4%."
  ]
}
```

### `GET /api/admin/reports/monthly`

**Query params**

- `month` (string `YYYY-MM`, obligatoriu).
- `compare_with` (enum: `previous_month`, `same_month_last_year`, `custom`, default `previous_month`).
- `custom_compare` (string `YYYY-MM`, necesar dacă `compare_with=custom`).
- `timezone` (string Olson, implicit `Europe/Bucharest`).

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
    "revenue": { "current": 221300, "previous": 208400 },
    "net_profit": { "current": 68400, "previous": 61200 },
    "avg_daily_rate": { "current": 74.6, "previous": 71.2 },
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
    { "label": "Oct 2024", "revenue": 178200, "profit": 51400 },
    { "label": "Nov 2024", "revenue": 186500, "profit": 53800 },
    { "label": "Dec 2024", "revenue": 215300, "profit": 64200 },
    { "label": "Ian 2025", "revenue": 182000, "profit": 55600 },
    { "label": "Feb 2025", "revenue": 195400, "profit": 60100 },
    { "label": "Mar 2025", "revenue": 221300, "profit": 68400 }
  ],
  "customer_mix": [
    { "label": "Direct", "current_percent": 48, "previous_percent": 44 },
    { "label": "Corporate", "current_percent": 34, "previous_percent": 31 },
    { "label": "OTA", "current_percent": 11, "previous_percent": 15 },
    { "label": "Agenții", "current_percent": 7, "previous_percent": 10 }
  ],
  "cost_structure": {
    "fleet": { "current": 76400, "previous": 73100 },
    "operations": { "current": 29800, "previous": 28400 },
    "marketing": { "current": 18600, "previous": 21400 },
    "other": { "current": 9800, "previous": 9400 }
  },
  "focus_areas": [
    "Optimizează rotația stocului economy în weekend: gradul de utilizare a scăzut la 72%.",
    "Extinde pachetele corporate în Cluj-Napoca – creștere YoY de 18% la cerere.",
    "Continuă investițiile în remarketing: costul per rezervare s-a redus la 11,4 €."
  ]
}
```

### `GET /api/admin/reports/quarterly`

**Query params**

- `quarter` (string `YYYY-Q{1|2|3|4}`, obligatoriu).
- `compare_with` (enum: `previous_quarter`, `same_quarter_last_year`, `custom`, default `same_quarter_last_year`).
- `custom_compare` (string `YYYY-Q{1|2|3|4}`, necesar dacă `compare_with=custom`).
- `timezone` (string Olson, implicit `Europe/Bucharest`).

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
    "revenue": { "current": 598700, "previous": 541500 },
    "net_profit": { "current": 182400, "previous": 168900 },
    "ebitda_margin": { "current": 0.31, "previous": 0.29 },
    "fleet_utilization": { "current": 0.79, "previous": 0.75 }
  },
  "quarterly_revenue": [
    { "label": "Ianuarie", "current": 182000, "previous": 165000 },
    { "label": "Februarie", "current": 195400, "previous": 172500 },
    { "label": "Martie", "current": 221300, "previous": 204000 }
  ],
  "profit_by_segment": [
    { "segment": "Economy", "current": 41200, "previous": 38600 },
    { "segment": "Compact", "current": 48200, "previous": 45100 },
    { "segment": "SUV", "current": 61200, "previous": 52800 },
    { "segment": "Premium", "current": 31800, "previous": 32400 }
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

## Componente și culori

- Toate graficele folosesc componenta personalizată `TrendBarChart` (`components/admin/reports/charts.tsx`),
  construită pe bază de div-uri Tailwind pentru a evita dependințe externe.
- Culorile principale sunt cele definite în `tailwind.config.ts`: `bg-jade` pentru perioadele curente și `bg-berkeley/60`
  pentru comparații (an precedent / perioadă anterioară). Legenda este afișată în fiecare grafic pentru claritate.
- Badge-urile de variație (creștere/scădere) folosesc helper-ul `getDeltaTone` pentru a colora consistent rezultatele pozitive
  (verde) și negative (roșu).

## Permisiuni și navigație

- Sidebar-ul admin include acum intrarea „Rapoarte” (`/admin/reports`), vizibilă utilizatorilor care dețin permisiuni
  compatibile cu `reports.*`, `reports.analytics`, `reports.insights`, `reports.performance` sau `reports.kpi`.
- Subrutele sunt încărcate direct din `app/admin/reports/*` și pot fi extinse ulterior cu filtre sau integrare API, păstrând
  structura existentă.

## Date și viitoare integrare

- Datele din pagini sunt în prezent mock-uri, menite să arate structura finală. Pentru conectarea la API se recomandă adăugarea
  unor metode dedicate în `lib/api.ts` (ex. `getReportsSummary`, `getWeeklyReport`) și mutarea logicii de formatare într-un utilitar
  separat.
- Componentele pot fi reutilizate pentru alte rapoarte (ex. `yearly`) prin extinderea dataset-urilor și a legendelor.

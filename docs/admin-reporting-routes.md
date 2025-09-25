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

# Analytics Events & Reports API

Această documentație descrie capabilitățile introduse pentru monitorizarea acțiunilor vizitatorilor neautentificați, stocarea evenimentelor și expunerea statisticilor în panoul de administrare. Informațiile sunt împărțite pe trei arii: modelul de date, endpoint-ul public de colectare și rutele de administrare pentru rapoarte și detaliile vizitatorilor.

## Modelul de date `dacars_analytics_events`

| Coloana            | Tip                    | Descriere |
|--------------------|------------------------|-----------|
| `id`               | `BIGINT` autoincrement | Identificator intern al evenimentului. |
| `visitor_uuid`     | `UUID`                 | Identificatorul unic trimis din frontend pentru vizitator (persistent între sesiuni dacă este salvat în browser). |
| `session_uuid`     | `UUID`                 | Identificatorul sesiunii curente. Dacă frontend-ul nu îl trimite, aplicația generează unul pentru întregul lot de evenimente din request. |
| `event_type`       | `VARCHAR(100)`         | Tipul semantic al evenimentului (ex: `page_view`, `scroll`, `cta_click`). |
| `page_url`         | `VARCHAR(2048)`        | URL-ul complet al paginii pe care s-a produs evenimentul. |
| `referrer_url`     | `VARCHAR(2048)`        | URL-ul referer-ului (pagina anterioară), dacă este cunoscut. |
| `user_agent`       | `VARCHAR(1000)`        | Agentul utilizator (browser + platformă); dacă nu este trimis în payload se preia din antetul HTTP. |
| `ip_address`       | `VARCHAR(45)`          | Adresa IP de la nivelul cererii (IPv4 sau IPv6). |
| `country`          | `VARCHAR(100)`         | Codul sau denumirea țării asociate evenimentului (ex: `RO`, `Germany`). |
| `metadata`         | `JSON`                 | Detalii specifice evenimentului (vezi secțiunea „Structura metadata”). |
| `device`           | `JSON`                 | Informații despre dispozitiv raportate de frontend (rezoluție, platformă, limbă). |
| `occurred_at`      | `TIMESTAMP`            | Momentul exact în care evenimentul a avut loc în browser. |
| `created_at`       | `TIMESTAMP`            | Data stocării în baza de date. |
| `updated_at`       | `TIMESTAMP`            | Actualizat automat de Laravel (identic cu `created_at` pentru insert). |

### Structura `metadata`

`metadata` este un obiect JSON extensibil. Cheile standardizate suportate nativ în rapoarte sunt:

| Cheie                     | Tip        | Descriere |
|---------------------------|------------|-----------|
| `scroll_percentage`       | `number`   | Procentul maxim de scroll atins în cadrul evenimentului curent (0-100). |
| `scroll_pixels`           | `number`   | Numărul absolut de pixeli scrollați. |
| `duration_ms`             | `integer`  | Durata, în milisecunde, asociată evenimentului (ex: timpul petrecut pe pagină). |
| `page_time_ms`            | `integer`  | Timpul cumulat petrecut pe pagină până la momentul curent. |
| `component_visible_ms`    | `integer`  | Durata pentru care componenta activă a rămas vizibilă în viewport. |
| `interaction_target`      | `string`   | Selectorul sau identificatorul elementului cu care s-a interacționat (pentru click-uri). |
| `interaction_label`       | `string`   | Eticheta UX sau textul asociat acțiunii (ex: „Rezervă acum”). |
| `additional`              | `object`   | Spațiu liber pentru orice alt set de date contextual pe care frontend-ul îl consideră util. |

> Frontend-ul trimite duratele atât la nivel de pagină, cât și pentru componentele expuse. Backend-ul normalizează numeric aceste valori (`duration_ms`, `page_time_ms`, `component_visible_ms`) chiar și atunci când sosesc doar în `metadata.additional`, astfel încât să poată fi folosite direct în rapoarte.
>
> Pentru a reduce temporar volumul de date, frontend-ul nu mai emite în prezent evenimentele `scroll` și `component_view`. Backend-ul poate păstra logica de procesare pentru aceste tipuri, însă până la reactivare rapoartele vor primi valori zero sau lipsă pentru statisticile de scroll.

`metadata.additional` are câteva chei standardizate pentru evenimentele dedicate flotei auto:

| Cheie                     | Tip        | Descriere |
|---------------------------|------------|-----------|
| `car_id`                  | `integer`  | Identificatorul mașinii raportate. |
| `car_name`                | `string`   | Numele mașinii afișate în UI. |
| `car_type`                | `string`   | Tipul/segmentul mașinii (ex: `SUV`, `electric`). |
| `car_license_plate`       | `string`   | Numărul de înmatriculare trimis de API pentru identificare rapidă. |
| `section_additional`      | `object`/`string` | Payload suplimentar serializat pentru componenta vizibilă (ex: filtre active). |

### Evenimente de vizibilitate a componentelor (`component_view`)

Atunci când vizitatorul părăsește vizibilitatea unei secțiuni marcate cu `data-analytics-scroll-section="true"`, frontend-ul trimite un
eveniment suplimentar `component_view`. Payload-ul include:

* `interaction_target` / `interaction_label` – identitatea componentei (ex: `car-card:123`) și eticheta UX extrasă din conținut.
* `duration_ms` și `component_visible_ms` – durata totală (în milisecunde) în care secțiunea a rămas în zona activă a viewport-ului.
* `page_time_ms` – timpul cumulat petrecut pe pagină până la finalizarea vizibilității.
* `additional.section_additional` – metadata serializată din atributul `data-analytics-scroll-metadata` (ex: `car_id`, `car_name`, filtre active)
  pentru a reconstrui contextul expunerii.

Evenimentele sunt emise atât la schimbarea secțiunii active, cât și înainte de `beforeunload` sau la schimbarea rutei, astfel încât ultima componentă vizualizată să fie raportată corect. Momentan, aceste emiteri sunt dezactivate în frontend până la finalizarea optimizărilor de volum pentru raportare.

### Evenimentul `custom:car_view`

Frontend-ul emite un eveniment `custom:car_view` o singură dată pentru fiecare card de mașină vizibil pe pagina publică `/cars`. Metadata conține:

* `interaction_target` / `interaction_label` – identificatorul cardului (`car-card:<id>`) și numele mașinii afișate.
* `additional.car_id`, `additional.car_name`, `additional.car_type` – contextul standard folosit în rapoarte și pentru segmentări.
* `additional.car_license_plate` – numărul de înmatriculare raportat de API; backend-ul îl normalizează și îl persistează pentru filtrare rapidă.
* alte câmpuri complementare (`price_per_day`, `view_mode`, `card_index`, filtre active) care ajută la reconstruirea contextului.

Backend-ul poate folosi `car_license_plate` pentru a corela evenimentele cu înregistrările din tabelul flotei fără look-up suplimentar după `car_id`.

## Convenții pentru `event_type`

Sugestii de valori standard utilizate în rapoarte:

| Tip            | Scop |
|----------------|------|
| `page_view`    | Vizualizare de pagină. Folosit pentru numărul de vizite și pagini de top. |
| `scroll`       | Progresul de scroll; se așteaptă valori în `metadata.scroll_percentage` / `scroll_pixels` (dezactivat temporar în frontend). |
| `page_duration`| Finalizarea vizitei unei pagini; `metadata.duration_ms` / `page_time_ms` includ timpul vizibil cumulat. |
| `cta_click`    | Click pe un buton/CTA. Se recomandă completarea câmpurilor `metadata.interaction_target` și `interaction_label`. |
| `form_start` / `form_submit` | Interacțiuni cu formulare (inițiere, trimitere, validare). |
| `video_play` / `video_complete` | Evenimente media. |
| `custom:*`     | Prefix pentru evenimente specifice business-ului (ex: `custom:wheel_spin`). |

Frontend-ul poate defini și alte valori, cu condiția să păstreze un naming clar; toate apar în rapoartele de tip.

### Structura `device`

| Cheie       | Tip       | Descriere |
|-------------|-----------|-----------|
| `width`     | `integer` | Lățimea viewport-ului în pixeli. |
| `height`    | `integer` | Înălțimea viewport-ului în pixeli. |
| `platform`  | `string`  | Platforma raportată de browser (`ios`, `android`, `windows`, etc.). |
| `language`  | `string`  | Limba activă în browser (ex: `ro-RO`). |
| `timezone`  | `string`  | Zona orară a dispozitivului (`Europe/Bucharest`). |

## Endpoint de colectare (public)

```
POST /api/analytics/events
```

Calea este publică și nu necesită autentificare. Se validează strict schema de mai jos; maximum 50 de evenimente pot fi trimise într-o singură cerere pentru a preveni abuzurile.

### Payload

```json
{
  "visitor_uuid": "d2a68c2a-0c6f-4a21-8c2c-1a90d9f4bc31",
  "country": "RO",
  "session_uuid": "d0f8c512-3bd3-4b2e-948a-2b2b3fcdf1f5",
  "events": [
    {
      "type": "page_view",
      "occurred_at": "2025-02-13T18:20:00+02:00",
      "page_url": "https://www.dacars.ro/",
      "country": "RO",
      "referrer_url": "https://google.com/",
      "metadata": {
        "duration_ms": 4200
      },
      "device": {
        "width": 1440,
        "height": 900,
        "platform": "macOS",
        "language": "ro-RO"
      }
    },
    {
      "type": "scroll",
      "occurred_at": "2025-02-13T18:20:05+02:00",
      "page_url": "https://www.dacars.ro/",
      "metadata": {
        "scroll_percentage": 85.5,
        "scroll_pixels": 3200
      }
    }
  ]
}
```

> Câmpul `country` este opțional atât la nivel de request, cât și în fiecare obiect din `events`. Dacă este specificat doar în
> rădăcina payload-ului, valoarea este aplicată tuturor evenimentelor; un `events[i].country` explicit are prioritate și permite
> raportarea unor interacțiuni cu țări diferite în cadrul aceleiași sesiuni.

### Răspuns

```json
{
  "stored": 2,
  "visitor_uuid": "d2a68c2a-0c6f-4a21-8c2c-1a90d9f4bc31",
  "session_uuid": "d0f8c512-3bd3-4b2e-948a-2b2b3fcdf1f5"
}
```

> Dacă `session_uuid` lipsește din payload, backend-ul generează un UUID unic valabil pentru toate evenimentele din request și îl expune în răspuns pentru ca frontend-ul să îl poată reutiliza.

## Rute administrative

Toate rutele sunt protejate de `auth:sanctum` și de middleware-ul `permission`. Denumirile permisiunilor sunt indicate pentru maparea lor în UI.

### Listarea evenimentelor brute

```
GET /api/admin/analytics/events
Permisiune: analytics_events.view
```

Parametri de query:

| Parametru      | Tip      | Descriere |
|----------------|----------|-----------|
| `visitor_uuid` | `uuid`   | Filtrează după vizitator. |
| `session_uuid` | `uuid`   | Filtrează după sesiune. |
| `event_type`   | `string` | Filtrează după tipul evenimentului. |
| `country`      | `string` | Limitează rezultatele la evenimentele raportate pentru o anumită țară. |
| `page_url`     | `string` | Căutare parțială în URL-ul paginii. |
| `interaction_target` | `string` | Filtrare exactă după `metadata.interaction_target`. |
| `interaction_label` | `string` | Căutare parțială (case-insensitive) în `metadata.interaction_label`. |
| `car_id`       | `string` | Filtrare după `metadata.additional.car_id` sau `metadata.additional.section_additional.car_id`. |
| `car_name`     | `string` | Căutare parțială (case-insensitive) după numele mașinii raportate. |
| `car_license_plate` | `string` | Căutare parțială (case-insensitive) după numărul de înmatriculare din metadata. |
| `from`         | `string` (ISO8601) | Limita inferioară a intervalului `occurred_at`. |
| `to`           | `string` (ISO8601) | Limita superioară a intervalului `occurred_at`. |
| `per_page`     | `integer` | Dimensiunea paginii (1-100, implicit 50). |

Răspunsul este paginat conform convențiilor Laravel și folosește `AnalyticsEventResource`, care expune câmpurile evenimentului (inclusiv `country`), plus un obiect `scroll` (procent/pixeli), contextul mașinii (`car_id`, `car_name`, `car_type`, `car_license_plate`) și normalizează numeric `duration_ms`, `page_time_ms` și `component_visible_ms` chiar dacă valorile provin din `metadata.additional`.

```
GET /api/admin/analytics/events/{id}
Permisiune: analytics_events.view_detail
```

Returnează payload-ul complet al evenimentului specificat.

### Rezumat statistic

```
GET /api/admin/analytics/reports/summary
Permisiune: analytics_reports.view_summary
```

Parametri:

| Parametru | Tip | Descriere |
|-----------|-----|-----------|
| `from`    | `string` (ISO8601) | Data/ora de început a intervalului analizat. |
| `to`      | `string` (ISO8601) | Data/ora de final. |
| `days`    | `integer`          | Alternativă rapidă: numărul de zile înapoi față de `now` (implicit 7, maxim 90). Ignorat dacă `from`/`to` sunt prezente. |

Răspunsul conține:

* `range`: intervalul utilizat în calcule.
* `totals.events`: numărul total de evenimente.
* `totals.unique_visitors`: vizitatori unici în interval.
* `totals.unique_sessions`: sesiuni unice cu evenimente.
* `totals.average_events_per_visitor`: media evenimentelor pe vizitator.
* `totals.average_events_per_session`: media evenimentelor pe sesiune.
* `events_by_type`: distribuția evenimentelor pe tip (include `total_events` agregat și `items` cu perechi `type`/`total_events`/`share`).
* `daily_activity`: timeline zilnic cu număr de evenimente și vizitatori.
* `top_pages`: primele 10 pagini după trafic (include `share` ca fracție din totalul evenimentelor, în intervalul `[0, 1]`).
* `countries`: top țări după numărul de evenimente (cu `total_events`, `unique_visitors` și `share`).
* `scroll`: statistici agregate pe evenimentele de tip `scroll` (medie/maxim procent și pixeli, număr total de evenimente).

### Top pagini

```
GET /api/admin/analytics/reports/pages
Permisiune: analytics_reports.view_pages
```

Parametri: aceiași ca la `summary`, plus `limit` (1-100, implicit 10) și `event_type` (pentru a analiza doar un anumit tip de eveniment, ex: `page_view`).

Răspunsul include intervalul, tipul filtrat și lista paginilor cu câmpurile `page_url`, `total_events`, `unique_visitors`, `share`.

### Distribuție pe țări

```
GET /api/admin/analytics/reports/countries
Permisiune: analytics_reports.view_countries
```

Parametri: identici cu `summary`, plus `limit` (1-200, implicit 20).

Răspunsul conține intervalul folosit, `total_events` și lista `items` cu următoarele câmpuri:

* `country` – codul sau denumirea țării (poate fi `null` dacă frontend-ul nu a furnizat informația).
* `total_events` – numărul de evenimente din țara respectivă.
* `unique_visitors` – vizitatori unici care au generat evenimente din țara respectivă.
* `share` – fracția din totalul evenimentelor din interval (`[0, 1]`).

### Vizitatori de top

```
GET /api/admin/analytics/reports/visitors
Permisiune: analytics_reports.view_visitors
```

Parametri: interval (`from`/`to`/`days`), `per_page` (1-100, implicit 25) și `country` (opțional) pentru filtrare după țară.

Rezultatul este un obiect JSON cu `range`, `data` (lista vizitatorilor) și `meta` (detalii de paginare). Fiecare intrare din `data` conține:

* `visitor_uuid`
* `total_events`
* `total_sessions`
* `first_seen` / `last_seen` în format ISO8601
* `last_country` – țara ultimei interacțiuni (dacă este disponibilă)

### Detaliu vizitator

```
GET /api/admin/analytics/reports/visitors/{visitorUuid}
Permisiune: analytics_reports.view_visitors
```

Parametri: interval (`from`/`to`/`days`) și `limit` (numărul maxim de evenimente recente returnate, 1-500, implicit 100).

Răspunsul este structurat astfel:

* `visitor_uuid`
* `range`
* `totals.events` – numărul total de evenimente în interval
* `totals.pages` – pagini distincte vizitate
* `totals.first_seen` / `totals.last_seen`
* `events_by_type` – agregare pe tipuri
* `pages` – lista paginilor accesate de vizitator și numărul de evenimente pe fiecare
* `sessions` – sesiunile unice cu timpii `first_seen`/`last_seen`
* `countries` – distribuția evenimentelor vizitatorului pe țări (`country`, `total_events`)
* `recent_events` – ultimele `limit` evenimente sub formă de array compatibil cu `AnalyticsEventResource` (include câmpul `country`)

## Calculul metricalor

* `unique_visitors` – `COUNT(DISTINCT visitor_uuid)` în interval.
* `unique_sessions` – `COUNT(DISTINCT session_uuid)` excluzând valorile `null`.
* `average_events_per_visitor` – raportul `total_events / unique_visitors` (0 dacă nu există vizitatori).
* `average_events_per_session` – raportul `total_events / unique_sessions` (0 dacă nu există sesiuni).
* `share` pentru top pagini și distribuția pe tipuri – proporția din totalul evenimentelor din interval, livrată ca număr zecimal în `[0, 1]` (0 dacă totalul este 0).
* Statistica de scroll – se calculează doar din evenimentele cu `event_type = "scroll"` care au valori numerice valide în metadata (inclusiv în `metadata.additional`).
* Valorile lipsă se normalizează la `0` (sau `null` acolo unde este cazul) astfel încât răspunsurile să nu conțină `NaN` sau stringuri în loc de numere. Atât `events_by_type.total_events` cât și `unique_visitors` sunt livrate ca întregi.

## Considerații de integrare frontend

1. Păstrați `visitor_uuid` într-un cookie/localStorage pentru a urmări același vizitator între sesiuni.
2. Trimiteți `session_uuid` odată ce începe sesiunea (ex: la `window.load`) și reutilizați-l până la închiderea tab-ului.
3. Normalizați timpii (`occurred_at`) la format ISO8601 cu offset (ex: `new Date().toISOString()`).
4. Respectați limitele de 50 de evenimente / request și 1000 de caractere pentru stringuri.
5. Pentru evenimente batch, păstrați ordinea cronologică în array pentru a facilita rapoartele.

Prin aceste endpoint-uri se poate reconstrui traseul complet al vizitatorilor anonimi, identifica paginile cu implicare ridicată și calcula rate de scroll/durată, toate accesibile din panoul de administrare. Documentația poate fi extinsă pe măsură ce apar noi tipuri de evenimente sau câmpuri în metadata.

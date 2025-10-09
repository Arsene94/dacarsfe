# Configurare Mixpanel pentru DaCars

Această notă explică modul în care aplicația folosește Mixpanel după migrarea la noul snippet oficial.

## 1. SDK și inițializare
- `lib/mixpanelClient.ts` importă direct SDK-ul și apelează snippet-ul recomandat de Mixpanel:
  ```ts
  import mixpanel from "mixpanel-browser";

  mixpanel.init("a53fd216120538a8317818b44e4e50a3", {
      autocapture: true,
      record_sessions_percent: 100,
      api_host: "https://api-eu.mixpanel.com",
  });
  ```
- Token-ul este integrat în cod – nu mai sunt necesare variabile de mediu precum `NEXT_PUBLIC_MIXPANEL_TOKEN` sau flag-ul de debug.
- Inițializarea se face o singură dată pe client (`ensureMixpanel()` păstrează un flag `isInitialized`).

## 2. Page views și rute
`components/MixpanelInitializer.tsx` rulează din `app/layout.tsx` și:
1. Apelează `initMixpanel()` la montare și pe fiecare schimbare de rută.
2. Trimite `trackPageView()` (evenimentul `"Page View"`) cu proprietatea `url` atunci când ruta s-a schimbat.

Nu este nevoie de configurări suplimentare în Mixpanel pentru a vizualiza aceste page views.

## 3. Identitate
`context/AuthContext.tsx` folosește helper-ele expuse din `lib/mixpanelClient.ts`:
- `identifyMixpanelUser(id, traits)` identifică utilizatorii autentificați și setează proprietăți People prin `mixpanel.people.set`.
- `identifyAnonymousMixpanelVisitor()` generează un ID `anon:<uuid>` atunci când nu există identitate și îl înregistrează ca vizitator anonim.
- `resetMixpanelIdentity()` resetează complet starea Mixpanel (folosit la logout).

Helper-ele sanitizează proprietățile înainte de a le trimite, eliminând valorile `undefined` și convertind datele la formate compatibile (Date → ISO, obiecte imbricate etc.).

## 4. Evenimente custom trimise din aplicație
Următoarele evenimente sunt trimise explicit. Numele sunt sensibile la literă și trebuie folosite **exact** în Mixpanel → Lexicon.

| Nume eveniment (exact) | Locație în cod | Descriere |
| --- | --- | --- |
| `landing_view` | `components/home/HomePageClient.tsx` | Trimis după ce landing-ul a încărcat promoțiile și starea roții norocului. |
| `hero_form_submit` | `components/HeroBookingForm.tsx` | Utilizatorul trimite formularul principal de căutare. |
| `fleet_filters_updated` | `components/cars/CarsPageClient.tsx` | Orice schimbare de filtru în pagina de flotă. |
| `car_cta_clicked` | `components/cars/CarsPageClient.tsx` | Utilizatorul apasă CTA-ul unei mașini pentru a continua spre checkout. |
| `checkout_loaded` | `app/checkout/page.tsx` | Checkout-ul se încarcă cu selecțiile curente. |
| `checkout_submitted` | `app/checkout/page.tsx` | Rezervarea este trimisă către backend. |

### Proprietăți trimise pentru fiecare eveniment
| Eveniment | Nume proprietate | Semnificație |
| --- | --- | --- |
| `landing_view` | `has_booking_range` | Există un interval de rezervare activ în context. |
|  | `booking_range_key` | Cheia intervalului selectat (ex. `this-weekend`). |
|  | `wheel_popup_shown` | Pop-up-ul cu roata norocului a fost afișat. |
|  | `wheel_period_id` | ID-ul perioadei active din campanie (sau `null`). |
|  | `wheel_active_month_match` | Intervalul rezervării se suprapune cu lunile eligibile. |
| `hero_form_submit` | `start_date`, `end_date` | Intervalul selectat în formular (string ISO). |
|  | `location` | Locația aleasă pentru ridicare. |
|  | `car_type` | Tipul de mașină selectat (slug). |
| `fleet_filters_updated` | `filter_key` | Filtrul modificat (`transmission`, `car_type`, etc.). |
|  | `filter_value` | Valoarea aplicată filtrului. |
|  | `view_mode` | Modul de afișare curent (`grid` / `list`). |
|  | `search_term` | Termenul de căutare liber (sau `null`). |
|  | `sort_by` | Criteriul de sortare activ. |
|  | `page` | Indexul paginii după aplicarea filtrului. |
|  | `total_results` | Numărul de mașini disponibile după filtrare. |
| `car_cta_clicked` | `car_id`, `car_name` | Mașina selectată. |
|  | `with_deposit` | Dacă oferta implică depozit. |
|  | `car_price_plan` | Planul de preț (`with_deposit` / `no_deposit`). |
|  | `car_price_per_day` | Prețul pe zi (număr). |
|  | `car_total` | Totalul estimat pentru intervalul curent. |
|  | `start_date`, `end_date` | Intervalul rezervării (sau `null`). |
|  | `view_mode` | Modul de afișare în momentul click-ului. |
| `checkout_loaded` | `selected_car_id`, `selected_car_name` | Mașina selectată în checkout. |
|  | `with_deposit` | Starea selecției privind depozitul (`true` / `false` / `null`). |
|  | `booking_start`, `booking_end` | Intervalul curent din checkout (sau `null`). |
|  | `preselected_service_ids` | ID-urile serviciilor preselectate. |
|  | `applied_offer_ids` | ID-urile ofertelor aplicate în ofertă. |
|  | `has_wheel_prize` | Există premiu de la roata norocului. |
|  | `wheel_prize_id` | ID-ul premiului (sau `null`). |
|  | `quote_ready` | Oferta backend este disponibilă. |
| `checkout_submitted` | `reservation_id` | ID-ul rezervării returnat de backend (fallback random). |
|  | `car_id` | ID-ul mașinii rezervate. |
|  | `with_deposit` | Starea depozitului în payload-ul trimis. |
|  | `price_per_day`, `sub_total`, `total`, `total_services` | Detalii de cost. |
|  | `coupon_amount`, `offers_discount`, `wheel_prize_discount` | Reduceri aplicate (sau `null`). |
|  | `deposit_waived` | Depozitul a fost eliminat. |
|  | `wheel_prize_id` | ID-ul premiului folosit (sau `null`). |
|  | `applied_offer_ids` | Ofertelor aplicate în momentul trimiterii. |

## 5. Debug și verificare
- Confirmă în Developer Tools → Network că request-urile merg către `https://api-eu.mixpanel.com` și conțin token-ul `a53fd216120538a8317818b44e4e50a3`.
- Pentru depanare rapidă, folosește Mixpanel → Live View și filtrează după evenimentele de mai sus.

Respectând aceste note, integrarea Mixpanel va funcționa out-of-the-box cu noul snippet.

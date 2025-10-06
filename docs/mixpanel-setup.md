# Configurare Mixpanel pentru DaCars

Această notă descrie pașii necesari pentru conectarea corectă a proiectului la Mixpanel și evenimentele trimise din aplicație.

## 1. Variabile de mediu
Adaugă în `.env.local` următoarele variabile (folosite în `lib/mixpanelClient.ts`):

| Variabilă | Rol |
| --- | --- |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Tokenul proiectului Mixpanel. Fără el SDK-ul nu se inițializează. |
| `NEXT_PUBLIC_MIXPANEL_DEBUG` (opțional) | `true` activează log-uri detaliate în consolă pentru debugging; setează `false` în producție dacă vrei să oprești complet log-urile. |

După modificarea `.env.local`, repornește serverul Next.js (`npm run dev`) pentru ca valoarea token-ului să fie injectată.

## 2. Inițializare și page views
`components/MixpanelInitializer.tsx` rulează global din `app/layout.tsx`. Pe fiecare schimbare de rută:

1. Apelează `initMixpanel()` – configurează SDK-ul cu setările din `lib/mixpanelClient.ts` (`autocapture`, persistarea în cookie, fallback fără `localStorage`).
2. Trimite evenimentul `Page View` (nume exact `"Page View"`) cu proprietăți standard: `url`, `path`, `title`, `referrer`, `locale`, `timestamp`.

Nu este nevoie de configurări suplimentare în Mixpanel pentru page views, dar poți defini un raport/funnel folosind evenimentul `Page View`.

## 3. Identitate și super proprietăți
`AuthContext` gestionează identitatea:

- Utilizatorii autentificați sunt identificați cu `identifyMixpanelUser`, folosind ID-ul din backend (`user.id`) și trăsături precum email, roluri, permisiuni.
- Vizitatorii anonimi sunt identificați cu `identifyAnonymousMixpanelVisitor`. Se folosește IP-ul expus de endpoint-ul `app/api/ip/route.ts`; dacă IP-ul nu poate fi obținut, se generează un ID `anon:<uuid>`.
- Super proprietăți comune pentru toate evenimentele: `is_authenticated`, `mixpanel_user_id`, iar pentru anonimi `anonymous_identity_source`.

Asigură-te că infrastructura (reverse proxy / CDN) forwardează headerele IP (ex. `x-forwarded-for`) către Next.js, pentru ca endpoint-ul `/api/ip` să funcționeze.

## 4. Evenimente custom trimise din aplicație
Codul trimite explicit următoarele evenimente (numele sunt sensibile la literă și trebuie folosite **exact** la configurarea în Mixpanel → Lexicon). Coloana „Display name” este doar recomandată pentru lizibilitate în interfață.

| Nume eveniment (exact) | Display name recomandat | Locație în cod | Descriere |
| --- | --- | --- | --- |
| `landing_view` | „Landing view” | `components/home/HomePageClient.tsx` | Se trimite o singură dată după ce landing-ul a încărcat datele promoției curente. |
| `hero_search_submitted` | „Hero search submitted” | `components/HeroSection.tsx` | Capturarea căutărilor făcute din formularul principal de pe landing. |
| `fleet_filters_updated` | „Fleet filters updated” | `components/cars/CarsPageClient.tsx` | Orice schimbare a filtrelor/listării din pagina de flotă. |
| `car_cta_clicked` | „Car CTA clicked” | `components/cars/CarsPageClient.tsx` | Utilizatorul apasă pe CTA-ul unei mașini pentru a merge spre checkout. |
| `checkout_loaded` | „Checkout loaded” | `app/checkout/page.tsx` | Checkout-ul se încarcă cu oferta selectată și serviciile implicite. |
| `checkout_submitted` | „Checkout submitted” | `app/checkout/page.tsx` | Rezervarea este trimisă către backend (după validări locale). |

### Proprietăți trimise pentru fiecare eveniment
În Lexicon → tab-ul „Properties” setează aceleași nume ca în coloana „Nume proprietate” (nu le traduce și nu introduce spații). Tipurile sunt deduse automat, dar le poți marca manual pentru rapoarte mai clare.

| Eveniment | Nume proprietate | Tip recomandat | Semnificație |
| --- | --- | --- | --- |
| `landing_view` | `has_booking_range` | Boolean | Indică dacă landing-ul are deja un interval de rezervare (venit din context). |
|  | `booking_range_key` | String | Cheia internă a intervalului selectat (ex. `this-weekend`). |
|  | `wheel_popup_shown` | Boolean | A fost afișat pop-up-ul cu roata norocului. |
|  | `wheel_period_id` | String | ID-ul perioadei active din campania roții (sau `null`). |
|  | `wheel_active_month_match` | Boolean | Intervalul ales se suprapune cu lunile eligibile pentru premiu. |
| `hero_search_submitted` | `start_date` | Date (string ISO) | Data de început selectată în căutare. |
|  | `end_date` | Date (string ISO) | Data de final selectată. |
|  | `location` | String | Locația aleasă din selector. |
|  | `car_type` | String | Tipul de mașină selectat (slug intern). |
|  | `booking_synced` | Boolean | Dacă selecția a fost sincronizată cu contextul de booking. |
| `fleet_filters_updated` | `filter_key` | String | Numele filtrului modificat (ex. `transmission`). |
|  | `filter_value` | String / Array | Valoarea aplicată filtrului (sanitizată la string sau listă). |
|  | `view_mode` | String | Mod de afișare flotă (`grid`/`list`). |
|  | `search_term` | String | Termenul liber introdus în căutare. |
|  | `sort_by` | String | Criteriul de sortare activ. |
|  | `page` | Number | Indexul paginii din lista de rezultate. |
|  | `total_results` | Number | Numărul de mașini disponibile după filtrare. |
| `car_cta_clicked` | `car_id` | String | ID-ul mașinii. |
|  | `car_name` | String | Numele afișat al mașinii. |
|  | `with_deposit` | Boolean | Dacă oferta curentă include depozit. |
|  | `car_price_plan` | String | Planul de preț selectat (ex. `standard`). |
|  | `car_price_per_day` | Number | Prețul/zi în euro. |
|  | `car_total` | Number | Total estimat pentru perioada selectată. |
|  | `start_date` | Date (string ISO) | Data începerii rezervării. |
|  | `end_date` | Date (string ISO) | Data încheierii rezervării. |
|  | `view_mode` | String | Mod de afișare când s-a apăsat CTA-ul (`grid`/`list`). |
| `checkout_loaded` | `selected_car_id` | String | Mașina preselectată. |
|  | `selected_car_name` | String | Numele mașinii preselectate. |
|  | `with_deposit` | Boolean | Dacă oferta curentă implică depozit. |
|  | `booking_start` | Date (string ISO) | Data de început din checkout. |
|  | `booking_end` | Date (string ISO) | Data de final din checkout. |
|  | `preselected_service_ids` | Array | ID-urile serviciilor pre-activate. |
|  | `applied_offer_ids` | Array | ID-urile ofertelor aplicate. |
|  | `has_wheel_prize` | Boolean | Există premiu câștigat la roată pentru rezervare. |
|  | `wheel_prize_id` | String | ID-ul premiului din roată (dacă există). |
|  | `quote_ready` | Boolean | Oferta backend este gata și sincronizată. |
| `checkout_submitted` | `reservation_id` | String | ID-ul rezervării returnat de backend. |
|  | `car_id` | String | ID-ul mașinii rezervate. |
|  | `with_deposit` | Boolean | Rezervarea finală implică depozit. |
|  | `price_per_day` | Number | Prețul/zi final. |
|  | `sub_total` | Number | Subtotalul înainte de reduceri. |
|  | `total` | Number | Totalul plătit de client. |
|  | `total_services` | Number | Valoarea cumulată a serviciilor extra. |
|  | `coupon_amount` | Number | Reducerea aplicată prin cupon. |
|  | `offers_discount` | Number | Reducerea totală din oferte. |
|  | `wheel_prize_discount` | Number | Discount provenit din premiul roții. |
|  | `deposit_waived` | Boolean | Depozitul a fost eliminat. |
|  | `wheel_prize_id` | String | ID-ul premiului folosit în această rezervare. |
|  | `applied_offer_ids` | Array | ID-urile ofertelor aplicate la momentul trimiterii. |

Toate payload-urile trec printr-un sanitizator (`sanitizeMixpanelProperties`) care elimină valorile `undefined`, conversiile `Date → ISO`, listele goale, etc. Nu este nevoie de transformări suplimentare în Mixpanel.

### Recomandări în Mixpanel
- Creează dashboards pentru funnel-ul „Landing → Hero search → Fleet filter → Checkout Loaded → Checkout Submitted”.
- Definirea de proprietăți user-level (People properties) va prelua automat câmpurile trimise la identificare (`email`, `roles`, etc.).
- Activează „Lexicon” în proiectul Mixpanel și adaugă descrierile de mai sus pentru a păstra consistența între echipe.

## 5. Debug și verificare
- În dezvoltare setează `NEXT_PUBLIC_MIXPANEL_DEBUG=true` pentru a vedea în consolă log-uri grupate (`[Mixpanel][timestamp] ...`).
- Confirmă în Developer Tools → Network că request-urile către `https://api.mixpanel.com/track/` sau `1/track` conțin token-ul corect și proprietățile așteptate.
- Dacă migrezi proiectul în producție, setează `NEXT_PUBLIC_MIXPANEL_DEBUG=false` și validează că domeniul public are acces la token-ul Mixpanel potrivit mediului.

Respectând pașii de mai sus, integrarea Mixpanel va funcționa out-of-the-box cu codul existent.

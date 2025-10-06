# Configurare și evenimente Meta Pixel (Facebook)

Integrarea Meta Pixel rulează global prin `MetaPixelScript` și `MetaPixelInitializer`, încărcate în `app/layout.tsx`. Pentru activare este necesară variabila de mediu publică `NEXT_PUBLIC_META_PIXEL_ID`. Dacă variabila lipsește, scriptul nu este injectat, iar apelurile `trackMetaPixelEvent`/`trackMetaPixelPageView` sunt ignorate în siguranță.

## Evenimente urmărite

| Eveniment Meta | Trigger în aplicație | Fișier sursă | Proprietăți trimise |
| -------------- | -------------------- | ------------ | -------------------- |
| `PageView` | La fiecare schimbare de rută în App Router (după prima încărcare) | `components/MetaPixelInitializer.tsx` | – |
| `ViewContent` | 1) prima încărcare a paginii de flotă cu rezultate; 2) afișarea landing page-ului public | `components/cars/CarsPageClient.tsx`, `components/home/HomePageClient.tsx` | `content_type`, `content_ids`, `contents`, `value`, `currency`, `total_results`, `search_string`, `sort_by`, `booking_range_key`, `wheel_period_id`, `wheel_popup_shown`. |
| `Search` | Căutări din hero form și ajustări de filtre pe pagina flotei | `components/HeroSection.tsx`, `components/cars/CarsPageClient.tsx` | `search_source`, `search_string`, `content_type`, `content_category`, `filter_key`, `filter_value`, `location`, `car_type`, `start_date`, `end_date`, `page`, `sort_by`, `total_results`. |
| `AddToCart` | Click pe CTA-ul unei mașini pentru a continua spre checkout | `components/cars/CarsPageClient.tsx` | `content_ids`, `content_name`, `content_type`, `contents`, `value`, `currency`, `start_date`, `end_date`, `with_deposit`. |
| `InitiateCheckout` | Prima încărcare completă a checkout-ului (când există mașină și interval valid) | `app/checkout/page.tsx` | `value`, `currency`, `content_ids`, `content_name`, `content_type`, `contents`, `start_date`, `end_date`, `with_deposit`, `service_ids`, `applied_offer_ids`. |
| `Lead` | Trimiterea formularului de rezervare din checkout | `app/checkout/page.tsx` | `form_name`, `value`, `currency`, `content_ids`, `content_name`, `content_type`, `contents`, `with_deposit`, `start_date`, `end_date`, `service_ids`, `applied_offer_ids`. |
| `Purchase` | Afișarea paginii de succes după rezervare (odată pe sesiune) | `app/success/page.tsx` | `value`, `currency`, `content_ids`, `content_name`, `content_type`, `contents`, `reservation_id`, `start_date`, `end_date`, `with_deposit`, `service_ids`. |
| `Contact` | Click pe telefon, WhatsApp sau email în secțiunea de contact | `components/ContactSection.tsx` | `contact_method`, `value`. |

Toate payload-urile sunt igienizate în `lib/metaPixel.ts` pentru a elimina valori `undefined`, liste goale sau date invalide înainte de trimiterea către Facebook.

## Pași de validare

1. Adaugă `NEXT_PUBLIC_META_PIXEL_ID` în `.env.local`.
2. Rulează aplicația (`npm run dev`) și verifică în browser, cu Meta Pixel Helper, că evenimentele de mai sus apar cu status „Received”.
3. Pentru scenariile checkout/succes, folosește fluxul complet din pagina „Flotă” pentru a popula `BookingContext` (selectează mașină, perioadă, finalizează formularul). Evenimentele `Lead` și `Purchase` se trimit doar după completarea integrală a procesului.

## Extensii recomandate

- **Advanced Matching** – dacă backend-ul acceptă hashing pentru email/telefon, se poate extinde `initMetaPixel` pentru a apela `fbq('init', ID, { em: hashEmail, ph: hashPhone })` folosind datele introduse în checkout.
- **Evenimente suplimentare** – pentru formulare noi (ex. newsletter, demo drive) reutilizează `trackMetaPixelEvent` cu evenimente standard (`CompleteRegistration`, `Subscribe` etc.).
- **Debugging** – în dezvoltare poți activa `fbq('trackCustom', 'DebugEvent', {...})` din componente locale pentru a valida payload-uri noi fără a afecta rapoartele de producție.


# Configurare și evenimente TikTok Pixel

Integrarea TikTok Pixel rulează global prin `TikTokPixelScript` și `TikTokPixelInitializer`, încărcate din `app/layout.tsx`. Pentru activare este necesară variabila de mediu publică `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (vezi și actualizarea din `README.md`). Dacă variabila lipsește, scriptul nu este injectat și apelurile `trackTikTokEvent` sunt ignorate în siguranță.

## Evenimente urmărite

| Eveniment TikTok | Trigger în aplicație | Fișier sursă | Proprietăți trimise |
| ---------------- | -------------------- | ------------ | -------------------- |
| `PageView` | La fiecare schimbare de rută în App Router | `components/TikTokPixelInitializer.tsx` | Nu are payload suplimentar. |
| `ViewContent` | 1) prima încărcare a paginii de flotă cu rezultate; 2) afișarea landing page-ului public | `components/cars/CarsPageClient.tsx`, `components/home/HomePageClient.tsx` | `content_type`, `contents` (primele modele afișate), `value`, `currency`, `total_results`, `search_term`, `sort_by`. |
| `Search` | Căutări din hero form și ajustări de filtre pe pagina flotei | `components/HeroSection.tsx`, `components/cars/CarsPageClient.tsx` | `search_type`, `filter_key`, `filter_value`, `location`, `start_date`, `end_date`, `search_term`, `sort_by`, `page`, `total_results`. |
| `AddToCart` | Click pe CTA-ul unei mașini pentru a continua spre checkout | `components/cars/CarsPageClient.tsx` | `content_type`, `contents` (mașina selectată), `value`, `currency`, `start_date`, `end_date`, `with_deposit`. |
| `InitiateCheckout` | Prima încărcare completă a checkout-ului (când există mașină și interval valid) | `app/checkout/page.tsx` | `value`, `currency`, `contents`, `start_date`, `end_date`, `with_deposit`, `service_ids`, `applied_offer_ids`. |
| `SubmitForm` | Trimiterea formularului de rezervare din checkout | `app/checkout/page.tsx` | `form_name`, `value`, `currency`, `with_deposit`, `start_date`, `end_date`, `contents`, `service_ids`, `applied_offer_ids`. |
| `CompletePayment` | Afișarea paginii de succes după rezervare (odată pe sesiune) | `app/success/page.tsx` | `value`, `currency`, `contents`, `reservation_id`, `start_date`, `end_date`, `with_deposit`, `service_ids`. |
| `Contact` | Click pe telefon, WhatsApp sau email în secțiunea de contact | `components/ContactSection.tsx` | `contact_method`, `value`. |

Toate payload-urile sunt igienizate în `lib/tiktokPixel.ts` pentru a elimina valorile `undefined`, liste goale sau date invalide înainte de a fi trimise către TikTok.

## Extensii recomandate

1. **Evenimente suplimentare** – dacă sunt introduse noi formulare (ex. newsletter) sau pași de plată efectivă, reutilizează `trackTikTokEvent` cu unul dintre evenimentele standard (`CompleteRegistration`, `AddPaymentInfo` etc.).
2. **E-commerce advanced matching** – pentru campanii optimizate se poate completa `ttq.identify` cu email/telefon când utilizatorul furnizează date valide în checkout. Găsești stub-ul în `lib/tiktokPixel.ts`.
3. **Debugging** – activează consola TikTok în dezvoltare adăugând `ttq.debug()` într-un `useEffect` local dacă este nevoie. În prezent log-urile apar doar în consolele non-producție atunci când survine o eroare.

## Pași de validare

1. Setează `NEXT_PUBLIC_TIKTOK_PIXEL_ID` într-un fișier `.env.local`.
2. Rulează aplicația (`npm run dev`) și verifică în browser că TikTok Pixel Helper detectează evenimentele de mai sus.
3. Pentru scenariile checkout/succes, asigură-te că există o selecție completă în `BookingContext` (poți folosi pagina „Flotă” pentru a simula fluxul complet).


# Meta Pixel – PageView, ViewContent și Lead cu potrivire avansată

Implementarea Meta Pixel în DaCars folosește încărcarea scriptului după hidratare și potrivire avansată manuală pentru evenimentele principale ale funnel-ului (PageView, ViewContent, Lead). Datele clientului (email, telefon, nume) sunt trimise în clar, iar Meta le hash-uiește automat cu SHA-256 înainte de transmitere.

## Configurare

1. Adaugă `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` în `.env.local` cu ID-ul pixelului din Events Manager.
2. `components/MetaPixel.tsx` încarcă scriptul Meta folosind `next/script` cu `strategy="afterInteractive"`, astfel încât bundle-ul inițial nu este blocat. Componenta se montează o singură dată în `app/layout.tsx` și urmărește schimbările de rută prin `usePathname` pentru a emite `PageView` la navigările client-side.
3. Potrivirea avansată este centralizată în `lib/metaPixel.ts`. Funcția `updateMetaPixelAdvancedMatching` normalizează emailul (lowercase), telefonul (format E.164 cu prefix `+`) și numele, apoi reapelă `fbq('init', PIXEL_ID, …)` pentru a îmbogăți pixelul existent. Snapshot-ul este păstrat în `sessionStorage` (`dacars:meta:advanced-matching`) pentru a fi refolosit după refresh.

## Evenimente trimise

| Eveniment | Unde este emis | Payload principal |
|-----------|----------------|-------------------|
| `PageView` | automat de script + `MetaPixel` la navigări client-side | `content_type` (`"vehicle"` pe checkout), `with_deposit`, `start_date`, `end_date` (după ce sunt disponibile). |
| `ViewContent` | `components/home/HomePageClient.tsx`, `components/cars/CarsPageClient.tsx`, `app/form/page.tsx` | `content_type`, `content_ids`, `contents` (listă `{ id, quantity, item_price }`), `value`, filtre de căutare atunci când există. |
| `Lead` | `app/form/page.tsx` (după confirmarea rezervării) și fallback în `app/success/page.tsx` | `reservation_id`, `service_ids`, `with_deposit`, `start_date`, `end_date`, `contents`, `value`, plus potrivirea avansată (email, telefon, nume). |

După generarea unei rezervări reușite, `app/form/page.tsx` actualizează potrivirea avansată cu datele completate și trimite `Lead`. În paralel, pagina de succes reîmprospătează potrivirea din `localStorage` și reemite `Lead` doar dacă nu a fost trimis anterior (se folosește `sessionStorage` cu prefixul `dacars:meta:lead:` pentru a evita duplicatele).

## Bune practici

- **Consent mode**: înainte de a apela funcțiile din `lib/metaPixel.ts`, verifică dacă utilizatorul a acceptat cookie-urile de marketing. Wrapper-ele existente pot fi completate cu verificări suplimentare.
- **Date consistente**: `resolveMetaPixelNameParts` împarte numele complet în prenume/nume; atunci când formularul va avea câmpuri separate, actualizează apelul pentru a trimite valori exacte.
- **Tracking suplimentar**: pentru evenimente custom (`fbq('trackCustom', …)`), folosește `trackMetaPixelEvent` (poți exporta o funcție dedicată) pentru a reutiliza logica de normalizare.
- **Debugging**: în medii non-producție, mesajele de eroare din `lib/metaPixel.ts` se loghează în consolă atunci când sessionStorage nu este disponibil sau pixelul nu se poate încărca.

Respectarea pașilor de mai sus menține diagnosticările Meta verzi („Manual Advanced Matching active”) și asigură că evenimentele de conversie includ identificatori de client.

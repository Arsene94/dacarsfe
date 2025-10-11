# Configurare și evenimente Meta Pixel (Facebook)

Integrarea Meta Pixel rulează global prin `MetaPixelInitializer`, încărcat în `app/layout.tsx`. Inițializarea și trimiterea evenimentelor sunt gestionate cu pachetul [`react-facebook-pixel`](https://www.npmjs.com/package/react-facebook-pixel), care adaugă automat scriptul oficial Facebook. Pentru activare este necesară variabila de mediu publică `NEXT_PUBLIC_META_PIXEL_ID`. Dacă variabila lipsește, apelurile `trackMetaPixelEvent`/`trackMetaPixelPageView` sunt ignorate în siguranță.

## Evenimente urmărite

| Eveniment Meta | Trigger în aplicație | Fișier sursă | Proprietăți trimise |
| -------------- | -------------------- | ------------ | -------------------- |
| `PageView` | La prima încărcare (după `ReactPixel.init`) și la fiecare schimbare de rută în App Router | `components/MetaPixelInitializer.tsx`, `lib/metaPixel.ts` | – |
| `Lead` | Contacte directe (telefon, WhatsApp, email), vizualizarea checkout-ului cu date complete și confirmarea rezervării | `components/ContactSection.tsx`, `app/checkout/page.tsx`, `app/success/page.tsx` | `contact_method`, `lead_stage`, `value`, `currency`, `content_ids`, `content_name`, `content_type`, `contents`, `with_deposit`, `start_date`, `end_date`, `service_ids`, `applied_offer_ids`, `reservation_id`. |

Toate payload-urile sunt igienizate în `lib/metaPixel.ts` pentru a elimina valori `undefined`, liste goale sau date invalide înainte de trimiterea către Facebook. `MetaPixelInitializer` deduplică și schimbările de rută consecutive către aceeași destinație (inclusiv navigările realizate prin `next/link`) și așteaptă ca router-ul Next.js să furnizeze un `pathname` valid, astfel încât `PageView` se trimite o singură dată per vizită.

## Pași de validare

1. Adaugă `NEXT_PUBLIC_META_PIXEL_ID` în `.env.local`.
2. Rulează aplicația (`npm run dev`) și verifică în browser, cu Meta Pixel Helper, că evenimentele de mai sus apar cu status „Received”.
3. Pentru scenariile checkout/succes, folosește fluxul complet din pagina „Flotă” pentru a popula `BookingContext` (selectează mașină, perioadă, finalizează formularul). Evenimentele `Lead` se trimit doar după completarea integrală a procesului.

## Extensii recomandate

- **Advanced Matching** – dacă backend-ul acceptă hashing pentru email/telefon, se poate extinde `initMetaPixel` pentru a apela `ReactPixel.init(ID, { em: hashEmail, ph: hashPhone })` folosind datele introduse în checkout.
- **Politica de tracking** – Meta Pixel trimite doar `PageView` și `Lead`, conform cerințelor echipei de marketing. Pentru alte conversii folosește Mixpanel/TikTok sau cere aprobare înainte de a extinde lista de evenimente Meta.
- **Debugging** – în dezvoltare poți activa `fbq('trackCustom', 'DebugEvent', {...})` din componente locale pentru a valida payload-uri noi fără a afecta rapoartele de producție.


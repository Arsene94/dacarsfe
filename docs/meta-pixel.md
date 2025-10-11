# Ghid rapid: Meta Pixel (Facebook) în Next.js

Tracking-ul interacțiunilor este esențial pentru a înțelege performanța site-ului. Meta Pixel ajută la monitorizarea traficului, optimizarea campaniilor și remarketing. În proiect folosim pachetul [`react-facebook-pixel`](https://www.npmjs.com/package/react-facebook-pixel), care încarcă automat scriptul oficial Facebook și ne lasă să trimitem doar evenimentele de care avem nevoie: `PageView` și `Lead`.

> **ID-ul Pixelului** este citit din `NEXT_PUBLIC_META_PIXEL_ID`. Dacă variabila nu este setată, helper-ele returnează în siguranță fără să trimită evenimente.

## 1. Instalează dependența

```bash
npm install react-facebook-pixel
```

Dependența trebuie adăugată în `package.json`, iar dacă rulezi `npm install` pe CI/în containere, asigură-te că variabila de mediu publică este disponibilă înainte de build.

## 2. Helper centralizat (`lib/metaPixel.ts`)

`lib/metaPixel.ts` expune funcțiile necesare pentru inițializare și tracking:

```ts
export const META_PIXEL_EVENTS = {
    PAGE_VIEW: "PageView",
    LEAD: "Lead",
} as const;

export const initMetaPixel: () => void;
export const trackMetaPixelPageView: (
    context?: {
        pathname?: string | null;
        historyKey?: string | null;
    },
) => void;
export const trackMetaPixelEvent: (
    eventName: MetaPixelEventName,
    payload?: Record<string, unknown>,
) => void;
```

Helper-ul face câteva lucruri suplimentare:

- încarcă lazy modulul `react-facebook-pixel`, astfel încât codul să nu ajungă în bundle-ul server;
- rulează `ReactPixel.init` o singură dată chiar dacă componenta se montează de mai multe ori sau dacă Facebook injectează deja pixelul și dezactivează `autoConfig` pentru a preveni PageView-uri automate;
- igienizează payload-urile (`sanitizePayload`) pentru a elimina `undefined`, array-uri goale sau date invalide înainte de a apela `fbq`;
- memorează ultima combinație `pathname` + `history.state.key` raportată în `window.__META_PIXEL_LAST_PAGE_VIEW__` astfel încât același URL să nu trimită din nou `PageView` dacă efectele React se re-execută sau dacă layout-urile sunt remontate de Next.js.

## 3. Creează componenta `components/PixelTracker.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initMetaPixel, trackMetaPixelPageView, isMetaPixelConfigured } from "@/lib/metaPixel";

const PixelTracker = () => {
    const pathname = usePathname();
    const previousPathnameRef = useRef<string | null>(null);
    const previousHistoryKeyRef = useRef<string | null>(null);

    useEffect(() => {
        initMetaPixel();
    }, []);

    useEffect(() => {
        if (!isMetaPixelConfigured()) {
            return;
        }

        if (typeof pathname !== "string" || pathname.length === 0) {
            return;
        }

        const currentHistoryKey = (() => {
            if (typeof window === "undefined") {
                return null;
            }

            try {
                const state = window.history?.state as { key?: unknown } | undefined;
                const key = state?.key;
                return typeof key === "string" && key.length > 0 ? key : null;
            } catch {
                return null;
            }
        })();

        if (
            previousPathnameRef.current === pathname &&
            previousHistoryKeyRef.current === currentHistoryKey
        ) {
            return;
        }

        previousPathnameRef.current = pathname;
        previousHistoryKeyRef.current = currentHistoryKey;

        trackMetaPixelPageView({ pathname, historyKey: currentHistoryKey ?? undefined });
    }, [pathname]);

    return null;
};

export default PixelTracker;
```

Componenta este marcată `"use client"` pentru a putea folosi hook-urile de routing și rulează două efecte:

1. `initMetaPixel()` – încarcă modulul Facebook și îl configurează o singură dată.
2. `trackMetaPixelPageView({ pathname, historyKey })` – trimite `PageView` doar când se schimbă `pathname`-ul Next.js (navigări reale între pagini) și memorează combinația de `pathname` + `history.state.key` pentru a ignora remontările sau navigările soft care păstrează aceeași pagină. Schimbările de query string făcute prin `router.replace`/`next/link` pe aceeași rută nu mai trimit încă un `PageView`, prevenind duplicatele întâlnite anterior pe `/cars`.

## 4. Adaugă tracker-ul în `app/layout.tsx`

```tsx
import PixelTracker from "../components/PixelTracker";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ... restul layout-ului
  return (
    <html lang="en">
      <head>
        {/* alte meta-uri */}
      </head>
      <body>
        {/* alte inițializatoare (Mixpanel, TikTok etc.) */}
        <PixelTracker />
        {children}
      </body>
    </html>
  );
}
```

Componenta poate fi plasată într-un `Suspense` existent (exact ca în implementarea curentă) pentru a evita blocarea altor inițializatori. `react-facebook-pixel` adaugă singur scriptul oficial și nu este nevoie de alt `<script>` manual. Dacă ai nevoie de fallback pentru utilizatorii fără JavaScript, poți adăuga imaginea `noscript` recomandată de Facebook în `<head>`.

## 5. Trimiterea evenimentului `Lead`

`Lead` este singurul eveniment suplimentar permis pe lângă `PageView`. Pentru a-l trimite, folosește helper-ul `trackMetaPixelEvent`:

```ts
import { trackMetaPixelEvent, META_PIXEL_EVENTS } from "@/lib/metaPixel";

trackMetaPixelEvent(META_PIXEL_EVENTS.LEAD, {
    contact_method: "whatsapp",
    lead_stage: "contact",
    value: 120,
    currency: "EUR",
});
```

Payload-ul este curățat automat, astfel încât valorile `undefined` sau array-urile goale sunt eliminate înainte de apelul `fbq`. În aplicație evenimentul `Lead` este folosit pentru:

- click-uri pe contact (telefon, WhatsApp, email) din landing (`components/ContactSection.tsx`);
- inițierea checkout-ului cu date complete (`app/checkout/page.tsx`);
- confirmarea rezervării (`app/success/page.tsx`).

## 6. Evenimente active și validare

| Eveniment Meta | Trigger | Fișiere sursă | Proprietăți trimise |
| -------------- | ------- | ------------- | ------------------- |
| `PageView` | La prima încărcare și la fiecare schimbare reală de rută | `components/PixelTracker.tsx`, `lib/metaPixel.ts` | – |
| `Lead` | Contact direct, vizualizare checkout cu date complete, confirmare rezervare | `components/ContactSection.tsx`, `app/checkout/page.tsx`, `app/success/page.tsx` | `contact_method`, `lead_stage`, `value`, `currency`, `content_ids`, `content_name`, `content_type`, `contents`, `with_deposit`, `start_date`, `end_date`, `service_ids`, `applied_offer_ids`, `reservation_id` |

### Checklist de verificare

1. Adaugă `NEXT_PUBLIC_META_PIXEL_ID` în `.env.local`.
2. Rulează aplicația (`npm run dev`) și confirmă în Meta Pixel Helper că `PageView` și `Lead` sunt recepționate.
3. Verifică consola că nu apare avertismentul „The Facebook pixel activated 2 times” – dacă apare, cel mai probabil pixelul este injectat de o altă sursă și trebuie eliminată dublura.

Cu această configurație rămân active doar `PageView` și `Lead`, respectând cerințele de marketing și oferind o implementare conformă cu documentația oficială Facebook.

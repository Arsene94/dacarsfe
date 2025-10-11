# Ghid rapid: Facebook Pixel cu `react-facebook-pixel`

Tracking-ul interacțiunilor rămâne esențial pentru a măsura campaniile și pentru a corecta eventualele probleme de atribuire. În proiect folosim biblioteca [`react-facebook-pixel`](https://www.npmjs.com/package/react-facebook-pixel), wrapper-ul oficial din ecosistemul React care expune direct API-ul `fbq`, inclusiv suport pentru manual advanced matching.

> **ID-ul Pixelului** este citit din `NEXT_PUBLIC_META_PIXEL_ID`. Dacă variabila lipsește, helper-ele returnează în siguranță fără a trimite nimic către Facebook.

## 1. Instalare

```bash
npm install react-facebook-pixel
```

Dependența se află în `package.json`, iar `npm install` trebuie rulat după orice modificare pentru a actualiza `package-lock.json`.

## 2. Helper centralizat (`lib/facebookPixel.ts`)

Fișierul `lib/facebookPixel.ts` instanțiază o singură dată pixelul și exportă funcțiile folosite în aplicație:

```ts
export const FACEBOOK_PIXEL_EVENTS = {
    PAGE_VIEW: "PageView",
    LEAD: "Lead",
} as const;

export const initFacebookPixel: () => void;
export const trackFacebookPixelPageView: () => void;
export const trackFacebookPixelEvent: (
    eventName: FacebookPixelEventName,
    data?: Record<string, unknown>,
) => void;
export const updateFacebookPixelAdvancedMatching: (update: FacebookPixelAdvancedMatchingUpdate) => void;
export const isFacebookPixelConfigured: () => boolean;
```

Helper-ul folosește obiectul `ReactPixel` din bibliotecă și oferă câteva beneficii:

- păstrează o singură instanță a pixelului pentru întregul browser și reapelează `ReactPixel.init()` doar când se schimbă payload-ul de advanced matching;
- pornește pixelul doar după ce există un `NEXT_PUBLIC_META_PIXEL_ID` valid, fără a injecta scripturi custom în layout;
- încarcă biblioteca `react-facebook-pixel` doar în browser (lazy) pentru a evita erorile de tip `window is not defined` în SSR;
- normalizează câmpurile trimise prin `updateFacebookPixelAdvancedMatching` (email, telefon, nume, adresă) conform cerințelor Meta, apoi reaplică datele ca al treilea parametru în `fbq('init', PIXEL_ID, { ... })`;
- expune o enumerare strictă (`FACEBOOK_PIXEL_EVENTS`) pentru evenimentele pe care le urmărim în prezent (`PageView`, `Lead`).

## 3. Tracking PageView (`components/PixelTracker.tsx`)

Componenta rămâne client-only și continuă să verifice tranzițiile reale de rută înainte de a apela `trackFacebookPixelPageView()`. În plus, colectează identificatorii disponibili în browser (cookie-urile `_fbc`/`_fbp`, IP prin `/api/ip`, user agent și `external_id` din advanced matching) și îi trimite către noua rută server `POST /api/meta-page-view`. Eventul este raportat către Graph API cu `action_source=website`, astfel încât Events Manager să recepționeze și versiunile server-side ale `PageView`.

```tsx
const trackMetaPageView = async () => {
    const fbc = getBrowserCookieValue("_fbc");
    const fbp = getBrowserCookieValue("_fbp");
    const ipAddress = await fetchIpAddress();
    const advancedMatching = getFacebookPixelAdvancedMatchingSnapshot();
    const externalId = advancedMatching?.external_id;

    await fetch("/api/meta-page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            eventName: FACEBOOK_PIXEL_EVENTS.PAGE_VIEW,
            eventSourceUrl: window.location.href,
            fbc,
            fbp,
            ipAddress,
            userAgent: window.navigator.userAgent,
            externalId,
        }),
    });
};
```

Prin combinarea cu `trackFacebookPixelPageView()` continuăm să avem evenimentul client-side pentru debugging rapid, dar și varianta server-side îmbogățită cu identificatorii solicitați de Meta.

## 4. Advanced matching (Manual advanced matching)

Cerința Meta de remediere („Set up manual advanced matching”) este acoperită de funcția `updateFacebookPixelAdvancedMatching`. Ori de câte ori avem email, telefon sau numele clientului, apelăm helper-ul cu date curate:

```ts
updateFacebookPixelAdvancedMatching({
    email: formValues.customer_email,
    phone: formValues.customer_phone,
    fullName: formValues.customer_name,
});
```

Funcția normalizează emailul (lowercase), convertește telefonul în cifre (`ph`) și împarte numele în `fn` + `ln` doar dacă valorile sunt valide. Payload-ul rezultat este transmis ca al treilea parametru al `fbq('init', PIXEL_ID, { ... })`, exact cum solicită ghidul Meta.

## 5. Evenimentele `Lead`

`Lead` este singurul eveniment suplimentar urmărit. Pentru a-l trimite din componente client folosește helper-ul generic:

```ts
import { trackFacebookPixelEvent, FACEBOOK_PIXEL_EVENTS } from "@/lib/facebookPixel";

trackFacebookPixelEvent(FACEBOOK_PIXEL_EVENTS.LEAD, {
    contact_method: "whatsapp",
    lead_stage: "contact",
    value: 120,
    currency: "EUR",
});
```

Payload-ul acceptă același model ca în API-ul standard (valori numerice, liste de produse etc.).

În aplicație evenimentul este declanșat în:

- `components/ContactSection.tsx` – click pe telefon, WhatsApp, email;
- `app/form/page.tsx` – vizualizare checkout cu date complete și trimiterea formularului;
- `app/success/page.tsx` – confirmarea rezervării.

## 6. Checklist de verificare

1. Adaugă `NEXT_PUBLIC_META_PIXEL_ID` în `.env.local`.
2. Rulează `npm run dev` și verifică în Meta Pixel Helper că `PageView` și `Lead` apar o singură dată.
3. Confirmă în Events Manager că advanced matching primește câmpurile `em`, `ph`, `fn`, `ln` (hash-uite automat de pixel).

Prin folosirea `react-facebook-pixel` păstrăm integrarea minimală, fără script custom în layout, evităm duplicatele și respectăm cerința Meta de a furniza manual datele de identificare pentru evenimente.

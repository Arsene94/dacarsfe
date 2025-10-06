# DaCars – Platformă Next.js pentru închirieri auto

Aplicația DaCars oferă o experiență completă de închirieri auto pentru clienți și echipa operațională. Frontend-ul este construit cu Next.js 15 și React 18, folosește TypeScript și Tailwind CSS pentru un design modern și performanțe ridicate, iar zona de administrare integrează fluxuri avansate pentru gestiunea flotei, rezervărilor și campaniilor de marketing.

## Cuprins
- [Stack tehnologic](#stack-tehnologic)
- [Funcționalități principale](#funcționalități-principale)
- [Structura proiectului](#structura-proiectului)
- [Fluxuri de date și module cheie](#fluxuri-de-date-și-module-cheie)
- [Integrare cu backend-ul Laravel](#integrare-cu-backend-ul-laravel)
- [Configurare și rulare](#configurare-și-rulare)
- [Calitate și testare](#calitate-și-testare)
- [Ghid de dezvoltare](#ghid-de-dezvoltare)
- [Extensibilitate și următori pași](#extensibilitate-și-următori-pași)

## Stack tehnologic
- **Next.js 15 (App Router)** pentru renderizare hibridă și optimizări avansate (React Compiler, Turbopack, optimizări CSS).
- **React 18 + TypeScript** cu configurație strictă pentru tipuri și alias-uri de import.
- **Tailwind CSS** personalizat cu identitatea vizuală DaCars (culori, fonturi Poppins și DM Sans, animații).
- **Librărie UI proprie** (buton, input, tabel, select, date range) pentru consistență și accesibilitate.
- **Integrare Monaco Editor, CKEditor, Lucide Icons, Next Themes** pentru funcționalități din zona de administrare.
- **Vitest + ESLint** pentru testare și analiză statică.

## Funcționalități principale
### Site public
- **Landing page** cu hero, beneficii, flotă, oferte, proces și secțiune de contact optimizate pentru conversie.
- **Carousel flotă și carduri dinamice** ce preiau mașinile din API și afișează specificații cheie (pasageri, transmisie, combustibil, preț).
- **Listare completă a flotei** cu filtrare după tip, transmisie, combustibil, număr de locuri, sortare și căutare liberă, plus infinite scroll și sincronizare URL pentru share-uire rapidă.
- **Hărți și contacte** cu încărcare lazy pentru Google Maps, optimizarea datelor de contact și integrarea formularului de rezervare rapidă.

### Rezervare end-to-end
- **Context global pentru selecția clientului** (dates, mașină, garanție) persistat în `localStorage` și expus componentelor din checkout.
- **Formular checkout bogat** cu validări în timp real, input de telefon internațional, servicii suplimentare, verificări de disponibilitate și calcul automat al prețului cu/ fără garanție.
- **Pagină de confirmare** care rezumă rezervarea, serviciile, reducerile aplicate și premiile câștigate la roata norocului.

### Roata Norocului
- **Componente dedicate** pentru afișarea roții, selectarea și persistarea premiilor și urmărirea stării utilizatorului (localStorage cu TTL, validator de coduri).
- **Formatare și descriere inteligentă a premiilor** (discount procentual, sumă fixă, zile bonus) și afișarea perioadei de valabilitate.
- **Servicii de API** pentru listarea premiilor, rularea roții, validarea și aplicarea reducerilor direct din backend-ul Laravel.

### Zona administrativă
- **Layout protejat de autentificare** cu redirecționări în funcție de sesiune și meniu lateral adaptat rolului.
- **Dashboard rezervări** cu statistici zilnice, tabel sortabil, pop-up-uri pentru detalii și generare contracte, plus integrare cu widget-ul de activitate.
- **Calendar flotă** cu timeline interactiv, lazy loading pentru mașini și rezervări, drag & drop și crearea rapidă a rezervărilor.
- **Management flotă** (CRUD mașini, upload multi-imagine, editor rich-text, filtre de căutare, categorii, transmisii, carburant).
- **Module suplimentare** pentru rezervări, servicii extra, categorii cu prețuri dinamice, calendar de tarife și administrator de tipuri/roluri utilizatori.

### Automatizări și email marketing
- **Editor de branding email** cu Monaco Editor, inserție de variabile Twig și gestiune culori/meniuri, pentru personalizarea template-urilor Laravel Mailcoach.
- **Configurație integrată pentru fișiere atașate și preview mobil** în zona de administrare a campaniilor.

## Structura proiectului
```
├── app/                # Rutele Next.js (public + admin + API routes)
│   ├── page.tsx        # Landing public
│   ├── cars/           # Listare flotă
│   ├── checkout/       # Flux rezervare
│   ├── success/        # Confirmare rezervare
│   └── admin/          # Consolă operațională (dashboard, flotă, mail etc.)
├── components/         # Secțiuni UI reutilizabile (public & admin)
├── context/            # Context API (autentificare, rezervări)
├── lib/                # Utilitare, API client, mapări filtre, stocare premii
├── services/           # Servicii API specifice (roata norocului)
├── types/              # Contracte TypeScript pentru datele backend
├── public/             # Active statice (imagini optimizate, CSS generat)
└── scripts/            # Task-uri auxiliare (optimizare imagini WebP)
```
Fiecare domeniu este izolat: componentele publice trăiesc în rădăcina `components/`, iar zona admin folosește subdirectoare dedicate și tipuri specifice pentru a menține un cod scalabil.

## Fluxuri de date și module cheie
### Client API unificat
- `lib/api.ts` centralizează toate apelurile la backend-ul Laravel (mașini, rezervări, servicii, utilizatori, wheel of fortune etc.), atașează tokenul de autentificare și normalizează răspunsurile JSON/PDF.
- `lib/mapFilters.ts` și `lib/qs.ts` traduc filtrele UI în parametri REST compatibili cu controllerele Laravel.
- `app/api/proxy/route.ts` expune un endpoint serverless pentru a proxy-a fișiere (de ex. contracte PDF) direct din backend, cu antete CORS și cache control.
- `app/api/images/webp/route.ts` adaugă varianta C (API proxy) pentru imagini remote/dinamice: răspunde cu WebP când clientul îl acceptă și cade elegant pe formatul original dacă conversia nu este posibilă.

### Gestionarea autentificării și sesiunii
- `AuthContext` gestionează logarea, persistă tokenul în `localStorage`, rehidratează utilizatorul la refresh și sincronizează starea cu sidebar-ul admin.
- `app/admin/layout.tsx` impune protecția rutelor, redirecționează vizitatorii neautentificați către `/admin/login` și injectează `AdminSidebar` în toate paginile private.

### Persistența selecției de rezervare
- `BookingContext` memorează datele selectate de client (interval, mașină, tip garanție) și le pune la dispoziția formularului checkout; contextul se resetează la finalizarea comenzii.

### Stocarea premiilor din Roata Norocului
- `WheelOfFortune` sincronizează premiile disponibile, folosește `wheelStorage` pentru a salva premiul câștigat cu TTL 30 de zile și expune câmpuri pentru validare și reactivare la următoarea vizită.
- `wheelFormatting` descrie textual tipul premiului și formatul reducerilor pentru afișare coerentă în admin și în ecranele publice.

### Calendar flotă și rezervări
- `CarRentalCalendar` aduce în pagină sute de rezervări cu paginare incrementală, permite selecții multiple, crearea de booking-uri și navigarea pe ani/luni într-o interfață optimizată pentru densitate mare de date.
- `app/admin/bookings/page.tsx` și `app/admin/page.tsx` reutilizează componente comune (`Popup`, `DataTable`) pentru a afișa detalii, a edita rezervări și a genera contracte rapid.

## Integrare cu backend-ul Laravel
Aplicația presupune un backend Laravel ce expune API-uri REST securizate.

| Variabilă | Rol | Implicit |
|-----------|-----|----------|
| `NEXT_PUBLIC_API_URL` | Punctul de intrare al API-ului public (mașini, rezervări, wheel). | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_BACKEND_URL` | Baza pentru proxy-ul de fișiere (PDF, contracte). | `http://127.0.0.1:8000` |
| `NEXT_PUBLIC_STORAGE_URL` | URL-ul pentru imaginile din storage Laravel (folosit în cardurile mașinilor). | `https://backend.dacars.ro/storage` |
| `IMAGE_PROXY_ALLOWLIST` | (Opțional) listă suplimentară de host-uri, separată prin virgulă, acceptate de API-ul de proxy pentru imagini. | – |
| `CUSTOM_KEY` | Cheie opțională pentru logica custom din `next.config.js`. | – |
| `ANALYZE` | Activează bundle analyzer (setare Next.js). | – |
| `NEXT_PUBLIC_MIXPANEL_DEBUG` | Controlează logging-ul de debugging pentru evenimentele Mixpanel. Setează `true` pentru a vedea în consolă toate evenimentele, `false` pentru a dezactiva log-urile chiar și în dezvoltare. | – (implicit activ în dezvoltare) |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | ID-ul pixelului TikTok folosit pentru evenimentele de marketing descrise în `docs/tiktok-pixel.md`. | – |

Tokenul de autentificare este setat prin `apiClient.setToken` după login și salvat în `localStorage` sub `auth_token`. Toate request-urile includ antetul `X-API-KEY`, iar metodele standard `getCars`, `getBookings`, `getServices`, `getWheelPrizes` mapează răspunsurile la structurile TypeScript definite în `types/`.

## Configurare și rulare
1. **Instalare dependențe**: `npm install`.
2. **Configurare `.env.local`** cu variabilele din tabelul de mai sus.
3. **Rulare în dezvoltare**: `npm run dev` (pornește Next.js cu Turbopack și reîncarcare live).
4. **Build de producție**: `npm run build` (compilează Tailwind, apoi rulează `next build`).
5. **Pornire server producție**: `npm run start`.
6. **Linting**: `npm run lint` pentru a valida regulile ESLint/TypeScript.
7. **Optimizare imagini**: `npm run images:webp` rulează scriptul `scripts/convert-images.cjs` care convertește întreg directorul `public/` în WebP (acceptă opțiuni precum `--quality`, `--effort`, `--lossless`) și actualizează manifestul `config/webp-manifest.json` folosit de middleware pentru rescrierea automată în format WebP. Pentru URL-urile dinamice sau remote necontrolate, endpoint-ul `app/api/images/webp/route.ts` face conversia la cerere, folosind allowlist-ul din `config/image-proxy.json` și extensia `resolveMediaUrl` din `lib/media.ts`.

> **Sfat:** în mediile CI setați `CI=1` înainte de `npm run lint` pentru a opri fix-urile interactive.

## Calitate și testare
- **ESLint + TypeScript strict**: se rulează prin `npm run lint`, folosind `eslint-config-next`, `eslint-plugin-react`, `eslint-plugin-tailwindcss` și reguli suplimentare pentru accesibilitate.
- **Vitest**: configurat cu mediu `jsdom` pentru testarea componentelor React; se rulează cu `npx vitest` sau adăugați script dedicat dacă este necesar.
- **Security & performance**: `next.config.js` adaugă antete HTTP (CSP, X-Frame-Options, Accept-CH) și optimizează imaginile, CSS-ul și importurile pentru bundle-uri mici.

## Ghid de dezvoltare
- **Design system**: Folosiți `components/ui` pentru elementele de bază și respectați tokenii din Tailwind (`berkeley`, `jade`, animațiile custom).
- **Fonturi**: `app/layout.tsx` încarcă Poppins și DM Sans prin `next/font`; aplicați clasele `font-poppins`/`font-dm-sans` pentru consistență.
- **Accesibilitate**: componentele includ atribute `aria-*` și etichete; păstrați-le când extindeți comportamentele (vezi `app/cars/page.tsx` pentru exemple de butoane și etichete).
- **State management**: utilizați `AuthContext` și `BookingContext` în loc de state locale atunci când informația trebuie împărtășită între pagini.
- **API layer**: adăugați metode noi în `lib/api.ts` și exportați tipuri în `types/` pentru a păstra contractul clar între frontend și backend.

## Extensibilitate și următori pași
- **Monitorizare și analytics**: integrați servicii suplimentare în `app/layout.tsx` sau `components/PageTransition.tsx` pentru tracking al conversiilor; vezi și `docs/tiktok-pixel.md` pentru integrarea curentă TikTok.
- **Raportări avansate**: reutilizați `DataTable` și `Popup` pentru a construi rapoarte custom (ex. utilizare flotă pe luni).
- **Automatizări marketing**: extindeți editorul de template-uri cu validări suplimentare și preview-uri pentru alte rezoluții folosind componentele existente din `mail-branding`.
- **Internaționalizare**: proiectul include alias `@/locales/*` în `tsconfig.json`, pregătit pentru adăugarea de mesaje și traduceri viitoare.

---
Pentru întrebări sau contribuții suplimentare, deschideți un ticket sau contactați echipa DaCars.

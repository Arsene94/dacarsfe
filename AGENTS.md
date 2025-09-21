# AGENTS

## Rezumat proiect
- Frontend Next.js 15 (App Router) cu React 18, TypeScript strict și Tailwind CSS, dedicat platformei de închirieri auto DaCars.
- Layout-ul global (`app/layout.tsx`) încarcă fonturile Poppins și DM Sans, rulează `AuthProvider` și `BookingProvider` și oferă tranziții prin `PageTransition`.
- Zona publică (landing, listă flotă, checkout) și consola admin (dashboard, flotă, rezervări, marketing) sunt împărțite pe rute în `app/` și reutilizează componente din `components/` și `components/admin/`.

## Directoare cheie
- `app/` – rute și layout-uri Next.js (public, checkout, admin + API routes în `app/api`).
- `components/` – secțiuni UI reutilizabile; `components/ui/` conține sistemul de design (button, input, select, tabel, popup).
- `context/` – contexte React (`AuthContext`, `BookingContext`) pentru stare globală partajată între pagini.
- `lib/` – clienți API (`api.ts`), utilitare (`utils.ts`, `qs.ts`, `mapFilters.ts`), persistări și formatare (`wheelStorage.ts`, `wheelFormatting.ts`) plus testele unitare aferente în `lib/__tests__/`.
- `services/` – apeluri specializate (de ex. `wheelApi.ts` pentru roata norocului) când sunt necesare în afara clientului generic.
- `types/` – definiții TypeScript pentru toate structurile de date backend (autentificare, flotă, rezervări, marketing etc.).
- `docs/` – documentație API Laravel pentru fiecare domeniu (flotă, rezervări, wheel, campanii, blog...). Actualizați-o când schimbați contractele.
- `public/` – active statice (imagini optimizate, CSS generat). `public/tailwind.css` este generat de scriptul Tailwind – nu îl editați manual.
- `scripts/convert-images.cjs` – utilitar pentru optimizarea imaginilor (`npm run images:webp`).

## Convenții generale de dezvoltare
- Scrieți doar în TypeScript/TSX. Folosiți aliasul `@/` definit în `tsconfig.json` pentru importuri și `import type { ... }` pentru tipuri.
- Respectați distincția client/server în App Router: componentele care folosesc state sau efecte trebuie să înceapă cu `"use client";`. Lăsați componentele server implicit unde este posibil.
- Reutilizați componentele din `components/ui/` și helperul `cn` din `lib/utils.ts` pentru combinații de clase Tailwind.
- Mențineți starea partajată prin contexte existente (`useAuth`, `useBooking`). Nu duceți logica de token/stocare locală în componente ad-hoc.
- Pentru noi funcționalități din admin respectați structura existentă pe rute (`app/admin/<domeniu>/page.tsx`) și păstrați logica specifică în `components/admin/` sau `lib/`.
- Când adăugați noi tipuri de date, actualizați fișierele din `types/` și folosiți funcțiile helper (`extractList`, `extractItem`) pentru a normaliza răspunsurile API.
- Păstrați copy-ul și comentariile în limba română, conform restului codului și documentației.

## Interacțiuni cu API-ul și datele
- `lib/api.ts` expune `apiClient` și mapări pentru toate endpoint-urile backend. Adăugați acolo noi metode în loc să folosiți `fetch` direct, astfel încât token-ul și tratamentul erorilor să rămână centralizate.
- Folosiți `mapCarSearchFilters`, `toQuery` și helper-ele conexe pentru a transpune filtrele UI în parametri REST.
- Persistența locală pentru roata norocului și selecțiile de checkout este gestionată prin utilitare din `lib/` (de ex. `wheelStorage.ts`). Extindeți-le acolo când schimbați comportamentul.
- Pentru rute API Next.js (`app/api/...`) urmați modelul din `app/api/proxy/route.ts`: validați parametrii, propagați antete relevante și întoarceți `NextResponse` adecvat.

## UI, CSS și accesibilitate
- Folosiți tokenii Tailwind din `tailwind.config.ts` (culorile `berkeley`, `jade`, `jadeLight`) și clasele definite în `globals.css` pentru consistență.
- Încărcarea imaginilor se face prin `next/image` și trebuie să respecte regulile din `next.config.js` (liste remote). Nu ocoliți optimizările Next.
- Componentele UI includ atribute aria și focus states – păstrați-le și extindeți-le când adăugați noi interacțiuni.
- Pentru imagini noi în `public/images`, rulați `npm run images:webp` pentru a genera variante optimizate.

## Testare și verificări obligatorii
- Rulează analiza statică: `npm run lint`.
- Rulează testele unitare cu Vitest: `npx vitest run` (testele existente sunt în `lib/__tests__`). Adăugați teste noi când modificați utilitare sau mapări.
- Pentru schimbări ce afectează build-ul (Next config, Tailwind, generatoare de CSS) verificați și `npm run build` înainte de a livra.

## Documentare și livrare
- Actualizați documentația din `docs/` pentru orice schimbare de contract API sau flux operațional.
- Dacă adăugați scripturi/pași noi de infrastructură, documentați-le în `README.md` sau într-un fișier dedicat din `docs/`.
- Commit-urile trebuie să păstreze arborele Git curat și să ruleze toate verificările de mai sus înainte de PR.

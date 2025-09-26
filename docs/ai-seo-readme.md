# Ghid de mentenanță AI & SEO pentru DaCars

Acest document rezumă responsabilitățile echipei atunci când actualizează resursele SEO și fișierele dedicate crawler-elor AI.

## llms.txt
- Se află în `public/llms.txt` și este servit direct de Next.js.
- Actualizați lista de surse atunci când se adaugă pagini noi cu informații oficiale (de ex. noi secțiuni în `/docs`).
- Păstrați secțiunea **Ignore** sincronizată cu rutele protejate sau parametrii pe care nu dorim să-i indexeze agenții AI.

## Sitemap
- Generatorul se află în `app/sitemap.ts` și folosește listele centralizate din `lib/seo/site-data.ts`.
- Când adăugați o pagină nouă (ex. ofertă, articol), extindeți array-urile `CAR_LISTINGS`, `RENTAL_OFFERS` sau `BLOG_POSTS` și actualizați manual lista `BASE_PAGES` dacă introduceți rute suplimentare.
- Asigurați-vă că fiecare intrare are `lastModified`, `changeFrequency` și `priority` pentru ca motoarele de căutare să înțeleagă recurența actualizărilor.

## Schema FAQ
- Întrebările și răspunsurile sunt definite în `app/faq/page.tsx`.
- Pentru modificări, actualizați atât array-ul `FAQ_ENTRIES`, cât și conținutul vizibil, astfel încât JSON-LD-ul generat să rămână sincron.
- Folosiți un limbaj clar și concis; răspunsurile prea lungi pot reduce vizibilitatea în rich snippets.

## Flux RSS
- Ruta `app/feed.xml/route.ts` construiește feed-ul folosind lista de articole din `lib/seo/site-data.ts`.
- După publicarea unui articol, adăugați intrarea în `BLOG_POSTS` pentru a propaga informația către feed, sitemap și paginile din `/blog`.
- Verificați feed-ul rulând `npm run check:seo`, care validează răspunsul HTTP și parsează scripturile JSON-LD.

## Scriptul `npm run check:seo`
- Rulează un server Next.js temporar și verifică răspunsurile pentru `/robots.txt`, `/sitemap.xml`, `/feed.xml` și paginile cheie (`/`, `/cars`, `/blog`, `/blog/[slug]`, `/contact`, `/offers`).
- Dacă apare o eroare, analizați logurile pentru a identifica fișierul lipsă sau JSON-LD-ul invalid.
- Integrați rularea scriptului în pipeline-urile CI pentru a preveni regresiile.

# Ghid de mentenanță AI & SEO

Acest document rezumă pașii necesari pentru a păstra fișierele SEO și ghidurile pentru roboți AI actualizate.

## llms.txt
- Actualizează data și versiunea la fiecare modificare majoră.
- Păstrează doar link-urile publice relevante (FAQ, Docs, Pricing, Blog, Despre).
- Menționează explicit ce secțiuni trebuie ignorate (login, admin, parametri de tracking).

## Sitemap (app/sitemap.ts)
- Adaugă noi pagini publice în `STATIC_PAGES` și rutele aferente în `STATIC_DOCS_PAGES` sau `STATIC_BLOG_POSTS` când apar.
- `lastModified` trebuie actualizat când conținutul se schimbă (de ex. publicare articol nou).
- Folosește `SITE_URL` pentru toate link-urile absolute.

## FAQ schema
- Lista de întrebări/răspunsuri se află în `app/faq/page.tsx`.
- Menține minimum 10 întrebări pentru a avea impact în SERP.
- Dacă adaugi întrebări noi, actualizează și conținutul din platformă pentru consistență.

## RSS feed
- Feed-ul este generat în `app/feed.xml/route.ts` din `STATIC_BLOG_POSTS`.
- Pentru articole noi completează câmpurile `publishedAt`, `updatedAt`, `excerpt` și conținutul efectiv.

## Scriptul de verificare
- Rulează `npm run check:seo` înainte de livrare pentru a valida că rutele `/robots.txt`, `/sitemap.xml`, `/llms.txt` și `/feed.xml` răspund cu 200.
- Scriptul validează și structurile JSON-LD stringificate, astfel încât erorile apar înainte de deploy.

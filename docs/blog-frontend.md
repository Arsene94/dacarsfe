# Blog frontend & admin module

Această documentație completează descrierea contractelor API din `docs/blog-categories-api.md`,
`docs/blog-posts-api.md` și `docs/blog-tags-api.md` explicând modul în care interfața Next.js
consumă fiecare resursă. Toate rutele menționate mai jos folosesc prefixul backend-ului Laravel
(`API_BASE_URL`, implicit `http://localhost:8000/api` sau `http://localhost:8000/api/v1` în funcție
 de versiune) și necesită un token Sanctum cu permisiunile `blog_*`.

## Configurare
- Variabila `BLOG_API_TOKEN` (sau fallback-ul `NEXT_PUBLIC_BLOG_API_TOKEN`) trebuie setată pentru a
  permite apelurile server-side din paginile publice `/blog` și `/blog/[slug]`. Helper-ul
  `getBlogRequestOptions` atașează tokenul și setează `cache: "no-store"` pentru a evita răspunsuri
  stale.
- În zona de administrare tokenul este furnizat automat după autentificarea utilizatorului; toate
  apelurile pornesc de la `apiClient` care adaugă antetul `Authorization: Bearer <token>` și `Accept:
  application/json`.

## CRUD administrativ

### Articole (`app/admin/blog/page.tsx`)
- **Listare:** `GET /api/blog-posts` cu parametri `per_page`, `page`, `sort` (`-published_at,-id`),
  `status`, `category_id`, `author_id` și `title_like`, exact cum sunt documentați în `docs/blog-posts-api.md`.
  Răspunsul este preluat cu `extractList` și sortat suplimentar după `published_at` pentru afișare.
- **Creare:** `POST /api/blog-posts` trimițând payload conform schemei din doc (`category_id`,
  `author_id`, `title`, `excerpt`, `content`, `status`, `published_at`, `tag_ids`). Id-urile de tag-uri
  sunt normalizate în `lib/api.ts` astfel încât să fie mereu numere, conform validărilor backend.
- **Actualizare:** `PUT /api/blog-posts/{id}` reutilizează același payload; lipsa câmpului `tag_ids`
  păstrează asocierile existente, în timp ce furnizarea unui array sincronizează pivotul,
  conform secțiunii "PUT" din documentația API.
- **Ștergere:** `DELETE /api/blog-posts/{id}` actualizează tabelul local fără a refetch-ui resursa.

### Categorii (`app/admin/blog/categories/page.tsx`)
- **Listare:** `GET /api/blog-categories` cu `per_page` și `sort=name`. Răspunsul respectă structura
  din `docs/blog-categories-api.md` (`data` + `meta`).
- **Creare/Actualizare:** `POST` / `PUT` cu payload `{ name, description }`, slug-ul fiind generat
  automat de backend așa cum menționează docul.
- **Ștergere:** `DELETE /api/blog-categories/{id}` elimină definitiv categoria, reflectând contractul
  din documentație.

### Etichete (`app/admin/blog/tags/page.tsx`)
- Flux identic cu categoriile, folosind `docs/blog-tags-api.md`: listare cu `GET /api/blog-tags`,
  creare/actualizare cu `{ name, description }` și `DELETE /api/blog-tags/{id}` pentru eliminare.

## Blog public

### Listare (`app/blog/page.tsx`)
- **Categorii:** `GET /api/blog-categories?limit=24&sort=name` pentru a popula filtrele. Rezultatul
  este filtrat client-side pentru a păstra doar înregistrările ce au `id`, `name`, `slug`, exact ca în
  exemplul din documentație.
- **Articole:** `GET /api/blog-posts` cu `per_page=9`, `page`, `status=published`, `sort=-published_at,-id`
  și opțional `category_id` (derivat din slug) sau `title_like` când utilizatorul caută. Paginarea se
  bazează pe câmpurile `meta`/`links` descrise în `docs/blog-posts-api.md`.
- Erorile API sunt prinse și afișate sub formă de mesaje prietenoase, păstrând pagina funcțională.

### Articol individual (`app/blog/[slug]/page.tsx`)
- Căutarea articolului folosește `GET /api/blog-posts?limit=1&slug=<slug>&status=published`.
- Articolele similare se încarcă cu `GET /api/blog-posts?limit=4&status=published&sort=-published_at,-id`
  și opțional `category_id`, limitând rezultatele la 3 carduri distincte.
- Conținutul este randat server-side cu structured data `BlogPosting`, folosind câmpurile documentate:
  `title`, `excerpt`, `content`, `published_at`, `category`, `tags`, `author`.

## Modelare date în frontend
- Tipurile TypeScript din `types/blog.ts` reflectă exact câmpurile din răspunsurile exemplificate în
  documentația API (`id`, `name`, `slug`, `description`, `created_at`, `updated_at` pentru categorii și
  etichete; `title`, `slug`, `excerpt`, `content`, `status`, `published_at`, relațiile `category`, `tags`,
  `author` pentru articole).
- Payload-urile trimise din interfața admin respectă schema de validare prezentată în doc-uri; nu se
  trimit câmpuri suplimentare față de cele acceptate de backend.

Prin această secțiune, documentația frontend rămâne sincronizată cu contractele Laravel, iar echipa
poate urmări ușor unde este consumat fiecare endpoint de blog.

# Blog Posts API

The blog post endpoints expose full CRUD plus tag synchronisation and eager-loaded relationships (category, tags, author) alongside optional associations with marketing offers and FAQ entries for cross-linking content. Public reads (`GET`) no longer require a Sanctum token, while mutating routes still expect authentication alongside the relevant `blog_posts.*` permission. Public consumers can request copy in a specific language using the optional `/{lang}` segment shown below; when omitted the API falls back to the source language configured via `dacars.translation_source_language` (Romanian by default).

## Endpoint overview
| Method | URL | Description | Required permission |
| --- | --- | --- | --- |
| GET | `/api/blog-posts/{lang?}` | Paginated list of published posts translated in `lang` (defaults to source language). | None (public) |
| GET | `/api/admin/blog-posts` | Admin listing that exposes drafts, scheduled posts and full filtering support. | `blog_posts.view` |
| GET | `/api/blog-posts/{lang?}?limit=5` | First N posts ordered by `published_at DESC, id DESC`. | None (public) |
| GET | `/api/blog-posts/{id}/{lang?}` | Retrieve a post with its relationships translated in `lang`. | None (public) |
| GET | `/api/admin/blog-posts/{id}` | Fetch a single post for editing, including eager loaded relations and unpublished records. | `blog_posts.view` |
| GET | `/api/blog-posts/{id}/translations` | List the translated payloads for a blog post. | `blog_posts.view_translations` |
| PUT | `/api/blog-posts/{id}/translations/{lang}` | Create or update a translation for the language code. | `blog_posts.update_translations` |
| DELETE | `/api/blog-posts/{id}/translations/{lang}` | Remove the stored translation for the language code. | `blog_posts.delete_translations` |
| POST | `/api/blog-posts/translate/batch` | Queue automatic translations for all blog posts and categories. | `blog_posts.translate` |
| GET | `/api/blog-posts/translate/batch/{job}` | Poll the status of a queued translation batch. | `blog_posts.translate` |
| POST | `/api/blog-posts` | Create a new post and attach tags. | `blog_posts.create` |
| PUT | `/api/blog-posts/{id}` | Update post fields and tag associations. | `blog_posts.update` |
| DELETE | `/api/blog-posts/{id}` | Permanently delete a post (pivot rows cascade). | `blog_posts.delete` |

> **Relationship loading** – `BlogPostController` eagerly loads `category`, `tags`, `offers`, `faqs` and `author` by default. Pass `?include=translations` (or `?include=offers.translations`, `faqs.translations`) to fetch stored language variants in a single response. The `fields` query parameter still works for sparse fieldsets. The admin routes (`/api/admin/blog-posts*`) share the same controller so they expose identical include/fields capabilities, plus draft/scheduled records.

> **Automatic translations** – La salvarea unui articol, motorul OpenAI sincronizează câmpurile `title`/`excerpt`/`content`/`meta_*` în limbile listate în `config/translation.php`. Hash-urile sunt persistate în `translation_states`, astfel încât doar conținutul modificat este retrimis spre traducere. Override-urile create în admin marchează rândul ca `is_manual`, protejând textul la rulările ulterioare (inclusiv când se folosește `--force` în CLI).

### Pornirea worker-ului pentru traduceri

Joburile pentru `POST /api/blog-posts/translate/batch` (și traducerile automate declanșate la salvarea unui articol) sunt plasate pe coada definită în `DACARS_TRANSLATION_QUEUE` (implicit `translations`). Pentru a procesa task-urile este suficient să rulezi un worker Artisan dedicat acelei cozi:

```bash
php artisan queue:work --queue="${DACARS_TRANSLATION_QUEUE:-translations}" --tries=1
```

În medii unde folosești altă conexiune pentru queue (ex. `redis`), adaugă opțiunea `--queue=translations --queue=alt_queue` sau setează `DACARS_TRANSLATION_QUEUE` în `.env` pentru a păstra aceeași comandă. Worker-ul trebuie să ruleze continuu (de exemplu prin Supervisor) pentru ca traducerile de blog să fie generate și salvate în fundal. Alternativ, folosește `php artisan translations:sync --model=blog_post --model=blog_category` pentru a reînnoi traducerile direct din CLI.

## Validation schema
| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `category_id` | yes on store | integer | Must exist in `blog_categories.id`. Changing it on update is allowed. |
| `author_id` | yes on store | integer | Must exist in `users.id`. Nullable in DB but controller currently requires it. |
| `title` | yes on store | string | Max 200 characters. Drives slug generation. |
| `excerpt` | optional | string | Short summary displayed in listings. |
| `image` | optional | file / string | Send the request as `multipart/form-data` (e.g. `FormData` in Next.js) to upload a new file, or provide an absolute URL/path string to reuse an existing image. Supplying `null` removes the current image on update. |
| `content` | yes on store | string | Rich HTML/Markdown body. |
| `status` | optional | string | Defaults to `draft`. Allowed values: `draft`, `published`. |
| `published_at` | optional | date-time | ISO 8601 timestamp. |
| `meta_title` | optional | string | Overrides the `<title>`/SEO meta title. Max 200 chars. |
| `meta_description` | optional | string | Overrides the SEO description used for search and previews. Max 500 chars. |
| `og_type` | optional | string | Defaults to `website`. Provide another Open Graph type when needed. |
| `og_title` | optional | string | Open Graph title for social previews. Max 200 chars. |
| `og_description` | optional | string | Open Graph description for social previews. Max 500 chars. |
| `og_image` | optional | string | Absolute URL or storage path for the share image (1200x630 recommended). |
| `og_url` | optional | string | Canonical URL used in `og:url`. Useful for landing pages outside the default slug. |
| `twitter_card` | optional | string | Defaults to `summary_large_image`. Override when using a different card type. |
| `twitter_title` | optional | string | Twitter title, falls back to `og_title`/`meta_title` when empty. |
| `twitter_description` | optional | string | Twitter description, falls back to `og_description`/`meta_description` when empty. |
| `twitter_image` | optional | string | Absolute URL or storage path for the Twitter card image. |
| `tag_ids` | optional | array<int> | Each id must exist in `blog_tags.id`. Omitting keeps current tags. |
| `offer_ids` / `offers` | optional | array<int> / array<object> | Provide `offer_ids` directly or send an `offers` array with `{ id }` items. Hidden offers (`show_on_site = false`) remain available when linked from the blog. |
| `faq_ids` / `faqs` | optional | array<int> / array<object> | Provide `faq_ids` directly or send a `faqs` array with `{ id }` items. Hidden FAQ categories continue to display when explicitly attached to a post. |

## Filtering & sorting
- `category_id`, `author_id`, `slug` → exact matches.
- `sort` → same semantics as other CRUD controllers (`sort=-published_at,title`). Default order is `published_at DESC`, then `id DESC`.
- `limit`, `per_page`, `page`, `fields`, `include` behave identically to categories/tags.
- Public reads only return posts with `status = published` and `published_at` in the past (or null). The admin routes bypass this scope so editors can see drafts and scheduled articles.

## GET `/api/blog-posts/{lang?}`
```json
{
  "data": [
    {
      "id": 24,
      "title": "Ghid complet pentru predarea mașinii în Otopeni",
      "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
      "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
      "image": "https://cdn.dacars.ro/blog/predare-otopeni.jpg",
      "content": "<p>Pentru o predare fără emoții...</p>",
      "status": "published",
      "published_at": "2025-01-12T07:00:00Z",
      "meta_title": "DaCars Otopeni – Predare rapidă lângă aeroport",
      "meta_description": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
      "og_type": "website",
      "og_title": "DaCars Otopeni – Închirieri auto rapide, predare în 5 minute",
      "og_description": "Predare ultrarapidă la aeroportul Henri Coandă, fără birocrație.",
      "og_image": "https://www.dacars.ro/static/og/otopeni-rent-a-car.jpg",
      "og_url": "https://www.dacars.ro/otopeni-rent-a-car-rapid",
      "twitter_card": "summary_large_image",
      "twitter_title": "DaCars Otopeni – Predare în 5 minute, fără birocrație",
      "twitter_description": "Închirieri auto rapide lângă Aeroportul Henri Coandă.",
      "twitter_image": "https://www.dacars.ro/static/og/otopeni-rent-a-car.jpg",
      "category": {
        "id": 7,
        "name": "Travel Guides",
        "slug": "travel-guides"
      },
      "tags": [
        { "id": 11, "name": "sfaturi-condus", "slug": "sfaturi-condus" },
        { "id": 10, "name": "oferte", "slug": "oferte" }
      ],
      "offers": [
        {
          "id": 4,
          "title": "Reducere 15% weekend Otopeni",
          "slug": "reducere-15-weekend-otopeni",
          "discount_label": "-15%",
          "offer_type": "percentage_discount"
        }
      ],
      "faqs": [
        {
          "id": 9,
          "question": "În cât timp predau mașina în aeroport?",
          "answer": "Predarea durează aproximativ 5 minute la terminalul Sosiri.",
          "status": "published"
        }
      ],
      "author": {
        "id": 3,
        "first_name": "Andreea",
        "last_name": "Popescu",
        "email": "andreea.popescu@dacars.ro"
      },
      "created_at": "2025-01-10T16:42:00Z",
      "updated_at": "2025-01-11T09:15:00Z"
    }
  ],
  "links": {
    "first": "https://api.dacars.test/api/blog-posts/ro?page=1",
    "last": "https://api.dacars.test/api/blog-posts/ro?page=8",
    "prev": null,
    "next": "https://api.dacars.test/api/blog-posts/ro?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 8,
    "links": [
      { "url": null, "label": "&laquo; Previous", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts/ro?page=1", "label": "1", "active": true },
      { "url": "https://api.dacars.test/api/blog-posts/ro?page=2", "label": "2", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts/ro?page=8", "label": "8", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts/ro?page=2", "label": "Next &raquo;", "active": false }
    ],
    "path": "https://api.dacars.test/api/blog-posts/ro",
    "per_page": 20,
    "to": 20,
    "total": 143
  }
}
```

## GET `/api/blog-posts/{id}/{lang?}`
```json
{
  "data": {
    "id": 24,
    "title": "Ghid complet pentru predarea mașinii în Otopeni",
    "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
    "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
    "image": "https://cdn.dacars.ro/blog/predare-otopeni.jpg",
    "content": "<p>Pentru o predare fără emoții...</p>",
    "status": "published",
    "published_at": "2025-01-12T07:00:00Z",
    "meta_title": "DaCars Otopeni – Predare rapidă lângă aeroport",
    "meta_description": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
    "og_type": "website",
    "og_title": "DaCars Otopeni – Închirieri auto rapide, predare în 5 minute",
    "og_description": "Predare ultrarapidă la aeroportul Henri Coandă, fără birocrație.",
    "og_image": "https://www.dacars.ro/static/og/otopeni-rent-a-car.jpg",
    "og_url": "https://www.dacars.ro/otopeni-rent-a-car-rapid",
    "twitter_card": "summary_large_image",
    "twitter_title": "DaCars Otopeni – Predare în 5 minute, fără birocrație",
    "twitter_description": "Închirieri auto rapide lângă Aeroportul Henri Coandă.",
    "twitter_image": "https://www.dacars.ro/static/og/otopeni-rent-a-car.jpg",
    "category": {
      "id": 7,
      "name": "Travel Guides",
      "slug": "travel-guides",
      "description": "Articole despre trasee și recomandări pentru destinațiile unde livrăm mașinile.",
      "created_at": "2025-01-05T12:00:00Z",
      "updated_at": "2025-01-05T12:00:00Z"
    },
    "tags": [
      {
        "id": 11,
        "name": "sfaturi-condus",
        "slug": "sfaturi-condus",
        "description": "Recomandări pentru condus defensiv și livrare în aeroport",
        "created_at": "2025-01-06T09:00:00Z",
        "updated_at": "2025-01-06T09:00:00Z"
      }
    ],
    "offers": [
      {
        "id": 4,
        "title": "Reducere 15% weekend Otopeni",
        "slug": "reducere-15-weekend-otopeni",
        "discount_label": "-15%",
        "offer_type": "percentage_discount"
      }
    ],
    "faqs": [
      {
        "id": 9,
        "question": "În cât timp predau mașina în aeroport?",
        "answer": "Predarea durează aproximativ 5 minute la terminalul Sosiri.",
        "status": "published"
      }
    ],
    "author": {
      "id": 3,
      "first_name": "Andreea",
      "last_name": "Popescu",
      "email": "andreea.popescu@dacars.ro"
    },
    "created_at": "2025-01-10T16:42:00Z",
    "updated_at": "2025-01-11T09:15:00Z"
  }
}
```

## POST `/api/blog-posts`

### Example request body
```json
{
  "category_id": 7,
  "author_id": 3,
  "title": "Ghid complet pentru predarea mașinii în Otopeni",
  "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
  "image": "https://cdn.dacars.ro/blog/predare-otopeni.jpg",
  "content": "<p>Pentru o predare fără emoții...</p>",
  "status": "published",
  "published_at": "2025-01-12T07:00:00Z",
  "tag_ids": [11, 10]
}
```

> **Image uploads** — Use `multipart/form-data` to attach the image alongside the rest of the fields. The API persists the file on the public disk (max 5&nbsp;MB) and responses include the public URL. Passing an existing URL/path keeps that asset, while sending `null` removes the stored image during updates.

### Example 201 response
```json
{
  "data": {
    "id": 24,
    "title": "Ghid complet pentru predarea mașinii în Otopeni",
    "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
    "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
    "image": "https://cdn.dacars.ro/blog/predare-otopeni.jpg",
    "content": "<p>Pentru o predare fără emoții...</p>",
    "status": "published",
    "published_at": "2025-01-12T07:00:00Z",
    "category": {
      "id": 7,
      "name": "Travel Guides",
      "slug": "travel-guides"
    },
    "tags": [
      { "id": 11, "name": "sfaturi-condus", "slug": "sfaturi-condus" },
      { "id": 10, "name": "oferte", "slug": "oferte" }
    ],
    "author": {
      "id": 3,
      "first_name": "Andreea",
      "last_name": "Popescu",
      "email": "andreea.popescu@dacars.ro"
    },
    "created_at": "2025-01-10T16:42:00Z",
    "updated_at": "2025-01-10T16:42:00Z"
  }
}
```

## PUT `/api/blog-posts/{id}`

### Example request body
```json
{
  "title": "Checklist predare mașină în Otopeni",
  "status": "draft",
  "tag_ids": [11]
}
```

### Example response
```json
{
  "data": {
    "id": 24,
    "title": "Checklist predare mașină în Otopeni",
    "slug": "checklist-predare-masina-in-otopeni",
    "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
    "image": "https://cdn.dacars.ro/blog/predare-otopeni.jpg",
    "content": "<p>Pentru o predare fără emoții...</p>",
    "status": "draft",
    "published_at": "2025-01-12T07:00:00Z",
    "category": {
      "id": 7,
      "name": "Travel Guides",
      "slug": "travel-guides"
    },
    "tags": [
      {
        "id": 11,
        "name": "sfaturi-condus",
        "slug": "sfaturi-condus"
      }
    ],
    "author": {
      "id": 3,
      "first_name": "Andreea",
      "last_name": "Popescu",
      "email": "andreea.popescu@dacars.ro"
    },
    "created_at": "2025-01-10T16:42:00Z",
    "updated_at": "2025-01-13T08:05:00Z"
  }
}
```

> When `tag_ids` is provided, the controller syncs the pivot table (`blog_post_tag`). Omit the field to preserve the existing attachments.

## DELETE `/api/blog-posts/{id}`
```json
{ "deleted": true }
```


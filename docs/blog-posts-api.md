# Blog Posts API

The blog post endpoints expose full CRUD plus tag synchronisation and eager-loaded relationships (category, tags, author). Public reads (`GET`) no longer require a Sanctum token, while mutating routes still expect authentication alongside the relevant `blog_posts.*` permission.

## Endpoint overview
| Method | URL | Description | Required permission |
| --- | --- | --- | --- |
| GET | `/api/blog-posts` | Paginated list of posts including category, tags and author metadata. | None (public) |
| GET | `/api/blog-posts?limit=5` | First N posts ordered by `id DESC`. | None (public) |
| GET | `/api/blog-posts/{id}` | Retrieve a post with its relationships. | None (public) |
| POST | `/api/blog-posts` | Create a new post and attach tags. | `blog_posts.create` |
| PUT | `/api/blog-posts/{id}` | Update post fields and tag associations. | `blog_posts.update` |
| DELETE | `/api/blog-posts/{id}` | Permanently delete a post (pivot rows cascade). | `blog_posts.delete` |

> **Relationship loading** – `BlogPostController` sets `$with = ['category','tags','author']`, so responses already include nested data without needing `?include=`. The `fields` query parameter still works for sparse fieldsets.

## Validation schema
| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `category_id` | yes on store | integer | Must exist in `blog_categories.id`. Changing it on update is allowed. |
| `author_id` | yes on store | integer | Must exist in `users.id`. Nullable in DB but controller currently requires it. |
| `title` | yes on store | string | Max 200 characters. Drives slug generation. |
| `excerpt` | optional | string | Short summary displayed in listings. |
| `content` | yes on store | string | Rich HTML/Markdown body. |
| `status` | optional | string | Defaults to `draft`. Allowed values: `draft`, `published`. |
| `published_at` | optional | date-time | ISO 8601 timestamp. |
| `tag_ids` | optional | array<int> | Each id must exist in `blog_tags.id`. Omitting keeps current tags. |

## Filtering & sorting
- `title` → fuzzy filter via `title_like`.
- `status`, `category_id`, `author_id`, `slug` → exact matches.
- `sort` → same semantics as other CRUD controllers (`sort=-published_at,title`). Default order is `id DESC`.
- `per_page`, `page`, `limit`, `fields` behave identically to categories/tags.

## GET `/api/blog-posts`
```json
{
  "data": [
    {
      "id": 24,
      "title": "Ghid complet pentru predarea mașinii în Otopeni",
      "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
      "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
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
      "updated_at": "2025-01-11T09:15:00Z"
    }
  ],
  "links": {
    "first": "https://api.dacars.test/api/blog-posts?page=1",
    "last": "https://api.dacars.test/api/blog-posts?page=8",
    "prev": null,
    "next": "https://api.dacars.test/api/blog-posts?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 8,
    "links": [
      { "url": null, "label": "&laquo; Previous", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts?page=1", "label": "1", "active": true },
      { "url": "https://api.dacars.test/api/blog-posts?page=2", "label": "2", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts?page=8", "label": "8", "active": false },
      { "url": "https://api.dacars.test/api/blog-posts?page=2", "label": "Next &raquo;", "active": false }
    ],
    "path": "https://api.dacars.test/api/blog-posts",
    "per_page": 20,
    "to": 20,
    "total": 143
  }
}
```

## GET `/api/blog-posts/{id}`
```json
{
  "data": {
    "id": 24,
    "title": "Ghid complet pentru predarea mașinii în Otopeni",
    "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
    "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
    "content": "<p>Pentru o predare fără emoții...</p>",
    "status": "published",
    "published_at": "2025-01-12T07:00:00Z",
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
  "content": "<p>Pentru o predare fără emoții...</p>",
  "status": "published",
  "published_at": "2025-01-12T07:00:00Z",
  "tag_ids": [11, 10]
}
```

### Example 201 response
```json
{
  "data": {
    "id": 24,
    "title": "Ghid complet pentru predarea mașinii în Otopeni",
    "slug": "ghid-complet-pentru-predarea-masinii-in-otopeni",
    "excerpt": "Tot ce trebuie să știi când predai mașina în aeroportul Henri Coandă.",
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


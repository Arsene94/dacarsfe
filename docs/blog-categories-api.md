# Blog Categories API

All endpoints live under the `/api` prefix. Read-only requests (`GET`) are public and no longer need a Sanctum token, while write operations still require authentication plus the `blog_categories.*` permission bundle. The controllers are built on top of `BaseCrudController`, so pagination, filtering and sparse fieldsets behave consistently with the rest of the admin APIs.

## Endpoint overview
| Method | URL | Description | Required permission |
| --- | --- | --- | --- |
| GET | `/api/blog-categories` | Paginated list of categories with optional filters. | None (public) |
| GET | `/api/blog-categories?limit=10` | Return the first N records without pagination metadata. | None (public) |
| GET | `/api/blog-categories/{id}` | Retrieve a single category by id. | None (public) |
| POST | `/api/blog-categories` | Create a new category (slug is generated automatically). | `blog_categories.create` |
| PUT | `/api/blog-categories/{id}` | Update an existing category. | `blog_categories.update` |
| DELETE | `/api/blog-categories/{id}` | Soft-delete is not used; the record is removed permanently. | `blog_categories.delete` |

> **Slugging** – `BlogCategoryObserver` regenerates the `slug` whenever the `name` changes. You do not need to send a slug from the client.

## GET `/api/blog-categories`

### Query parameters
- `per_page` (default `20`): Number of items per page.
- `page` (default `1`): Page index for the paginator.
- `limit`: When present, returns the first N entries without pagination metadata.
- `name` : Applies a `LIKE` filter (controller declares `name_like`).
- `slug`: Exact match filter.
- `sort`: Comma separated list of columns. Prefix with `-` for descending (e.g. `sort=-created_at,name`). Falls back to `ORDER BY id DESC` when omitted.
- `fields`: Optional comma separated list for sparse fieldsets (e.g. `fields=id,name`).

### Example paginated response
```json
{
  "data": [
    {
      "id": 7,
      "name": "Travel Guides",
      "slug": "travel-guides",
      "description": "Articole despre trasee și recomandări pentru destinațiile unde livrăm mașinile.",
      "created_at": "2025-01-05T12:00:00Z",
      "updated_at": "2025-01-05T12:00:00Z"
    },
    {
      "id": 6,
      "name": "Sfaturi de închiriere",
      "slug": "sfaturi-de-inchiriere",
      "description": "Checklist-uri pentru preluarea mașinii, garanții și situații neprevăzute.",
      "created_at": "2025-01-03T08:30:00Z",
      "updated_at": "2025-01-04T10:15:00Z"
    }
  ],
  "links": {
    "first": "https://api.dacars.test/api/blog-categories?page=1",
    "last": "https://api.dacars.test/api/blog-categories?page=4",
    "prev": null,
    "next": "https://api.dacars.test/api/blog-categories?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 4,
    "links": [
      { "url": null, "label": "&laquo; Previous", "active": false },
      { "url": "https://api.dacars.test/api/blog-categories?page=1", "label": "1", "active": true },
      { "url": "https://api.dacars.test/api/blog-categories?page=2", "label": "2", "active": false },
      { "url": "https://api.dacars.test/api/blog-categories?page=3", "label": "3", "active": false },
      { "url": "https://api.dacars.test/api/blog-categories?page=4", "label": "4", "active": false },
      { "url": "https://api.dacars.test/api/blog-categories?page=2", "label": "Next &raquo;", "active": false }
    ],
    "path": "https://api.dacars.test/api/blog-categories",
    "per_page": 20,
    "to": 20,
    "total": 65
  }
}
```

### Example limited response (`?limit=3`)
```json
{
  "data": [
    { "id": 7, "name": "Travel Guides", "slug": "travel-guides" },
    { "id": 6, "name": "Sfaturi de închiriere", "slug": "sfaturi-de-inchiriere" },
    { "id": 5, "name": "News", "slug": "news" }
  ]
}
```

## GET `/api/blog-categories/{id}`
```json
{
  "data": {
    "id": 7,
    "name": "Travel Guides",
    "slug": "travel-guides",
    "description": "Articole despre trasee și recomandări pentru destinațiile unde livrăm mașinile.",
    "created_at": "2025-01-05T12:00:00Z",
    "updated_at": "2025-01-05T12:00:00Z"
  }
}
```

## POST `/api/blog-categories`

### Example request body
```json
{
  "name": "Travel Guides",
  "description": "Articole despre trasee și recomandări pentru destinațiile unde livrăm mașinile."
}
```

### Example 201 response
```json
{
  "data": {
    "id": 7,
    "name": "Travel Guides",
    "slug": "travel-guides",
    "description": "Articole despre trasee și recomandări pentru destinațiile unde livrăm mașinile.",
    "created_at": "2025-01-05T12:00:00Z",
    "updated_at": "2025-01-05T12:00:00Z"
  }
}
```

## PUT `/api/blog-categories/{id}`

### Example request body
```json
{
  "name": "Sfaturi de călătorie",
  "description": "Roadtrip tips, condus în străinătate și recomandări de parcare."
}
```

### Example response
```json
{
  "data": {
    "id": 7,
    "name": "Sfaturi de călătorie",
    "slug": "sfaturi-de-calatorie",
    "description": "Roadtrip tips, condus în străinătate și recomandări de parcare.",
    "created_at": "2025-01-05T12:00:00Z",
    "updated_at": "2025-01-07T09:45:00Z"
  }
}
```

> Observați cum slug-ul este recalculat automat după schimbarea numelui.

## DELETE `/api/blog-categories/{id}`
```json
{ "deleted": true }
```


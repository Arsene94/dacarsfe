# Blog Tags API

Blog tags share the same CRUD infrastructure as categories. All routes sit under `/api`, expect an authenticated Sanctum token and enforce the `blog_tags.*` permission scope.

## Endpoint overview
| Method | URL | Description | Required permission |
| --- | --- | --- | --- |
| GET | `/api/blog-tags` | Paginated listing with filters. | `blog_tags.view` |
| GET | `/api/blog-tags?limit=15` | First N records without pagination metadata. | `blog_tags.view` |
| GET | `/api/blog-tags/{id}` | Fetch a single tag. | `blog_tags.view` |
| POST | `/api/blog-tags` | Create a tag (slug auto-generated). | `blog_tags.create` |
| PUT | `/api/blog-tags/{id}` | Update name / description. | `blog_tags.update` |
| DELETE | `/api/blog-tags/{id}` | Remove a tag (detaches automatically from pivot). | `blog_tags.delete` |

> **Slug lifecycle** – `BlogTagObserver` updates `slug` whenever the `name` changes or when the record is first created.

## GET `/api/blog-tags`

### Query parameters
- `per_page`, `page`, `limit`, `sort`, `fields` – identical semantics to the categories endpoint.
- `name` – Uses the implicit `name_like` filter declared on the controller.
- `slug` – Exact equality filter.

### Example paginated response
```json
{
  "data": [
    {
      "id": 11,
      "name": "sfaturi-condus",
      "slug": "sfaturi-condus",
      "description": "Recomandări pentru condus defensiv și livrare în aeroport",
      "created_at": "2025-01-06T09:00:00Z",
      "updated_at": "2025-01-06T09:00:00Z"
    },
    {
      "id": 10,
      "name": "oferte",
      "slug": "oferte",
      "description": "Promoții sezoniere, coduri de reducere și pachete corporate",
      "created_at": "2025-01-04T14:20:00Z",
      "updated_at": "2025-01-05T07:10:00Z"
    }
  ],
  "links": {
    "first": "https://api.dacars.test/api/blog-tags?page=1",
    "last": "https://api.dacars.test/api/blog-tags?page=3",
    "prev": null,
    "next": "https://api.dacars.test/api/blog-tags?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 3,
    "links": [
      { "url": null, "label": "&laquo; Previous", "active": false },
      { "url": "https://api.dacars.test/api/blog-tags?page=1", "label": "1", "active": true },
      { "url": "https://api.dacars.test/api/blog-tags?page=2", "label": "2", "active": false },
      { "url": "https://api.dacars.test/api/blog-tags?page=3", "label": "3", "active": false },
      { "url": "https://api.dacars.test/api/blog-tags?page=2", "label": "Next &raquo;", "active": false }
    ],
    "path": "https://api.dacars.test/api/blog-tags",
    "per_page": 20,
    "to": 20,
    "total": 41
  }
}
```

## GET `/api/blog-tags/{id}`
```json
{
  "data": {
    "id": 11,
    "name": "sfaturi-condus",
    "slug": "sfaturi-condus",
    "description": "Recomandări pentru condus defensiv și livrare în aeroport",
    "created_at": "2025-01-06T09:00:00Z",
    "updated_at": "2025-01-06T09:00:00Z"
  }
}
```

## POST `/api/blog-tags`

### Example request body
```json
{
  "name": "sfaturi-condus",
  "description": "Recomandări pentru condus defensiv și livrare în aeroport"
}
```

### Example 201 response
```json
{
  "data": {
    "id": 11,
    "name": "sfaturi-condus",
    "slug": "sfaturi-condus",
    "description": "Recomandări pentru condus defensiv și livrare în aeroport",
    "created_at": "2025-01-06T09:00:00Z",
    "updated_at": "2025-01-06T09:00:00Z"
  }
}
```

## PUT `/api/blog-tags/{id}`

### Example request body
```json
{
  "name": "tips-soferi",
  "description": "Sfaturi pentru șoferii care preiau mașina din aeroport"
}
```

### Example response
```json
{
  "data": {
    "id": 11,
    "name": "tips-soferi",
    "slug": "tips-soferi",
    "description": "Sfaturi pentru șoferii care preiau mașina din aeroport",
    "created_at": "2025-01-06T09:00:00Z",
    "updated_at": "2025-01-08T11:30:00Z"
  }
}
```

## DELETE `/api/blog-tags/{id}`
```json
{ "deleted": true }
```


# Services, Taxes & Price Rules API

These endpoints manage ancillary services, tax rates, and per-category price ladders. Public GET routes surface the catalogue for booking flows; write operations require admin permissions.

## Additional services (`/api/services`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/services` | Paginated list of services with translations. Supports `status`, `name_like`. | Public | – |
| GET `/api/services/{id}` | Retrieve a service. | Public | – |
| POST `/api/services` | Create a service (fields below). | Admin | `services.create` |
| PUT/PATCH `/api/services/{id}` | Update service. | Admin | `services.update` |
| DELETE `/api/services/{id}` | Delete service. | Admin | `services.delete` |
| GET `/api/services/{id}/translations` | List translations. | Admin | `services.view_translations` |
| PUT `/api/services/{id}/translations/{lang}` | Upsert translation. | Admin | `services.update_translations` |
| DELETE `/api/services/{id}/translations/{lang}` | Remove translation. | Admin | `services.delete_translations` |

### Fields
- `name` (required on create) – string max 255.
- `description`, `content` – optional text.
- `price` – numeric >= 0.
- `image`, `logo` – string paths.
- `status` – `published`, `pending`, `unavailable`.

### Example request
```json
{
  "name": "Asigurare CASCO extinsă",
  "description": "Rambursăm integral avariile neculpabile.",
  "price": 12,
  "status": "published",
  "image": "services/casco-plus.webp"
}
```

### Response
```json
{
  "data": {
    "id": 3,
    "name": "Asigurare CASCO extinsă",
    "description": "Rambursăm integral avariile neculpabile.",
    "content": null,
    "price": 12,
    "image": "services/casco-plus.webp",
    "logo": null,
    "status": "published",
    "created_at": "2025-02-14T09:30:00+02:00",
    "updated_at": "2025-02-14T09:30:00+02:00"
  }
}
```

Translations accept any combination of `name`, `description`, `content` and respond with the stored row.

---

## Taxes (`/api/taxes`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/taxes` | Paginated list of tax rules. Filter by `status`. | Public | – |
| GET `/api/taxes/{id}` | Retrieve a tax. | Public | – |
| POST `/api/taxes` | Create a tax (`name`, `percentage`, optional `priority`). | Admin | `taxes.create` |
| PUT/PATCH `/api/taxes/{id}` | Update a tax. | Admin | `taxes.update` |
| DELETE `/api/taxes/{id}` | Delete. | Admin | `taxes.delete` |
| GET `/api/taxes/{id}/translations` | List translations (`name`). | Admin | `taxes.view_translations` |
| PUT `/api/taxes/{id}/translations/{lang}` | Upsert translation. | Admin | `taxes.update_translations` |
| DELETE `/api/taxes/{id}/translations/{lang}` | Delete translation. | Admin | `taxes.delete_translations` |

### Example request
```json
{
  "name": "TVA",
  "percentage": 19,
  "status": "published",
  "priority": 10
}
```

### Response
```json
{
  "data": {
    "id": 2,
    "name": "TVA",
    "percentage": 19,
    "status": "published",
    "priority": 10,
    "created_at": "2025-02-14T09:45:00+02:00",
    "updated_at": "2025-02-14T09:45:00+02:00"
  }
}
```

---

## Price ladder (`/api/prices`)
Defines the per-day base price for each car category and day range. Responses include the related category and optional calendar rows.

| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/prices` | List price rows; filter by `category_id`. | Public | – |
| GET `/api/prices/{id}` | Retrieve a row. | Public | – |
| POST `/api/prices` | Create a price rule. | Admin | `prices.create` |
| PUT/PATCH `/api/prices/{id}` | Update a price rule. | Admin | `prices.update` |
| DELETE `/api/prices/{id}` | Delete a price rule. | Admin | `prices.delete` |

### Fields
- `category_id` (required) – references `dacars_car_categories.id`.
- `days` (required) – integer >= 1, inclusive lower bound.
- `days_end` – optional upper bound (nullable for open-ended tiers).
- `price` (required) – numeric >= 0.

### Example create
```json
{
  "category_id": 5,
  "days": 1,
  "days_end": 3,
  "price": 45
}
```

### Response
```json
{
  "id": 14,
  "category_id": 5,
  "days": 1,
  "days_end": 3,
  "price": 45,
  "category": {
    "id": 5,
    "name": "Family",
    "status": "published",
    "icon": "icons/family.svg",
    "order": 1,
    "is_featured": true,
    "is_default": false
  },
  "price_calendar": null,
  "created_at": "2025-02-14T10:00:00+02:00",
  "updated_at": "2025-02-14T10:00:00+02:00"
}
```

---

## Validation errors
Failures return the standard Laravel JSON structure. Example missing `price` when creating a service:
```json
{
  "message": "The price field is required.",
  "errors": {
    "price": ["The price field is required."]
  }
}
```

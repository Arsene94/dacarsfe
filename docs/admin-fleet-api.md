# Admin Fleet Management API

Admin-only endpoints for managing cars, their categories, colours, and translated copy. All routes require an authenticated Sanctum token and the permissions indicated below.

## Endpoint overview
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| POST | `/api/cars` | Create a new car. | `cars.create` |
| PUT/PATCH | `/api/cars/{id}` | Update car attributes (pricing metadata, specs, images). | `cars.update` |
| DELETE | `/api/cars/{id}` | Remove a car (soft-delete if your model uses `SoftDeletes`). | `cars.delete` |
| POST | `/api/cars/{id}/sync-categories` | Replace the car-category pivot set. | `cars.sync_categories` |
| POST | `/api/cars/{id}/sync-colors` | Replace the car-colour pivot set. | `cars.sync_colors` |
| GET | `/api/admin/cars/expiring-documents` | List cars whose technical documents expire within `within_days` (default 7). | `cars.view` |
| GET | `/api/cars/{id}/translations` | List stored translations for `name`, `description`, `content`. | `cars.view_translations` |
| PUT | `/api/cars/{id}/translations/{lang}` | Upsert a translation row. | `cars.update_translations` |
| DELETE | `/api/cars/{id}/translations/{lang}` | Delete a translation row. | `cars.delete_translations` |

`CarController` reuses the public JSON resource, so responses mirror the structure documented in [Cars API](./cars-api.md).

---

## POST `/api/cars`
Accepted fields (all optional unless marked *required*):

- `name`* – string, max 255.
- `description` – string.
- `content` – string (HTML/Markdown).
- `images` – stringified JSON/CSV (the accessor `images_array` parses it for responses).
- `license_plate` – string, max 15.
- `make_id` – FK into `dacars_car_makes`.
- `status` – `available`, `pending`, or `unavailable`.
- `year` – integer between 1900 and next year.
- `mileage` – integer >= 0.
- `vehicle_type_id`, `transmission_id`, `fuel_type_id` – foreign keys.
- `number_of_seats`, `number_of_doors` – integers.
- `vin` – string, max 191.
- `deposit`, `weight`, `weight_front` – integers >= 0.
- `is_partner` – boolean.
- `partner_id` – user ID.
- `partner_percentage` – integer 0-100.
- `itp_expires_at`, `rovinieta_expires_at`, `insurance_expires_at` – ISO dates.

### Request
```json
{
  "name": "Skoda Octavia Combi Style",
  "description": "Break spațios cu portbagaj de 640L.",
  "images": "[\"cars/21/main.webp\", \"cars/21/detail-dashboard.webp\"]",
  "license_plate": "B-55-SKO",
  "make_id": 7,
  "vehicle_type_id": 4,
  "transmission_id": 2,
  "fuel_type_id": 3,
  "status": "available",
  "year": 2024,
  "mileage": 8500,
  "number_of_seats": 5,
  "number_of_doors": 5,
  "deposit": 500,
  "weight": 1360,
  "weight_front": 650,
  "is_partner": false,
  "partner_percentage": null,
  "itp_expires_at": "2026-01-15",
  "rovinieta_expires_at": "2025-11-01",
  "insurance_expires_at": "2025-12-15"
}
```

### Response (201)
`CarResource` payload identical to the public catalogue. Include `start_date`/`end_date` query parameters if you want computed rates in the response.

---

## PUT `/api/cars/{id}`
Sends the same fields as `store`, but each rule becomes `sometimes`. Validation ensures foreign keys and enums remain valid.

### Sample request
```json
{
  "status": "pending",
  "mileage": 9100,
  "images": "[\"cars/21/main.webp\", \"cars/21/detail-dashboard.webp\", \"cars/21/rear.webp\"]",
  "partner_id": 42,
  "partner_percentage": 40
}
```

### Response
```json
{
  "data": {
    "id": 21,
    "name": "Skoda Octavia Combi Style",
    "status": "pending",
    "mileage": 9100,
    "partner_id": 42,
    "partner_percentage": 40,
    "images": [
      "cars/21/main.webp",
      "cars/21/detail-dashboard.webp",
      "cars/21/rear.webp"
    ],
    "updated_at": "2025-02-14T11:22:00+02:00"
  }
}
```

---

## DELETE `/api/cars/{id}`
Returns `{ "deleted": true }` on success. If the model uses soft deletes the record remains in the database for restoration.

---

## GET `/api/admin/cars/expiring-documents`

Returns the cars whose `itp_expires_at`, `rovinieta_expires_at`, or `insurance_expires_at` values occur within the next `within_days` days. By default the controller filters with `within_days=7`. The response mirrors the public car resource but only the identification and expiry fields are required by the dashboard.

### Query parameters
- `within_days` – optional positive integer. Overrides the default 7-day window.

### Sample response
```json
{
  "data": [
    {
      "id": 21,
      "name": "Skoda Octavia Combi Style",
      "license_plate": "B-55-SKO",
      "itp_expires_at": "2025-02-20",
      "rovinieta_expires_at": "2025-02-18",
      "insurance_expires_at": "2025-02-15"
    },
    {
      "id": 12,
      "name": "Dacia Logan",
      "license_plate": "B-99-LOG",
      "itp_expires_at": null,
      "rovinieta_expires_at": "2025-02-19",
      "insurance_expires_at": null
    }
  ],
  "meta": {
    "count": 2,
    "current_page": 1,
    "per_page": 50
  }
}
```

---

## POST `/api/cars/{id}/sync-categories`
Accepts either a single `category_id` or an array `category_ids`. The controller syncs the pivot table and flushes cached car listings.

```json
{
  "category_ids": [5, 8]
}
```

Response:
```json
{ "ok": true }
```

## POST `/api/cars/{id}/sync-colors`
Replaces the colour pivot set.

```json
{
  "color_ids": [2, 7, 9]
}
```

Response:
```json
{ "ok": true }
```

---

## Car translations
The translation helpers operate on the legacy tables (e.g. `dacars_cars_translations`). Each row contains `lang_code`, the foreign key (`dacars_cars_id`), and the translated fields.

### GET `/api/cars/{id}/translations`
```json
[
  {
    "lang_code": "en",
    "dacars_cars_id": 21,
    "name": "Skoda Octavia Estate Style",
    "description": "Spacious estate with 640L boot.",
    "content": null
  },
  {
    "lang_code": "de",
    "dacars_cars_id": 21,
    "name": "Skoda Octavia Combi Style",
    "description": "Geräumiger Kombi mit 640L Kofferraum.",
    "content": null
  }
]
```

### PUT `/api/cars/{id}/translations/{lang}`
Body accepts any subset of `name`, `description`, `content` (strings). Missing fields remain unchanged.

```json
{
  "name": "Skoda Octavia Estate Style",
  "description": "Spacious estate with 640L boot and adaptive cruise control."
}
```

Response mirrors the stored row.

### DELETE `/api/cars/{id}/translations/{lang}`
Deletes the translation and returns `{ "deleted": true }`.

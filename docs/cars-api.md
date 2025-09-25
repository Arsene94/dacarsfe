# Cars API (public catalogue)

Public endpoints that expose the rentable fleet. Results are powered by `CarResource`, include computed pricing, and support extensive filtering. All routes live under `/api/cars/{lang?}` and are publicly accessible unless stated otherwise.

## Endpoint overview
| Method | URL | Description |
| --- | --- | --- |
| GET | `/api/cars/{lang?}` | List cars with make, type, transmission, fuel, categories, optional colours and reviews. |
| GET | `/api/cars/{id}/{lang?}` | Fetch a single car record; accepts the same pricing/date query parameters as the index. |
| GET | `/api/cars/{id}/info-for-booking/{lang?}` | Car detail enriched with availability flag and computed totals for a requested window. |
| GET | `/api/cars/{id}/availability/{lang?}` | Alias of `info-for-booking` returning only `available`? *(Not implemented; use `info-for-booking`)* |
| POST | `/api/cars/{id}/view` | Optional hit endpoint to increment custom view counters (requires project-specific implementation). |

> **Authentication:** none of these routes require a token. Rate limiting is only applied to the optional `POST /view` tracker (`throttle:120,1`).

---

## Common query parameters
- `per_page` / `page` – pagination controls (default 20 per page, max 100 via `limit`).
- `limit` – bypass pagination and return the first *N* cars (capped at 100).
- `include` – comma-separated relations (`make,type,transmission,fuel,categories,colors,reviews`).
- `search` – multi-term search applied to car name, license plate, make, transmission, fuel (`search=logan manual`).
- `status` – filter by status (`available`, `pending`, `unavailable`).
- `make_id`, `vehicle_type_id`, `transmission_id`, `fuel_type_id`, `year` – equality filters.
- `pickup` / `dropoff` or `start_date` / `end_date` – compute prices and annotate availability for the requested rental window.
- `sort` / `sort_by` – `cheapest`, `most_expensive`, or default weight ordering.

`info-for-booking` additionally validates `start_date` / `end_date` (ISO datetime) and rejects invalid ranges.

---

## GET `/api/cars/{lang?}`
Append the optional locale slug (`en`, `ro`, `de`, etc.) to retrieve copy already localised for that language. Omitting it keeps the legacy behaviour.
Example response with implicit eager-loaded relations (`make`, `type`, `transmission`, `fuel`, `categories`) and computed pricing fields (`base_price`, `rental_rate`, `total_deposit`, `days`, etc.).

```json
{
  "data": [
    {
      "id": 17,
      "name": "Dacia Jogger Expression 1.0 TCe",
      "description": "7 locuri, transmisie manuală",
      "content": null,
      "images": [
        "cars/17/gallery/main.webp",
        "cars/17/gallery/interior-1.webp"
      ],
      "image_preview": "cars/17/gallery/main.webp",
      "license_plate": "IF-12-DAC",
      "make_id": 2,
      "status": "available",
      "year": 2024,
      "mileage": 12500,
      "vehicle_type_id": 3,
      "transmission_id": 1,
      "fuel_type_id": 2,
      "number_of_seats": 7,
      "number_of_doors": 5,
      "vin": "UU15RFLUXRA123456",
      "deposit": 400,
      "weight": 1330,
      "weight_front": 620,
      "available": true,
      "base_price": 36,
      "rental_rate": 36,
      "rental_rate_casco": 45,
      "days": 6,
      "total_deposit": 216,
      "total_without_deposit": 270,
      "is_partner": false,
      "partner_id": null,
      "partner_percentage": null,
      "itp_expires_at": "2025-12-31",
      "rovinieta_expires_at": "2025-05-01",
      "insurance_expires_at": "2025-08-15",
      "created_at": "2024-10-12T08:00:00+02:00",
      "updated_at": "2025-02-01T14:00:00+02:00",
      "make": { "id": 2, "name": "Dacia", "status": "published", "logo": null, "image": null, "icon": null },
      "type": { "id": 3, "name": "SUV", "status": "published", "logo": null, "image": null, "icon": null },
      "transmission": { "id": 1, "name": "Manual", "status": "published", "logo": null, "image": null, "icon": null },
      "fuel": { "id": 2, "name": "Benzină", "status": "published", "logo": null, "image": null, "icon": null },
      "categories": [
        { "id": 5, "name": "Family", "status": "published", "logo": null, "image": null, "icon": null }
      ],
      "category": { "id": 5, "name": "Family", "status": "published", "logo": null, "image": null, "icon": null },
      "coupon": null
    }
  ],
  "links": {
    "first": "https://api.dacars.test/api/cars?page=1",
    "last": "https://api.dacars.test/api/cars?page=12",
    "prev": null,
    "next": "https://api.dacars.test/api/cars?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 12,
    "path": "https://api.dacars.test/api/cars",
    "per_page": 20,
    "to": 20,
    "total": 234
  }
}
```

---

## GET `/api/cars/{id}/{lang?}`
Returns the same `CarResource` structure as the list item. Supply `start_date`/`end_date` (or `pickup`/`dropoff`) to compute price/availability for the requested window.

```json
{
  "data": {
    "id": 17,
    "name": "Dacia Jogger Expression 1.0 TCe",
    "available": true,
    "base_price": 36,
    "rental_rate": 36,
    "rental_rate_casco": 45,
    "total_deposit": 216,
    "total_without_deposit": 270,
    "days": 6,
    "make": { "id": 2, "name": "Dacia" },
    "type": { "id": 3, "name": "SUV" },
    "transmission": { "id": 1, "name": "Manual" },
    "fuel": { "id": 2, "name": "Benzină" },
    "categories": [ { "id": 5, "name": "Family" } ]
  }
}
```

Missing IDs trigger HTTP 404.

---

## GET `/api/cars/{id}/info-for-booking/{lang?}`
Enhances the single-car view with a reliable availability flag. The controller checks overlapping bookings with `status = reserved`, honours exact datetimes, and still returns pricing metadata even when the car is unavailable.

### Request
```
GET /api/cars/17/info-for-booking/ro?start_date=2025-03-12T09:00&end_date=2025-03-18T09:00
```

### Response
```json
{
  "data": {
    "id": 17,
    "name": "Dacia Jogger Expression 1.0 TCe",
    "available": true,
    "rental_rate": 36,
    "rental_rate_casco": 45,
    "total_deposit": 216,
    "total_without_deposit": 270,
    "days": 6,
    "category": { "id": 5, "name": "Family" },
    "categories": [ { "id": 5, "name": "Family" } ],
    "make": { "id": 2, "name": "Dacia" },
    "type": { "id": 3, "name": "SUV" },
    "transmission": { "id": 1, "name": "Manual" },
    "fuel": { "id": 2, "name": "Benzină" }
  },
  "available": true
}
```

If the car status is not `available` or an overlapping booking exists the `available` flag becomes `false` while the rest of the payload stays populated (useful for showing alternative dates).

---

## POST `/api/cars/{id}/view`
This endpoint is intentionally lightweight and project-specific. The route exists so you can hook a custom handler that records view counters (for example by inserting into `dacars_car_views`). At the moment no controller method is implemented in the repository, so calling it will yield `501 Not Implemented` unless you provide your own action. Recommended contract:

```http
POST /api/cars/17/view
Authorization: none

→ 204 No Content
```

Storefronts should debounce calls and respect the rate limit of 120 requests/minute per IP.

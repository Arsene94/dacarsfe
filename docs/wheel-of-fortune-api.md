# Wheel of Fortune API

Wheel configuration and prize listings are exposed publicly so the marketing site can render active campaigns and recent winners. Administrative writes for prize records and scheduling periods continue to require Sanctum authentication plus the granular permissions listed below.

## Public endpoints

### Wheel configuration (`/api/wheel-of-fortunes`)
| Method | URL | Description |
| --- | --- | --- |
| GET | `/api/wheel-of-fortunes` | List wheel slices. Supports `?include=period` and filter/query helpers from `BaseCrudController`. |
| GET | `/api/wheel-of-fortunes/{id}` | Retrieve a specific slice. |
| POST | `/api/wheel-of-fortunes` | Create a new slice for the active wheel campaign. |
| PUT/PATCH | `/api/wheel-of-fortunes/{id}` | Update slice details (probability, colors, etc.). |
| DELETE | `/api/wheel-of-fortunes/{id}` | Remove a slice. |

#### Fields
- `period_id` (required) – existing period.
- `title` (required) – string max 255.
- `description` – optional string.
- `color` (required) – hex value or CSS-compatible string.
- `probability` (required) – numeric 0-100.
- `type` (required) – one of:
  - `percentage_discount`
  - `fixed_discount`
  - `extra_rental_day`
  - `vehicle_upgrade`
  - `try_again`
  - `extra_service`
  - `voucher`
  - `other`
- `amount` – required when `type` is `percentage_discount`, `fixed_discount`, or `extra_rental_day`.

#### Example create
```json
{
  "period_id": 1,
  "title": "Reducere 20 €",
  "description": "Voucher valabil 30 de zile",
  "color": "#38B275",
  "probability": 12.5,
  "type": "fixed_discount",
  "amount": 20
}
```

Response:
```json
{
  "id": 5,
  "period_id": 1,
  "title": "Reducere 20 €",
  "description": "Voucher valabil 30 de zile",
  "color": "#38B275",
  "probability": 12.5,
  "type": "fixed_discount",
  "amount": 20,
  "created_at": "2025-02-14T11:20:00+02:00",
  "updated_at": "2025-02-14T11:20:00+02:00"
}
```

Validation ensures `amount` is supplied when required and returns descriptive errors (422) otherwise.

### Prize listings (`/api/wheel-of-fortune-prizes`)
| Method | URL | Description |
| --- | --- | --- |
| GET | `/api/wheel-of-fortune-prizes` | List prize entries (includes the related wheel slice). |
| GET | `/api/wheel-of-fortune-prizes/{id}` | Retrieve a specific prize entry. |

## Admin-protected endpoints

Administrative actions below require `auth:sanctum` and the indicated permission middleware.

### Prize management writes (`/api/wheel-of-fortune-prizes`)
| Method | Description | Permission |
| --- | --- | --- |
| POST `/api/wheel-of-fortune-prizes` | Record a winner after spinning the wheel. Auto-fills the request IP if omitted. | `wheel_of_fortune_prizes.create` |
| PUT/PATCH `/api/wheel-of-fortune-prizes/{id}` | Update winner details. | `wheel_of_fortune_prizes.update` |
| DELETE `/api/wheel-of-fortune-prizes/{id}` | Delete a prize entry. | `wheel_of_fortune_prizes.delete` |

### Request body (create)
```json
{
  "wheel_of_fortune_id": 2,
  "name": "Maria Enache",
  "phone": "+40 723 555 111"
}
```

### Response (201)
```json
{
  "id": 42,
  "wheel_of_fortune_id": 2,
  "name": "Maria Enache",
  "phone": "+40 723 555 111",
  "ip_address": "203.0.113.24",
  "created_at": "2025-02-14T11:05:00+02:00",
  "updated_at": "2025-02-14T11:05:00+02:00",
  "wheel_of_fortune": {
    "id": 2,
    "period_id": 1,
    "title": "Martie 2025 - reduceri",
    "description": "Promoția de primăvară",
    "color": "#38B275",
    "probability": 12.5,
    "type": "fixed_discount",
    "amount": 20
  }
}
```

Validation failures (missing phone, invalid ID) return HTTP 422.

### Wheel-of-fortune periods (`/api/wheel-of-fortune-periods`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/wheel-of-fortune-periods` | List periods (includes related wheels). | `wheel_of_fortune_periods.view` |
| GET `/api/wheel-of-fortune-periods/{id}` | Retrieve a period. | `wheel_of_fortune_periods.view` |
| POST `/api/wheel-of-fortune-periods` | Create a period (`name`, optional `starts_at`, `ends_at`, `active`, `active_months`). | `wheel_of_fortune_periods.create` |
| PUT/PATCH `/api/wheel-of-fortune-periods/{id}` | Update. | `wheel_of_fortune_periods.update` |
| DELETE `/api/wheel-of-fortune-periods/{id}` | Delete. | `wheel_of_fortune_periods.delete` |

Example request:
```json
{
  "name": "Martie 2025",
  "starts_at": "2025-03-01T00:00:00",
  "ends_at": "2025-03-31T23:59:59",
  "active": true,
  "active_months": [11, 12]
}
```

`active_months` accepts an array of month numbers (1 = ianuarie, 12 = decembrie). When it is populated the associated wheel
prizes will only be eligible for bookings that overlap at least one of those months, even if the reservation dates fall inside the
`starts_at`/`ends_at` interval.

Response includes nested wheels when `with=wheelOfFortunes` is requested.

## Error handling
- Missing IDs return HTTP 404.
- Invalid `type` values trigger `422` with messages such as `"The selected type is invalid."`.
- When required `amount` is absent, the API responds with `422 { "errors": { "amount": ["Câmpul amount este obligatoriu..."] } }`.

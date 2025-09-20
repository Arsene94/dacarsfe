# Wheel of Fortune API

Endpoints for configuring wheel-of-fortune campaigns and recording prize winners. Admin CRUD routes require Sanctum authentication plus granular permissions; the prize submission endpoint is public for participants.

## Prize submissions (public)
| Method | URL | Description |
| --- | --- | --- |
| POST | `/api/wheel-of-fortune-prizes` | Record a winner after spinning the wheel. Auto-fills the request IP if omitted. |

### Request body
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

---

## Admin dashboards
Admin routes live inside the Sanctum middleware group and apply the permissions shown below.

### Wheel-of-fortune periods (`/api/wheel-of-fortune-periods`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/wheel-of-fortune-periods` | List periods (includes related wheels). | `wheel_of_fortune_periods.view` |
| GET `/api/wheel-of-fortune-periods/{id}` | Retrieve a period. | `wheel_of_fortune_periods.view` |
| POST `/api/wheel-of-fortune-periods` | Create a period (`name`, optional `starts_at`, `ends_at`, `active`). | `wheel_of_fortune_periods.create` |
| PUT/PATCH `/api/wheel-of-fortune-periods/{id}` | Update. | `wheel_of_fortune_periods.update` |
| DELETE `/api/wheel-of-fortune-periods/{id}` | Delete. | `wheel_of_fortune_periods.delete` |

Example request:
```json
{
  "name": "Martie 2025",
  "starts_at": "2025-03-01T00:00:00",
  "ends_at": "2025-03-31T23:59:59",
  "active": true
}
```

Response includes nested wheels when `with=wheelOfFortunes` is requested.

### Wheel configuration (`/api/wheel-of-fortunes`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/wheel-of-fortunes` | List wheels. | `wheel_of_fortunes.view` |
| GET `/api/wheel-of-fortunes/{id}` | Retrieve a wheel. | `wheel_of_fortunes.view` |
| POST `/api/wheel-of-fortunes` | Create a wheel slice. | `wheel_of_fortunes.create` |
| PUT/PATCH `/api/wheel-of-fortunes/{id}` | Update wheel slice. | `wheel_of_fortunes.update` |
| DELETE `/api/wheel-of-fortunes/{id}` | Delete slice. | `wheel_of_fortunes.delete` |

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

### Prize management (`/api/wheel-of-fortune-prizes`)
| Method | Description | Permission |
| --- | --- | --- |
| GET `/api/wheel-of-fortune-prizes` | List prizes (with wheel relationship). | `wheel_of_fortune_prizes.view` |
| GET `/api/wheel-of-fortune-prizes/{id}` | Retrieve a prize. | `wheel_of_fortune_prizes.view` |
| PUT/PATCH `/api/wheel-of-fortune-prizes/{id}` | Update winner details. | `wheel_of_fortune_prizes.update` |
| DELETE `/api/wheel-of-fortune-prizes/{id}` | Delete a prize entry. | `wheel_of_fortune_prizes.delete` |

### Update example
```json
{
  "name": "Maria Enache",
  "phone": "+40 723 555 222",
  "wheel_of_fortune_id": 2
}
```

Response mirrors the stored row and includes the wheel relation if `?include=wheelOfFortune` is provided.

---

## Error handling
- Missing IDs return HTTP 404.
- Invalid `type` values trigger `422` with messages such as `"The selected type is invalid."`.
- When required `amount` is absent, the API responds with `422 { "errors": { "amount": ["Câmpul amount este obligatoriu..."] } }`.

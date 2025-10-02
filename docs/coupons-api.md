# Coupons API

Endpoints for coupon catalogue management and runtime validation. Public routes allow fetching coupon metadata and validating codes, while admin routes mutate coupons and require permissions.

## Endpoint overview
| Method | URL | Description | Auth | Permission |
| --- | --- | --- | --- | --- |
| GET | `/api/coupons` | List coupons (`CouponResource`). Supports pagination and `code_like`, `type`, `is_unlimited`, `is_unlimited_expires`. | Public | – |
| GET | `/api/coupons/{id}` | Retrieve a coupon. | Public | – |
| GET | `/api/coupons/validate?code=SPRING15&sub_total=200` | Quick availability check returning discount amount. | Public | – |
| POST | `/api/coupons/validate` | Validate a code for a specific car + rental window (returns decorated `CarResource`). | Public | – |
| POST | `/api/coupons` | Create coupon. | Admin | `coupons.create` |
| PUT/PATCH | `/api/coupons/{id}` | Update coupon. | Admin | `coupons.update` |
| DELETE | `/api/coupons/{id}` | Delete coupon. | Admin | `coupons.delete` |

### Coupon fields
- `code` (required on create) – string max 20.
- `type` – `percent`, `percentage`, `percent_off`, `fixed` (case-insensitive aliasing handled in code).
- `value` – numeric >= 0.
- `is_unlimited_expires` – boolean.
- `expires_at` – nullable date.
- `is_unlimited` – boolean (usage limit).
- `limit`, `used` – integers >= 0.
- `limited_to_email` – optional email address; când este setat, cuponul poate fi folosit doar cu aceeași adresă în payload-ul de rezervare.

---

## Admin create example
```json
{
  "code": "SPRING15",
  "type": "percent",
  "value": 15,
  "is_unlimited": false,
  "limit": 250,
  "expires_at": "2025-05-31",
  "limited_to_email": "vip@example.com"
}
```

Response:
```json
{
  "data": {
    "id": 9,
    "code": "SPRING15",
    "type": "percent",
    "value": 15,
    "is_unlimited_expires": false,
    "expires_at": "2025-05-31T00:00:00+03:00",
    "is_unlimited": false,
    "limit": 250,
    "used": 0,
    "limited_to_email": "vip@example.com",
    "created_at": "2025-02-14T10:20:00+02:00",
    "updated_at": "2025-02-14T10:20:00+02:00"
  }
}
```

Validation errors (e.g. duplicate code) return HTTP 422 with standard Laravel payloads.

---

## GET `/api/coupons/validate`
Fast lookup for displaying coupon badge information before building a booking quote.

```
GET /api/coupons/validate?code=SPRING15&sub_total=200
```

Response when valid:
```json
{
  "valid": true,
  "amount": 30,
  "type": "percent",
  "value": 15
}
```

If the code is invalid or expired the response is `{ "valid": false }` with HTTP 200.

---

## POST `/api/coupons/validate`
Applies a coupon to a specific car and rental interval, returning a decorated `CarResource` containing recalculated rates, totals, and coupon metadata. Required fields: `code`, `car_id`, `start_date`, `end_date`.

### Request
```json
{
  "code": "SPRING15",
  "car_id": 17,
  "start_date": "2025-03-12T09:00",
  "end_date": "2025-03-18T09:00",
  "customer_email": "maria.enache@example.com"
}
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
    "base_price": 45,
    "total_deposit": 216,
    "total_without_deposit": 270,
    "coupon": {
      "code": "SPRING15",
      "discount_deposit": 30,
      "discount_casco": 37.5
    },
    "days": 6,
    "rental_start_date": "2025-03-12T09:00:00+02:00",
    "rental_end_date": "2025-03-18T09:00:00+02:00"
  }
}
```

Invalid input (missing fields, nonexistent car) returns 422 with validation details. Dacă un cupon are `limited_to_email`, `customer_email` trebuie să coincidă altfel răspunsul este 422 cu mesajul `Emailul din cupon nu coincide cu cel din cererea de rezervare.` Expired or unknown coupons respond with HTTP 200 and `{ "message": "Invalid or expired coupon", "valid": false }`.

---

## Error responses
Deleting or updating unknown IDs returns 404. Attempting to create with an existing code yields:
```json
{
  "message": "The code has already been taken.",
  "errors": {
    "code": ["The code has already been taken."]
  }
}
```

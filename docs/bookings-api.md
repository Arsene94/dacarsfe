# Bookings API (public + customer)

The bookings controller powers public availability checks, quotes, and booking creation. Customer-authenticated routes allow cancelling their own reservations. All endpoints are served from `/api/bookings`.

## Endpoint overview
| Method | URL | Description | Auth | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/bookings` | Paginated list of bookings with customer, car, services and wheel prize relations. | Optional (`include` parameter) | Accepts filters for status, search, customer, car and date ranges. |
| GET | `/api/bookings/{id}` | Retrieve a single booking. | None | `include` works like the list endpoint. |
| POST | `/api/bookings/quote` | Compute pricing (rates, totals, discounts, wheel prize impact). | None | Validation mirrors the booking form. |
| POST | `/api/bookings/availability/check` | Check if a car is free between two dates. | None | Returns `{ "available": true|false }`. |
| POST | `/api/bookings` | Create a booking and compute totals. | None | Automatically links the authenticated customer if a token is provided. |
| PATCH | `/api/bookings/{id}/cancel` | Mark a booking as cancelled. | Bearer token (`customer` guard) | Returns the updated `BookingResource` and a message. |

> **Caching:** GET endpoints are cached for 10 minutes per filter combination. Mutations automatically flush the cache.

---

## Query parameters & filtering
- `status` – single value or comma-separated list (`pending,reserved`).
- `search` – fuzzy match on booking number, customer fields, car name, licence plate.
- `customer_id`, `car_id` – numeric filters.
- `start_date`, `end_date` – filter by `created_at` window (inclusive days).
- `from`, `to` – legacy rental window filters (`rental_start_date`, `rental_end_date`).
- `per_page`, `page` – pagination controls (`per_page` defaults to 20).
- `limit` – when present, bypasses pagination and returns the first *N* items.
- `include` – comma-separated relations (`customer,car,services,wheelPrize,wheelPrize.wheelOfFortune`).

---

## GET `/api/bookings`
Returns a Laravel paginator plus nested resources defined in `BookingResource`.

```json
{
  "data": [
    {
      "id": 412,
      "booking_number": "#1058821",
      "customer_id": 88,
      "customer_name": "Maria Enache",
      "customer_email": "maria.enache@example.com",
      "customer_phone": "+40 723 555 111",
      "customer_age": 32,
      "car_id": 17,
      "car_image": "cars/17/gallery/main.webp",
      "car_name": "Dacia Jogger Expression 1.0 TCe",
      "rental_start_date": "2025-03-12T09:00:00+02:00",
      "rental_end_date": "2025-03-18T09:00:00+02:00",
      "days": 6,
      "total": 247.0,
      "sub_total": 216.0,
      "total_services": 12.0,
      "advance_payment": 50.0,
      "price_per_day": 36.0,
      "with_deposit": true,
      "coupon_amount": 15.0,
      "coupon_code": "SPRING15",
      "coupon_type": "percent",
      "offers_discount": 30.0,
      "offer_fixed_discount": 10.0,
      "applied_offers": [
        {
          "id": 12,
          "title": "Weekend fără garanție",
          "offer_type": "percentage_discount",
          "offer_value": "20",
          "discount_label": "-20% reducere",
          "percent_discount_deposit": 20,
          "percent_discount_casco": 20,
          "fixed_discount_deposit": 10,
          "fixed_discount_casco": 10,
          "fixed_discount_deposit_applied": 10,
          "fixed_discount_casco_applied": 10,
          "discount_amount_deposit": 20,
          "discount_amount_casco": 20,
          "discount_amount": 20
        }
      ],
      "tax_amount": 0.0,
      "wheel_of_fortune_prize_id": 4,
      "total_before_wheel_prize": 231.0,
      "wheel_prize_discount": 20.0,
      "currency_id": "EUR",
      "note": "Predare la terminal Plecări.",
      "status": "reserved",
      "created_at": "2025-02-10T10:35:00+02:00",
      "updated_at": "2025-02-11T08:20:00+02:00",
      "wheel_prize": {
        "wheel_of_fortune_prize_id": 4,
        "wheel_of_fortune_id": 2,
        "title": "Reducere 20 €",
        "type": "fixed_discount",
      "type_label": "Reducere fixă",
      "amount": 20,
      "description": "Voucher aplicat automat la rezervare.",
      "discount_value": 20,
      "discount_value_deposit": 20,
      "discount_value_casco": 20,
      "eligible": true
      },
      "services": [
        { "id": 1, "name": "Scaun copil" },
        { "id": 3, "name": "Asigurare CASCO extinsă" }
      ],
      "car": {
        "id": 17,
        "name": "Dacia Jogger Expression 1.0 TCe",
        "description": "7 locuri, transmisie manuală",
        "content": null,
        "images": [
          "cars/17/gallery/main.webp"
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
        "coupon": null
      }
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

`wheel_prize.eligible` indică dacă reducerea aferentă premiului poate fi aplicată pentru intervalul de rezervare curent. Atunci
când este `false`, câmpurile `wheel_prize_discount` și `wheel_prize.discount_value` vor rămâne la `0` chiar dacă premiul există,
deoarece perioada configurată (`active_months`) nu se suprapune cu datele selectate. Pentru transparență expunem și `discount_value_deposit`/`discount_value_casco`, astfel încât clientul să poată afișa exact reducerea calculată pentru planul curent.

Structura `applied_offers` normalizează atât reducerile procentuale, cât și pe cele fixe. Fiecare intrare include valorile brute configurate în ofertă (`percent_discount_*`, `fixed_discount_*`), suma efectiv aplicată după scalare (`*_applied`) și totalurile per plan (`discount_amount_*`) plus valoarea finală (`discount_amount`) raportată în funcție de `with_deposit`.

---

## GET `/api/bookings/{id}`
Returns a single resource in the same shape as an item from the list. Missing IDs trigger HTTP 404.

---

## POST `/api/bookings/quote`
Validates the provided payload, resolves the base price via `CarPriceService`, applies coupons, optional add-on services, and wheel-of-fortune discounts. The result includes both per-day rates and totals.

### Request body
```json
{
  "car_id": 17,
  "rental_start_date": "2025-03-12T09:00:00",
  "rental_end_date": "2025-03-18T09:00:00",
  "with_deposit": true,
  "coupon_type": "percent",
  "coupon_amount": 15,
  "coupon_code": "SPRING15",
  "customer_email": "maria.enache@example.com",
  "service_ids": [1, 3],
  "wheel_prize_discount": 20,
  "wheel_of_fortune_prize_id": 4,
  "wheel_prize": {
    "prize_id": 4,
    "wheel_of_fortune_id": 2,
    "discount_value": 20,
    "eligible": true
  }
}
```

`service_ids` can be supplied to automatically include the configured prices of those add-ons in the quote. The endpoint looks up
the services and populates `total_services` in the response; the request field remains optional for backward compatibility and is
ignored when `service_ids` are present.

If a coupon is limited to a specific address (`limited_to_email`), the same value must be provided in `customer_email`; otherwise
the response is HTTP 422 with the validation error `Emailul din cupon nu coincide cu cel din cererea de rezervare.` When a coupon
enforces a booking window (`is_date_valid=true` together with `valid_start_date`/`valid_end_date`), the requested
`rental_start_date`/`rental_end_date` must fall inside that interval. Quotes outside the range are rejected with
`Cuponul nu este valabil pentru perioada selectată.`

Manual overrides can also be applied without a coupon code by providing `coupon_type` and `coupon_amount`:

- `per_day` – subtract a fixed value from the computed daily rate.
- `fixed_per_day` – force the daily rate to the supplied value.
- `days` – make the given number of rental days free of charge.
- `from_total` – subtract a flat amount from the computed subtotal.
- `percentage` – subtract the given percentage (0–100) from the subtotal. Send `coupon_amount` as the percentage value, e.g. `10`
  for a 10 % discount. The quote response returns the monetary value deducted via the usual `discount` / `coupon_amount` fields.

### Response
```json
{
  "price_per_day": 36,
  "base_price": 36,
  "base_price_casco": 45,
  "sub_total": 216,
  "sub_total_casco": 270,
  "discount": 15,
  "coupon_amount": 15,
  "coupon_code": "SPRING15",
  "total_services": 12,
  "service_ids": [1, 3],
  "total": 247,
  "total_casco": 302,
  "total_before_wheel_prize": 231,
  "offers_discount": 0,
  "offer_fixed_discount": 0,
  "wheel_prize_discount": 20,
  "deposit_waived": false,
  "applied_offers": [
    {
      "id": 12,
      "title": "Weekend fără garanție",
      "offer_type": "percentage_discount",
      "offer_value": "20",
      "discount_label": "-20% reducere",
      "percent_discount_deposit": 20,
      "percent_discount_casco": 20,
      "fixed_discount_deposit": 0,
      "fixed_discount_casco": 0,
      "fixed_discount_deposit_applied": 0,
      "fixed_discount_casco_applied": 0,
      "discount_amount_deposit": 20,
      "discount_amount_casco": 20,
      "discount_amount": 20
    }
  ],
  "wheel_prize": {
    "wheel_of_fortune_prize_id": 4,
    "wheel_of_fortune_id": 2,
    "title": "Reducere 20 €",
    "type": "fixed_discount",
    "type_label": "Reducere fixă",
    "amount": 20,
    "description": "Voucher aplicat automat la rezervare.",
    "discount_value": 20,
    "discount_value_deposit": 20,
    "discount_value_casco": 20,
    "eligible": true
  }
}
```

Validation failures respond with HTTP 422 detailing the offending fields (e.g. missing `car_id`, invalid `service_ids.*`).

`offers_discount` raportează totalul valorilor scăzute de engine-ul de oferte, iar `offer_fixed_discount` detaliază componenta fixă aplicată pentru planul curent. `applied_offers` conține lista promoțiilor validate (inclusiv titlul tradus și tipul din backend) alături de reducerile repartizate pe plan (`percent_discount_*`, `fixed_discount_*`, `discount_amount_*`). Dacă o ofertă de tip `deposit_waiver` este acceptată, câmpul `deposit_waived` devine `true` pentru a semnala că rezervarea nu mai necesită garanție, deși tariful promoțional rămâne cel de depozit.

---

## POST `/api/bookings/availability/check`
Minimal endpoint that proxies to `BookingService::checkAvailability`.

```json
{
  "car_id": 17,
  "start_date": "2025-03-12T09:00:00",
  "end_date": "2025-03-18T09:00:00"
}
```

Response:
```json
{ "available": true }
```

---

## POST `/api/bookings`
Persists a booking using `BookingService::create`. The controller recomputes pricing server-side to prevent tampering and automatically associates the authenticated customer (if any) by ID/email/phone.

### Request body
```json
{
  "customer_name": "Maria Enache",
  "customer_email": "maria.enache@example.com",
  "customer_phone": "+40 723 555 111",
  "car_id": 17,
  "rental_start_date": "2025-03-12T09:00:00",
  "rental_end_date": "2025-03-18T09:00:00",
  "price_per_day": 36,
  "with_deposit": true,
  "coupon_amount": 15,
  "coupon_code": "SPRING15",
  "coupon_type": "percent",
  "offers_discount": 30,
  "deposit_waived": false,
  "applied_offers": [
    {
      "id": 12,
      "title": "Weekend fără garanție",
      "offer_type": "percentage_discount",
      "offer_value": "20",
      "discount_label": "-20% reducere"
    }
  ],
  "total_services": 12,
  "service_ids": [1, 3],
  "wheel_prize_discount": 20,
  "wheel_of_fortune_prize_id": 4,
  "wheel_prize": {
    "prize_id": 4,
    "wheel_of_fortune_id": 2,
    "discount_value": 20,
    "eligible": true
  },
  "note": "Predare la terminal Plecări"
}
```

### Success response (HTTP 201)
`BookingResource` payload plus an informational message:

```json
{
  "data": {
    "id": 412,
    "booking_number": "#1058821",
    "customer_id": 88,
    "customer_name": "Maria Enache",
    "customer_email": "maria.enache@example.com",
    "customer_phone": "+40 723 555 111",
    "customer_age": null,
    "car_id": 17,
    "car_image": "cars/17/gallery/main.webp",
    "car_name": "Dacia Jogger Expression 1.0 TCe",
    "rental_start_date": "2025-03-12T09:00:00+02:00",
    "rental_end_date": "2025-03-18T09:00:00+02:00",
    "days": 6,
    "total": 247.0,
    "sub_total": 216.0,
    "total_services": 12.0,
    "advance_payment": 0,
    "price_per_day": 36.0,
  "with_deposit": true,
  "coupon_amount": 15.0,
  "coupon_code": "SPRING15",
  "coupon_type": "percent",
  "offers_discount": 30.0,
  "offer_fixed_discount": 10.0,
  "deposit_waived": false,
  "applied_offers": [
    {
      "id": 12,
      "title": "Weekend fără garanție",
      "offer_type": "percentage_discount",
      "offer_value": "20",
      "discount_label": "-20% reducere",
      "percent_discount_deposit": 20,
      "percent_discount_casco": 20,
      "fixed_discount_deposit": 10,
      "fixed_discount_casco": 10,
      "fixed_discount_deposit_applied": 10,
      "fixed_discount_casco_applied": 10,
      "discount_amount_deposit": 20,
      "discount_amount_casco": 20,
      "discount_amount": 20
    }
  ],
    "tax_amount": 0.0,
    "wheel_of_fortune_prize_id": 4,
    "total_before_wheel_prize": 231.0,
    "wheel_prize_discount": 20.0,
    "currency_id": null,
    "note": "Predare la terminal Plecări.",
    "status": "pending",
    "created_at": "2025-02-10T10:35:00+02:00",
    "updated_at": "2025-02-10T10:35:00+02:00",
    "wheel_prize": {
      "wheel_of_fortune_prize_id": 4,
      "wheel_of_fortune_id": 2,
      "title": "Reducere 20 €",
      "type": "fixed_discount",
      "type_label": "Reducere fixă",
      "amount": 20,
      "description": "Voucher aplicat automat la rezervare.",
      "discount_value": 20,
      "discount_value_deposit": 20,
      "discount_value_casco": 20,
      "eligible": true
    }
  },
  "message": "Booking created"
}
```

Availability conflicts or invalid date ranges trigger `422` errors sourced from `BookingService`.

Pe lângă câmpurile existente, `BookingResource` serializată de endpoint include suma totală `offers_discount`, componenta fixă aplicată (`offer_fixed_discount`), lista normalizată `applied_offers` cu reduceri distribuite pe plan și indicatorul `deposit_waived`, astfel încât aplicațiile client să știe ce promoții au fost acceptate, ce valoare s-a aplicat efectiv și dacă garanția a fost eliminată în urma unei oferte.

---

## PATCH `/api/bookings/{id}/cancel`
Requires a customer Sanctum token. Updates the status to `cancelled` and flushes caches.

```json
{
  "data": {
    "id": 412,
    "status": "cancelled",
    "booking_number": "#1058821",
    "total": 247.0,
    "price_per_day": 36.0,
    "with_deposit": true,
    "wheel_prize_discount": 20.0,
    "created_at": "2025-02-10T10:35:00+02:00",
    "updated_at": "2025-02-15T12:44:00+02:00"
  },
  "message": "Rezervarea a fost anulata"
}
```

If the booking does not belong to the authenticated customer, authorisation must be enforced at application level (the route currently exposes the controller directly, so the frontend should only send cancellations for bookings owned by the logged-in customer).

# Admin Booking Operations API

These endpoints extend the public bookings controller with admin-only abilities such as contract rendering, advanced updates, and customer lookups. They all require a Sanctum admin token and the permissions listed below.

## Endpoint overview
| Method | URL | Description | Required permission |
| --- | --- | --- | --- |
| POST | `/api/bookings/store-contract` | Persist a booking and immediately generate a filled PDF contract. | `bookings.store_contract` |
| POST | `/api/bookings/contract/{booking?}` | Render a contract PDF from an existing booking or from ad-hoc payload data. | `bookings.generate_contract` |
| PUT | `/api/bookings/{booking}` | Update pricing, dates, customer details, services, coupon metadata, etc. | `bookings.update` |
| PUT | `/api/bookings/{booking}/update-date` | Quick helper to adjust rental start/end based on arrival/return times. | `bookings.update_date` |
| POST | `/api/customers/get/byphone` | Search past bookings and customer records by phone fragment. | `customers.search_by_phone` |

All routes live inside the main `/api` prefix and inherit `auth:sanctum` middleware.

---

## POST `/api/bookings/store-contract`
This convenience endpoint combines booking creation with PDF contract generation. The controller normalises aliases coming from the legacy admin panel (`start`, `end`, `pricePerDay`, `services`, `advance`, `advancePayment`, `withDeposit`) and forwards the payload to the regular booking `store` logic. After persistence it recalculates totals and returns the generated contract URL.

### Request body
```json
{
  "customer_name": "Maria Enache",
  "customer_email": "maria.enache@example.com",
  "customer_phone": "+40 723 555 111",
  "car_id": 17,
  "start": "2025-03-12 09:00",
  "end": "2025-03-18 09:00",
  "pricePerDay": 36,
  "services": 12,
  "advance": 100,
  "withDeposit": true,
  "coupon_code": "SPRING15",
  "coupon_amount": 15,
  "wheel_prize_discount": 20,
  "wheel_of_fortune_prize_id": 4,
  "wheel_prize": {
    "prize_id": 4,
    "wheel_of_fortune_id": 2,
    "discount_value": 20
  },
  "cnp": "2850312123456",
  "license": "B-12-XYZ"
}
```

### Response (HTTP 201)
```json
{
  "data": {
    "id": 412,
    "booking_number": "#1058821",
    "customer_id": 88,
    "customer_name": "Maria Enache",
    "customer_email": "maria.enache@example.com",
    "customer_phone": "+40 723 555 111",
    "rental_start_date": "2025-03-12T09:00:00+02:00",
    "rental_end_date": "2025-03-18T09:00:00+02:00",
    "price_per_day": 36.0,
    "total": 247.0,
    "sub_total": 216.0,
    "total_services": 12.0,
    "with_deposit": true,
    "coupon_amount": 15.0,
    "coupon_code": "SPRING15",
    "status": "pending",
    "wheel_of_fortune_prize_id": 4,
    "wheel_prize_discount": 20.0,
    "total_before_wheel_prize": 231.0,
    "wheel_prize": {
      "wheel_of_fortune_prize_id": 4,
      "wheel_of_fortune_id": 2,
      "title": "Reducere 20 €",
      "type": "fixed_discount",
      "type_label": "Reducere fixă",
      "amount": 20,
      "description": "Voucher aplicat automat la rezervare.",
      "discount_value": 20
    }
  },
  "message": "Booking created",
  "contract_url": "https://api.dacars.test/storage/contracts/generated/4d5fbd48-0e0a-4207-8f0b-b0fa5d5e6c6d.pdf"
}
```

Errors (e.g. unavailable car, invalid date range, validation failures) propagate with HTTP 422.

---

## POST `/api/bookings/contract/{booking?}`
Generates a filled PDF contract. When a `booking` ID is provided the system loads the record, recalculates the rental duration, and merges optional overrides (e.g. `cnp`, `license`). Without an ID it expects the full booking context in the request body.

### Request examples
**Existing booking:**
```json
{
  "cnp": "2850312123456",
  "license": "B-12-XYZ"
}
```

**Ad-hoc payload:**
```json
{
  "bookingNumber": "#1058821",
  "name": "Maria Enache",
  "cnp": "2850312123456",
  "license": "B-12-XYZ",
  "start": "2025-03-12 09:00",
  "end": "2025-03-18 09:00",
  "pricePerDay": 36,
  "services": 12,
  "advance": 100,
  "balance": 147,
  "deposit": 400,
  "car": {
    "name": "Dacia Jogger Expression 1.0 TCe",
    "license_plate": "IF-12-DAC",
    "fuel": { "name": "Benzină" },
    "deposit": 400
  }
}
```

### Response
```json
{
  "url": "https://api.dacars.test/storage/contracts/generated/1d1d9ad3-f38e-4d21-8f66-7c6f08c56d44.pdf"
}
```

The PDF template is chosen based on whether the booking uses a deposit (`garantie.pdf`) or CASCO-only contract (`casco.pdf`).

---

## PUT `/api/bookings/{booking}`
Full update endpoint that validates the payload with `UpdateBookingRequest`, recalculates totals, synchronises wheel prize metadata, and keeps coupon integrity. Supply only the fields you want to change.

### Sample request
```json
{
  "customer_email": "maria.enache@corp.example",
  "rental_start_date": "2025-03-13T09:00:00",
  "rental_end_date": "2025-03-19T09:00:00",
  "total_services": 24,
  "service_ids": [1, 3, 5],
  "coupon_code": "SPRING15",
  "coupon_amount": 15,
  "with_deposit": false,
  "wheel_prize_discount": 0,
  "status": "reserved"
}
```

### Response
```json
{
  "data": {
    "id": 412,
    "booking_number": "#1058821",
    "customer_email": "maria.enache@corp.example",
    "rental_start_date": "2025-03-13T09:00:00+02:00",
    "rental_end_date": "2025-03-19T09:00:00+02:00",
    "price_per_day": 44.0,
    "sub_total": 264.0,
    "total_services": 24.0,
    "total": 288.0,
    "coupon_amount": 15.0,
    "with_deposit": false,
    "status": "reserved",
    "wheel_prize_discount": 0.0
  },
  "message": "Booking updated"
}
```

Availability conflicts or invalid ranges result in HTTP 422 with details such as `"car_id": "Car not available in the selected interval."`.

---

## PUT `/api/bookings/{booking}/update-date`
Lightweight helper primarily used by the operations dashboard. It expects plain arrival/return dates & times, updates the rental window, and returns the refreshed booking resource.

### Request
```json
{
  "arrivalDate": "2025-03-13",
  "arrivalTime": "10:30",
  "returnDate": "2025-03-19",
  "returnTime": "12:00"
}
```

### Response
```json
{
  "data": {
    "id": 412,
    "rental_start_date": "2025-03-13T10:30:00+02:00",
    "rental_end_date": "2025-03-19T12:00:00+02:00",
    "price_per_day": 44.0,
    "total": 288.0
  },
  "success": true
}
```

---

## POST `/api/customers/get/byphone`
Searches both the bookings table and the `dacars_customers` table for matching phone numbers (case-insensitive, partial match). Results are grouped by email address and include basic metadata.

### Request
```json
{
  "phone": "0723"
}
```

### Response
```json
[
  {
    "email": "maria.enache@example.com",
    "names": ["Maria Enache"],
    "phones": ["+40 723 555 111"],
    "latest": {
      "name": "Maria Enache",
      "phone": "+40 723 555 111",
      "created_at": "2025-02-10T10:35:00+02:00"
    }
  },
  {
    "email": null,
    "names": ["Client anonim"],
    "phones": ["0723 000 999"],
    "latest": {
      "name": "Client anonim",
      "phone": "0723 000 999",
      "created_at": null
    }
  }
]
```

When the `phone` parameter is missing or empty the controller returns an empty array.

# Admin Dashboard & Metrics API

Provides lightweight endpoints for the operations dashboard widgets. All routes require an authenticated Sanctum admin token and the permissions listed below.

## Activity widget (`/api/widgets/activity/{period?}`)
| Method | Description | Permission |
| --- | --- | --- |
| GET | `/api/widgets/activity/{period?}` | Returns upcoming pick-up/return bookings for the selected day. | `dashboard.view_widget_activity` |

### Path parameter
`period` accepts Romanian and English aliases:
- `azi`, `today`
- `maine`, `tomorrow`
- `2zile`, `2days`
- `3zile`, `3days`
- `4zile`, `4days`
- `5zile`, `5days`

Default is `azi` (today).

### Query parameters
- `paginate` – number of records per page (default 20, minimum 1).

### Response
```json
{
  "day": "2025-02-15",
  "period": "today",
  "hours": ["09:00", "13:30", "19:00"],
  "data": [
    {
      "id": 412,
      "booking_number": "#1058821",
      "flight_number": "RO317",
      "customer_name": "Maria Enache",
      "customer_phone": "+40 723 555 111",
      "note": "Predare la terminal Plecări.",
      "status": "reserved",
      "car_id": 17,
      "customer_id": 88,
      "rental_start_date": "2025-02-15T09:00:00+02:00",
      "rental_end_date": "2025-02-20T09:00:00+02:00",
      "total": 247,
      "sub_total": 216,
      "total_services": 12,
      "advance_payment": 100,
      "price_per_day": 36,
      "coupon_amount": 15,
      "coupon_type": "percent",
      "with_deposit": true,
      "services": [
        { "id": 1, "name": "Scaun copil" },
        { "id": 3, "name": "Asigurare CASCO extinsă" }
      ],
      "child_seat_service_name": "Scaun copil",
      "days": 6,
      "services_list": [
        { "id": 1, "name": "Scaun copil" },
        { "id": 3, "name": "Asigurare CASCO extinsă" }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 6,
    "last_page": 1,
    "from": 1,
    "to": 6
  }
}
```

---

## KPI metrics (`/api/admin/metrics/*`)
| Endpoint | Description | Permission | Query parameters |
| --- | --- | --- | --- |
| GET `/api/admin/metrics/bookings-today` | Count bookings occurring today. | `metrics.view_bookings_today` | `by` (`created`, `start`, `end`); `statuses` (CSV or `all`). |
| GET `/api/admin/metrics/cars-total` | Count cars (optionally filter by status). | `metrics.view_cars_total` | `status` (e.g. `available`). |
| GET `/api/admin/metrics/bookings-total` | Total bookings (filter by status set). | `metrics.view_bookings_total` | `statuses` (CSV or `all`). |

### Examples
```
GET /api/admin/metrics/bookings-today?by=start&statuses=reserved,completed
```
Response:
```json
{
  "date": "2025-02-15",
  "by": "start",
  "statuses": ["reserved", "completed"],
  "count": 18
}
```

```
GET /api/admin/metrics/cars-total?status=available
```
Response:
```json
{
  "status": "available",
  "count": 142
}
```

```
GET /api/admin/metrics/bookings-total?statuses=all
```
Response:
```json
{
  "statuses": "all",
  "count": 2284
}
```

### Notes
- Results are cached for 60 seconds; repeated requests within that window reuse cached values.
- Passing `statuses=all` skips the default filter set.

---

## Error handling
Invalid `period` or `by` values fall back to defaults. Missing authentication or permissions result in `401/403` from the middleware stack. Validation errors (e.g. non-integer `paginate`) use the standard Laravel JSON format.

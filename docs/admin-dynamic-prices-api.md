# Dynamic Prices API (admin)

Controls seasonal/occupancy-based percentage adjustments on top of base rates. All routes require an authenticated admin token plus the `dynamic_prices.*` permissions configured in `routes/api.php`.

## Endpoint overview
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/dynamic-prices` | List dynamic price campaigns (with percentage ranges). Supports `enabled` filter. | `dynamic_prices.view` |
| GET | `/api/dynamic-prices/{id}` | Retrieve a campaign. | `dynamic_prices.view` |
| POST | `/api/dynamic-prices` | Create a campaign. | `dynamic_prices.create` |
| PUT/PATCH | `/api/dynamic-prices/{id}` | Update campaign and percentages. | `dynamic_prices.update` |
| DELETE | `/api/dynamic-prices/{id}` | Delete campaign. | `dynamic_prices.delete` |

### Fields
- `start_from` (required) – date (`Y-m-d`).
- `end_to` (required) – date >= `start_from`.
- `enabled` – boolean.
- `percentages` – array of objects with:
  - `percentage_start` (required) – integer min 0.
  - `percentage_end` – nullable integer min 0.
  - `percentage_amount` (required) – numeric (can be negative for discounts or positive for surcharges).

The controller automatically sets `author_id` to the authenticated user.

---

## Create example
```json
{
  "start_from": "2025-07-01",
  "end_to": "2025-09-01",
  "enabled": true,
  "percentages": [
    {
      "percentage_start": 0,
      "percentage_end": 30,
      "percentage_amount": 10
    },
    {
      "percentage_start": 31,
      "percentage_end": 60,
      "percentage_amount": 5
    },
    {
      "percentage_start": 61,
      "percentage_end": null,
      "percentage_amount": -5
    }
  ]
}
```

### Response (201)
```json
{
  "data": {
    "id": 6,
    "start_from": "2025-07-01",
    "end_to": "2025-09-01",
    "enabled": true,
    "author_id": 12,
    "created_at": "2025-02-14T11:40:00+02:00",
    "updated_at": "2025-02-14T11:40:00+02:00",
    "percentages": [
      {
        "id": 18,
        "dynamic_price_id": 6,
        "percentage_start": 0,
        "percentage_end": 30,
        "percentage_amount": 10
      },
      {
        "id": 19,
        "dynamic_price_id": 6,
        "percentage_start": 31,
        "percentage_end": 60,
        "percentage_amount": 5
      },
      {
        "id": 20,
        "dynamic_price_id": 6,
        "percentage_start": 61,
        "percentage_end": null,
        "percentage_amount": -5
      }
    ]
  }
}
```

---

## Update example
Updating replaces the existing percentage rows when the `percentages` key is present.

```json
{
  "enabled": false,
  "percentages": [
    {
      "percentage_start": 0,
      "percentage_end": null,
      "percentage_amount": 7.5
    }
  ]
}
```

Response mirrors the resource with the new ranges. Omitting `percentages` leaves the previous set untouched.

---

## Error handling
- Missing or invalid dates result in `422 { "errors": { "end_to": ["The end to must be a date after or equal to start from."] } }`.
- Each percentage entry is validated; errors are scoped with dotted keys (`percentages.1.percentage_amount`).
- Unknown IDs return HTTP 404.

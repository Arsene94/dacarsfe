# Car Cashflows API

Track every incoming or outgoing amount for each vehicle, with a clear split between cash, card or mixed payments. All endpoints
require an authenticated admin and the relevant `car_cashflows.*` permission.

| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/car-cashflows` | Paginated ledger entries. Filter by `car_id`, `direction`, `expense_type`, `payment_method`, `created_by`, `occurred_on_date`, `occurred_on_month`, `created_date`, `created_month`. Supports `?include=car,createdBy`. | Admin | `car_cashflows.view` |
| GET `/api/car-cashflows/{id}` | Retrieve a single ledger entry with optional relationships. | Admin | `car_cashflows.view` |
| POST `/api/car-cashflows` | Create a new income or expense entry (fields below). | Admin | `car_cashflows.create` |
| PUT/PATCH `/api/car-cashflows/{id}` | Update an entry. Amount validations re-run when payment method changes. | Admin | `car_cashflows.update` |
| DELETE `/api/car-cashflows/{id}` | Remove an entry from the ledger. | Admin | `car_cashflows.delete` |

## Fields
- `car_id` – vehicle identifier (`dacars_cars.id`). Required for `direction = income` and for `direction = expense` when `expense_type = car`.
- `direction` (required) – `income` or `expense`.
- `expense_type` – required when `direction = expense`. One of `car`, `house`, `parking_wash`, `marketing`, `company_operations`, `salary`, `fuel`, `other`.
- `description` – free text explaining the transaction.
- `payment_method` (required) – one of `cash`, `card`, `cash_card`.
- `total_amount` (required) – numeric ≥ 0. For `cash`/`card` methods it is auto-aligned with the corresponding amount.
- `cash_amount` – numeric ≥ 0. Required (and >0) whenever `payment_method` is `cash_card`.
- `card_amount` – numeric ≥ 0. Required (and >0) whenever `payment_method` is `cash_card`.
- `occurred_on` (required) – Date and time (`Y-m-d H:i:s`) when the amount was recorded.
- `created_by` – optional admin/staff identifier. Defaults to the authenticated user when omitted.
- Responses include `created_by`. Use `?include=createdBy` to embed the staff profile that registered the entry.

### Filtering helpers

- `payment_method` – `cash`, `card` or `cash_card`.
- `expense_type` – any of the values listed above. Useful to split between fleet-specific and general expenses.
- `direction` – `income` or `expense`.
- `created_by` – numeric user id that registered the entry.
- `occurred_on_date` – filter by the calendar day the transaction happened (`Y-m-d`).
- `occurred_on_month` – filter by the month the transaction happened (`Y-m`).
- `created_date` – filter by the day the record was created in the system (`Y-m-d`).
- `created_month` – filter by the month the record was created in the system (`Y-m`).

## Validation rules
- For `payment_method = cash`, the whole `total_amount` is stored as cash. Any provided `card_amount` is ignored.
- For `payment_method = card`, the `total_amount` is stored as card. Any provided `cash_amount` is ignored.
- For `payment_method = cash_card`, both `cash_amount` and `card_amount` must be positive and their sum must equal `total_amount`.
- Updating the payment method from single to mixed requires sending both split amounts again.

## Example payloads

### Create a cash income
```json
{
  "car_id": 12,
  "direction": "income",
  "payment_method": "cash",
  "total_amount": 550.75,
  "occurred_on": "2025-03-12 10:15:00"
}
```

### Create a car expense with mixed payment
```json
{
  "car_id": 5,
  "direction": "expense",
  "expense_type": "car",
  "payment_method": "cash_card",
  "total_amount": 380,
  "cash_amount": 150,
  "card_amount": 230,
  "occurred_on": "2025-03-08 14:30:00",
  "description": "Revizie și ITP"
}
```

### Create a marketing expense without vehicle reference
```json
{
  "direction": "expense",
  "expense_type": "marketing",
  "payment_method": "cash",
  "total_amount": 1500,
  "occurred_on": "2025-03-11 10:00:00",
  "description": "Campanie Google Ads"
}
```

### Example response
```json
{
  "data": {
    "id": 27,
    "car_id": 5,
    "direction": "expense",
    "expense_type": "car",
    "description": "Revizie și ITP",
    "payment_method": "cash_card",
    "cash_amount": 150,
    "card_amount": 230,
    "total_amount": 380,
    "occurred_on": "2025-03-08 14:30:00",
    "created_by": 4,
    "created_at": "2025-03-08T10:45:00+02:00",
    "updated_at": "2025-03-08T10:45:00+02:00",
    "created_by_user": {
      "id": 4,
      "first_name": "Irina",
      "last_name": "Popescu",
      "email": "irina@dacars.ro",
      "username": "irina"
    }
  }
}
```

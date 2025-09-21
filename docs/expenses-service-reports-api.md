# Fleet Expenses & Service Reports API

These endpoints allow back-office teams to record operational spending and keep a detailed maintenance log for every vehicle.
Write operations require an authenticated admin user with the appropriate permissions.

## Expenses (`/api/expenses`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/expenses` | Paginated list of expenses. Supports `type`, `car_id`, `is_recurring`, plus `?include=car,recurrence`. | Admin | `expenses.view` |
| GET `/api/expenses/{id}` | Retrieve a single expense with optional relationships. | Admin | `expenses.view` |
| POST `/api/expenses` | Create a new expense (fields below). | Admin | `expenses.create` |
| PUT/PATCH `/api/expenses/{id}` | Update an expense. Recurring chains propagate updates forward. | Admin | `expenses.update` |
| DELETE `/api/expenses/{id}` | Remove an expense. For recurring entries the whole chain is deleted. | Admin | `expenses.delete` |

### Fields
- `type` (required) – one of `spalat`, `parcare`, `service`, `casa`, `marketing`, `altele`.
- `description` – optional text describing the cost.
- `amount` (required) – numeric ≥ 0.
- `spent_at` (required) – ISO date when the cost was incurred (e.g. `2025-03-15`).
- `car_id` – optional, links the expense to a car (`dacars_cars.id`).
- `is_recurring` – boolean flag (default `false`). When `true` the expense repeats monthly.
- `ends_on` – optional ISO date. When provided, recurring generation stops after that month.

### Recurring behaviour
- Setting `is_recurring = true` stores a template in `dacars_expense_recurrences` and instantly creates one entry per month up to the current month.
- Future months are auto-generated whenever the listing endpoint is requested or the chain is edited.
- Updating the first occurrence adjusts the recurrence day; other field changes propagate forward.
- Deleting any recurring expense removes the recurrence and all of its generated entries.

### Example create request
```json
{
  "type": "marketing",
  "description": "Campanie PPC",
  "amount": 2500,
  "spent_at": "2025-01-10",
  "is_recurring": true,
  "ends_on": "2025-12-31"
}
```

### Example response
```json
{
  "data": {
    "id": 7,
    "type": "marketing",
    "description": "Campanie PPC",
    "amount": 2500,
    "car_id": null,
    "spent_at": "2025-01-10",
    "is_recurring": true,
    "created_at": "2025-01-10T09:00:00+02:00",
    "updated_at": "2025-01-10T09:00:00+02:00",
    "recurrence": {
      "id": 3,
      "type": "marketing",
      "day_of_month": 10,
      "starts_on": "2025-01-10",
      "ends_on": "2025-12-31",
      "last_generated_period": "2025-03-01"
    }
  }
}
```

---

## Service reports (`/api/service-reports`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/service-reports` | Paginated list of maintenance sheets. Filter by `car_id` or `mechanic_name`. | Admin | `service_reports.view` |
| GET `/api/service-reports/{id}` | Retrieve a service report. | Admin | `service_reports.view` |
| POST `/api/service-reports` | Create a service sheet (fields below). | Admin | `service_reports.create` |
| PUT/PATCH `/api/service-reports/{id}` | Update a service sheet. | Admin | `service_reports.update` |
| DELETE `/api/service-reports/{id}` | Delete a service sheet. | Admin | `service_reports.delete` |

### Fields
- `mechanic_name` (required) – who handled the service.
- `serviced_at` (required) – ISO datetime when the service happened.
- `car_id` – optional car reference.
- `odometer_km` – optional integer odometer reading at service time.
- `oil_type` – optional text (e.g. `5W30`).
- `work_performed` – notes on what parts/fluids were replaced.
- `observations` – additional remarks for the fleet team.

### Example request
```json
{
  "mechanic_name": "Mihai Ionescu",
  "car_id": 12,
  "serviced_at": "2025-03-08T14:30:00+02:00",
  "odometer_km": 145200,
  "oil_type": "5W30",
  "work_performed": "Schimb ulei si filtre motor",
  "observations": "Recomandare: verificare placute frana luna viitoare"
}
```

### Example response
```json
{
  "data": {
    "id": 18,
    "mechanic_name": "Mihai Ionescu",
    "serviced_at": "2025-03-08T14:30:00+02:00",
    "service_date": "2025-03-08",
    "service_time": "14:30:00",
    "odometer_km": 145200,
    "oil_type": "5W30",
    "work_performed": "Schimb ulei si filtre motor",
    "observations": "Recomandare: verificare placute frana luna viitoare"
  }
}
```

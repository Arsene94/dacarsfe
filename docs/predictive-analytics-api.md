# Predictive Analytics API

Endpoints under `/api/analytics/predictive` provide AI-assisted demand forecasts and fleet strategy recommendations generated from the latest 12 months of booking and cashflow activity. Responses are produced in Romanian via OpenAI's `gpt-4o-mini` model and require `OPENAI_API_KEY` to be configured in the environment.

## Endpoints

### `GET /api/analytics/predictive/forecast`

Returns the predicted demand per car category for the upcoming month.

**Response example**

```json
[
  { "month": "2025-11", "category": "SUV", "predicted_demand": 42 },
  { "month": "2025-11", "category": "Compact", "predicted_demand": 68 }
]
```

### `GET /api/analytics/predictive/recommendations`

Returns fleet recommendations with lists of models to acquire or retire based on utilization and ROI trends.

**Response example**

```json
{
  "buy": ["Dacia Logan 2024", "Volkswagen Golf 2022"],
  "sell": ["Renault Clio 2016"]
}
```

## Dataset summarised in the prompt

The predictive engine compiles, for each month and category in the last 12 months:

- reservation count
- total revenue and car-specific expenses (via `dacars_car_cashflows`, filtrate pe `expense_type = car`)
- utilization rate (rented days vs. available days)
- ROI calculated from acquisition costs and net margin

This summary is embedded into the OpenAI prompt so that the generated output reflects both booking performance and cost structure.


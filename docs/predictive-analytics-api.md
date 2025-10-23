# Predictive Analytics API

Endpoints under `/api/analytics/predictive` provide AI-assisted demand forecasts and fleet strategy recommendations generated from the latest 12 months of booking and cashflow activity. Responses are produced în limba română via OpenAI's `gpt-4o-mini` model și necesită configurarea variabilei `OPENAI_API_KEY` în mediu.

## Endpoints

### `GET /api/analytics/predictive/forecast`

Returnează cererea estimată per categorie pentru luna următoare.

**Response example**

```json
[
  { "month": "2025-11", "category": "SUV", "predicted_demand": 42 },
  { "month": "2025-11", "category": "Compact", "predicted_demand": 68 }
]
```

### `GET /api/analytics/predictive/recommendations`

Returnează recomandările pentru flotă cu liste de modele ce ar trebui achiziționate sau scoase din exploatare pe baza utilizării și a ROI-ului.

**Response example**

```json
{
  "buy": ["Dacia Logan 2024", "Volkswagen Golf 2022"],
  "sell": ["Renault Clio 2016"]
}
```

## Dataset sintetizat în prompt

Motorul predictiv compilează, pentru fiecare lună și categorie din ultimele 12 luni:

- numărul de rezervări
- veniturile și cheltuielile totale (via `dacars_car_cashflows`)
- rata de utilizare (zile închiriate vs. zile disponibile)
- ROI calculat din costurile de achiziție și marja netă

Acest rezumat este integrat în promptul trimis către OpenAI pentru ca rezultatul generat să reflecte atât performanța rezervărilor, cât și structura de costuri.

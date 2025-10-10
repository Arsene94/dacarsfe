# FAQ Categories & FAQs API

These endpoints expose the knowledge base used on the marketing site and booking flow. Public GET routes serve translated FAQs, while admin endpoints manage the catalogue and trigger automatic translations for every configured language.

Use the optional trailing `/{lang}` segment on the public `index`/`show` routes to return content in a specific language (e.g. `/api/faqs/en`). When omitted, the API falls back to the source language configured in `dacars.translation_source_language`.

## FAQ categories (`/api/faq-categories`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/faq-categories` | Paginated list. Supports `status`, `order`, `name_like`, `?limit=10` for non-paginated lists, and `?include=faqs` to embed FAQs. | Public | – |
| GET `/api/faq-categories/{id}` | Retrieve a category. `?include=faqs` is available on the detail view as well. | Public | – |
| POST `/api/faq-categories` | Create a category. | Admin | `faq_categories.create` |
| PUT/PATCH `/api/faq-categories/{id}` | Update a category. | Admin | `faq_categories.update` |
| DELETE `/api/faq-categories/{id}` | Delete a category. | Admin | `faq_categories.delete` |
| GET `/api/faq-categories/{id}/translations` | List stored translations. | Admin | `faq_categories.view_translations` |
| PUT `/api/faq-categories/{id}/translations/{lang}` | Upsert translation payload (`name`). | Admin | `faq_categories.update_translations` |
| DELETE `/api/faq-categories/{id}/translations/{lang}` | Remove a translation row. | Admin | `faq_categories.delete_translations` |

### Fields
- `name` (required) – string max 120.
- `description` – optional string max 400.
- `order` – optional integer 0-255.
- `status` – `published`, `pending`, `unavailable`.

### Example create request
```json
{
  "name": "Închirieri pe termen lung",
  "description": "Întrebări frecvente despre abonamentele corporate.",
  "order": 3,
  "status": "published"
}
```

### Example response
```json
{
  "data": {
    "id": 4,
    "name": "Închirieri pe termen lung",
    "description": "Întrebări frecvente despre abonamentele corporate.",
    "order": 3,
    "status": "published",
    "created_at": "2025-09-07T12:00:00+02:00",
    "updated_at": "2025-09-07T12:00:00+02:00",
    "translations": []
  }
}
```

When `?include=faqs` is used, each embedded FAQ honours the same translation handling as the standalone FAQ endpoints. Automatic translations are generated for all languages in `dacars.translation_languages` whenever a category is saved.

---

## FAQs (`/api/faqs`)
| Method | Description | Auth | Permission |
| --- | --- | --- | --- |
| GET `/api/faqs` | Paginated list of FAQs. Filters: `status`, `category_id`, `question_like`. Supports `?limit=` for non-paginated lists. | Public | – |
| GET `/api/faqs/{id}` | Retrieve a FAQ entry. | Public | – |
| POST `/api/faqs` | Create a FAQ entry. | Admin | `faqs.create` |
| PUT/PATCH `/api/faqs/{id}` | Update a FAQ entry. | Admin | `faqs.update` |
| DELETE `/api/faqs/{id}` | Delete a FAQ entry. | Admin | `faqs.delete` |
| GET `/api/faqs/{id}/translations` | List stored translations (`question`, `answer`). | Admin | `faqs.view_translations` |
| PUT `/api/faqs/{id}/translations/{lang}` | Upsert translation payload. | Admin | `faqs.update_translations` |
| DELETE `/api/faqs/{id}/translations/{lang}` | Remove a translation row. | Admin | `faqs.delete_translations` |
| POST `/api/faqs/translate/batch` | Queue automatic translations for all FAQs and categories. | Admin | `faqs.translate` |
| GET `/api/faqs/translate/batch/{job}` | Check the status of a queued translation job. | Admin | `faqs.translate` |

### Fields
- `question` (required) – text.
- `answer` (required) – text.
- `category_id` (required) – references `dacars_faq_categories.id`.
- `status` – `published`, `pending`, `unavailable`.

### Example create request
```json
{
  "question": "Cum funcționează depozitul de garanție?",
  "answer": "Blocăm suma pe card la preluare și o deblocăm la predare dacă nu există daune.",
  "category_id": 4,
  "status": "published"
}
```

### Example response
```json
{
  "data": {
    "id": 12,
    "category_id": 4,
    "question": "Cum funcționează depozitul de garanție?",
    "answer": "Blocăm suma pe card la preluare și o deblocăm la predare dacă nu există daune.",
    "status": "published",
    "created_at": "2025-09-07T12:05:00+02:00",
    "updated_at": "2025-09-07T12:05:00+02:00",
    "category": {
      "id": 4,
      "name": "Închirieri pe termen lung"
    }
  }
}
```

When a FAQ is saved, the translation pipeline populates or refreshes entries in `dacars_faqs_translations` for all target languages. Front-end clients can request a specific language via `/api/faqs/{lang}` or `/api/faqs/{id}/{lang}` and may combine it with `?include=category` to embed the related category (with its translations). Use the batch endpoint to retroactively translate existing FAQs and categories; the status payload reports processed counts per entity and the languages targeted.

### Validation errors
Errors follow the standard Laravel JSON structure:
```json
{
  "message": "The question field is required.",
  "errors": {
    "question": [
      "The question field is required."
    ]
  }
}
```

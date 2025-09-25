# Fleet Taxonomy API

Reference endpoints for the supporting taxonomies used throughout the fleet: makes, types, transmissions, fuels, categories, and colours. Public GET routes expose read-only data for customer apps, while admin write routes require Sanctum authentication and the permissions shown below.

Shared conventions:
- Lists accept `per_page`, `page`, `limit`, and optional search filters (see entity tables below).
- Translations are stored in legacy `*_translations` tables using `lang_code` and are managed through helper endpoints.

---

## Car makes
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-makes` | List makes (`NamedResource`). Supports `name_like`, `status`. | Public |
| GET | `/api/car-makes/{id}/{lang?}` | Retrieve a make. | Public |
| POST | `/api/car-makes` | Create a make. | `car_makes.create` |
| PUT/PATCH | `/api/car-makes/{id}` | Update a make. | `car_makes.update` |
| DELETE | `/api/car-makes/{id}` | Delete a make. | `car_makes.delete` |
| GET | `/api/car-makes/{id}/translations` | List translations. | `car_makes.view_translations` |
| PUT | `/api/car-makes/{id}/translations/{lang}` | Upsert translation (`name`). | `car_makes.update_translations` |
| DELETE | `/api/car-makes/{id}/translations/{lang}` | Remove translation. | `car_makes.delete_translations` |

### Example payloads
```json
{
  "name": "Tesla",
  "status": "published",
  "logo": "logos/tesla.svg"
}
```

Translation response:
```json
{
  "lang_code": "en",
  "dacars_car_makes_id": 7,
  "name": "Tesla"
}
```

---

## Car types
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-types/{lang?}` | List types; filter `name_like`, `status`. | Public |
| GET | `/api/car-types/{id}/{lang?}` | Retrieve a type. | Public |
| POST | `/api/car-types` | Create. | `car_types.create` |
| PUT/PATCH | `/api/car-types/{id}` | Update. | `car_types.update` |
| DELETE | `/api/car-types/{id}` | Delete. | `car_types.delete` |
| GET | `/api/car-types/{id}/translations` | List translations (`name`). | `car_types.view_translations` |
| PUT | `/api/car-types/{id}/translations/{lang}` | Upsert translation. | `car_types.update_translations` |
| DELETE | `/api/car-types/{id}/translations/{lang}` | Delete translation. | `car_types.delete_translations` |

---

## Car transmissions
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-transmissions/{lang?}` | List transmissions; filter `name_like`, `status`. | Public |
| GET | `/api/car-transmissions/{id}/{lang?}` | Retrieve a transmission. | Public |
| POST | `/api/car-transmissions` | Create. | `car_transmissions.create` |
| PUT/PATCH | `/api/car-transmissions/{id}` | Update. | `car_transmissions.update` |
| DELETE | `/api/car-transmissions/{id}` | Delete. | `car_transmissions.delete` |
| GET | `/api/car-transmissions/{id}/translations` | List translations (`name`). | `car_transmissions.view_translations` |
| PUT | `/api/car-transmissions/{id}/translations/{lang}` | Upsert translation. | `car_transmissions.update_translations` |
| DELETE | `/api/car-transmissions/{id}/translations/{lang}` | Delete translation. | `car_transmissions.delete_translations` |

Example request:
```json
{
  "name": "Automată",
  "icon": "icons/automatic.svg",
  "status": "published"
}
```

---

## Car fuels
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-fuels/{lang?}` | List fuels; filter `name_like`, `status`. | Public |
| GET | `/api/car-fuels/{id}/{lang?}` | Retrieve a fuel. | Public |
| POST | `/api/car-fuels` | Create. | `car_fuels.create` |
| PUT/PATCH | `/api/car-fuels/{id}` | Update. | `car_fuels.update` |
| DELETE | `/api/car-fuels/{id}` | Delete. | `car_fuels.delete` |
| GET | `/api/car-fuels/{id}/translations` | List translations (`name`). | `car_fuels.view_translations` |
| PUT | `/api/car-fuels/{id}/translations/{lang}` | Upsert translation. | `car_fuels.update_translations` |
| DELETE | `/api/car-fuels/{id}/translations/{lang}` | Delete translation. | `car_fuels.delete_translations` |

---

## Car categories
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-categories/{lang?}` | List categories (`CategoryResource`). Filters: `status`, `name_like`, `parent_id`. | Public |
| GET | `/api/car-categories/{id}/{lang?}` | Retrieve a category. | Public |
| POST | `/api/car-categories` | Create category. | `car_categories.create` |
| PUT/PATCH | `/api/car-categories/{id}` | Update. | `car_categories.update` |
| DELETE | `/api/car-categories/{id}` | Delete. | `car_categories.delete` |
| GET | `/api/car-categories/{id}/translations` | List translations (`name`, `description`, `content`). | `car_categories.view_translations` |
| PUT | `/api/car-categories/{id}/translations/{lang}` | Upsert translation. | `car_categories.update_translations` |
| DELETE | `/api/car-categories/{id}/translations/{lang}` | Delete translation. | `car_categories.delete_translations` |

### Example create body
```json
{
  "name": "Family",
  "description": "Mașini potrivite pentru vacanțe cu copiii.",
  "parent_id": null,
  "status": "published",
  "icon": "icons/family.svg",
  "order": 1,
  "is_featured": 1,
  "is_default": 0
}
```

Translation example:
```json
{
  "lang_code": "en",
  "dacars_car_categories_id": 5,
  "name": "Family",
  "description": "Family-friendly cars",
  "content": null
}
```

---

## Car colours
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/car-colors/{lang?}` | List colours (`name_like`, `status`). | Public |
| GET | `/api/car-colors/{id}/{lang?}` | Retrieve a colour. | Public |
| POST | `/api/car-colors` | Create colour. | `car_colors.create` |
| PUT/PATCH | `/api/car-colors/{id}` | Update colour. | `car_colors.update` |
| DELETE | `/api/car-colors/{id}` | Delete colour. | `car_colors.delete` |
| GET | `/api/car-colors/{id}/translations` | List translations (`name`). | `car_colors.view_translations` |
| PUT | `/api/car-colors/{id}/translations/{lang}` | Upsert translation. | `car_colors.update_translations` |
| DELETE | `/api/car-colors/{id}/translations/{lang}` | Delete translation. | `car_colors.delete_translations` |

### Example payload
```json
{
  "name": "Albastru Midnight",
  "status": "published"
}
```

Translation response:
```json
{
  "lang_code": "en",
  "dacars_car_colors_id": 9,
  "name": "Midnight Blue"
}
```

---

## Error handling
All create/update routes return standard Laravel validation errors. Example duplicate name error when creating a make:

```json
{
  "message": "The name has already been taken.",
  "errors": {
    "name": ["The name has already been taken."]
  }
}
```

Unknown IDs respond with HTTP 404.

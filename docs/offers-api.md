# Offers API

Gestionarea ofertelor promoționale din platforma DaCars. Endpoint-urile suportă atât listarea publică pentru landing, cât și operațiunile de administrare (create/update/delete). Toate rutele care modifică date necesită token Sanctum și permisiuni dedicate.

## Endpoint overview
| Method | URL | Description | Permission |
| --- | --- | --- | --- |
| GET | `/api/offers` | Listează ofertele curente. Acceptă filtre pentru status, limită și context (`audience`). | `offers.view` (privat) / public |
| GET | `/api/offers/{id}` | Returnează o ofertă după ID. | `offers.view` |
| POST | `/api/offers` | Creează o ofertă nouă. | `offers.create` |
| PUT | `/api/offers/{id}` | Actualizează o ofertă existentă. | `offers.update` |
| DELETE | `/api/offers/{id}` | Șterge oferta. | `offers.delete` |

### Parametri comuni pentru `GET /api/offers`
- `status` – filtrează după status: `draft`, `scheduled`, `published`, `archived`.
- `audience` – `public` pentru listă destinată site-ului (fără drafturi), `admin` pentru consola internă.
- `limit` / `per_page` – numărul de înregistrări returnate.
- `include` – liste separate prin virgulă pentru relații suplimentare (`translations`, `author`, etc.).
- `search` – text liber pentru titlu/descriere.

### Răspuns listă (exemplu `audience=public&status=published`)
```json
{
  "data": [
    {
      "id": 12,
      "title": "Weekend fără garanție",
      "slug": "weekend-fara-garantie",
      "description": "Ridici mașina vineri și o returnezi luni fără depozit.",
      "discount_label": "-20% față de tariful standard",
      "benefits": [
        "20% reducere față de tariful standard",
        "Șofer adițional inclus"
      ],
      "features": [
        "Ridicare flexibilă în weekend",
        "Asistență rutieră 24/7"
      ],
      "icon": "heart",
      "background_class": "bg-gradient-to-br from-jade to-emerald-600",
      "text_class": "text-white",
      "primary_cta_label": "Rezervă oferta",
      "primary_cta_url": "/checkout",
      "status": "published",
      "starts_at": "2025-06-01T00:00:00+03:00",
      "ends_at": "2025-09-01T23:59:59+03:00",
      "created_at": "2025-05-10T09:32:00+03:00",
      "updated_at": "2025-05-12T16:15:00+03:00"
    }
  ]
}
```

---

## POST `/api/offers`
Creează o ofertă. Câmpurile sunt opționale, exceptând `title`.

### Request
```json
{
  "title": "Early booking -15%",
  "slug": "early-booking",
  "description": "Rezervări confirmate cu minim 30 de zile înainte primesc reducere.",
  "discount_label": "Economisești 15%",
  "benefits": [
    "15% reducere pentru rezervări anticipate",
    "1 zi gratuită pentru perioade de minim 5 zile"
  ],
  "features": [
    "Preluare din aeroport inclusă",
    "Asigurare completă cadou"
  ],
  "icon": "calendar",
  "background_class": "bg-berkeley",
  "text_class": "text-white",
  "primary_cta_label": "Rezervă acum",
  "primary_cta_url": "/checkout",
  "status": "scheduled",
  "starts_at": "2025-07-01T00:00:00+03:00",
  "ends_at": "2025-08-31T23:59:59+03:00"
}
```

### Response (201)
```json
{
  "data": {
    "id": 18,
    "title": "Early booking -15%",
    "status": "scheduled",
    "starts_at": "2025-07-01T00:00:00+03:00",
    "ends_at": "2025-08-31T23:59:59+03:00",
    "created_at": "2025-05-18T11:22:00+03:00",
    "updated_at": "2025-05-18T11:22:00+03:00"
  }
}
```

---

## PUT `/api/offers/{id}`
Actualizează parțial oferta. Toate câmpurile devin `sometimes` la nivel de validare.

### Request
```json
{
  "description": "Rezervările confirmate cu minim 21 de zile primesc în continuare reducere.",
  "status": "published",
  "primary_cta_label": "Profită de reducere",
  "benefits": [
    "Reducere 15% aplicată automat",
    "Garanție eliminată pe perioada promoției"
  ]
}
```

### Response
```json
{
  "data": {
    "id": 18,
    "title": "Early booking -15%",
    "status": "published",
    "benefits": [
      "Reducere 15% aplicată automat",
      "Garanție eliminată pe perioada promoției"
    ],
    "features": [
      "Suport dedicat pentru clienți corporate"
    ],
    "updated_at": "2025-05-20T09:05:00+03:00"
  }
}
```

---

## DELETE `/api/offers/{id}`
Returnează `{ "deleted": true }` la succes. Pentru interfața publică folosiți `status` în locul ștergerii pentru a arhiva ofertele expirate.

### Structura câmpului `benefits`

`benefits` este acum o listă simplă de string-uri (maxim 255 caractere recomandat) care descriu avantajele comunicate clienților.
Valorile sunt afișate ca atare în interfață, în ordinea în care sunt trimise. Backend-ul poate interpreta fiecare intrare pentru a
declanșa logica necesară (ex. `"Reducere 15%"`, `"Șofer adițional inclus"`).

> **Notă:** Pentru compatibilitate, câmpul `features` poate fi transmis în continuare. Dacă `benefits` lipsește, UI-ul public folosește
lista din `features`.

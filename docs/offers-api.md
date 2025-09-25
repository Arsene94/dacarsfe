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
        {
          "type": "percentage_discount",
          "value": "20%"
        },
        {
          "type": "extra_driver"
        }
      ],
      "features": [
        "20% Reducere procentuală",
        "Șofer adițional inclus"
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
    {
      "type": "percentage_discount",
      "value": "15%"
    },
    {
      "type": "free_days",
      "value": "1"
    }
  ],
  "features": [
    "15% Reducere procentuală",
    "1 Zile gratuite"
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
    {
      "type": "percentage_discount",
      "value": "15%"
    },
    {
      "type": "deposit_waiver",
      "value": "0 lei"
    }
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
      {
        "type": "percentage_discount",
        "value": "15%"
      },
      {
        "type": "deposit_waiver",
        "value": "0 lei"
      }
    ],
    "features": [
      "15% Reducere procentuală",
      "0 lei Garanție eliminată"
    ],
    "updated_at": "2025-05-20T09:05:00+03:00"
  }
}
```

---

## DELETE `/api/offers/{id}`
Returnează `{ "deleted": true }` la succes. Pentru interfața publică folosiți `status` în locul ștergerii pentru a arhiva ofertele expirate.

### Structura câmpului `benefits`

`benefits` este o listă de obiecte care descriu avantajele comunicate clientului și logica de calcul din backend. Fiecare element acceptă:

- `type` *(obligatoriu)* – identificatorul beneficiului, conform tabelului de mai jos.
- `value` *(opțional)* – valoarea folosită în calcule sau textul afișat. Pentru tipurile marcate ca obligatorii, completați acest câmp.

Pe interfața publică titlul rezultat concatenează valoarea (dacă există) cu eticheta beneficiului, ex. `{ "type": "percentage_discount", "value": "20%" }` → `20% Reducere procentuală`.

| Tip (`type`) | Când se folosește | Implementare backend recomandată | Calcul / logică |
| --- | --- | --- | --- |
| `percentage_discount` | Promoții procentuale (ex. Early booking -15%). | Aplică un procent din tariful de bază înainte de alte reduceri. | `preț_final = preț_bază - (preț_bază * procent / 100)`; procentul provine din `value` (poate include simbolul `%`). |
| `fixed_discount` | Reduceri cu sumă fixă. | Scade suma din total și plafonează minimul la 0. | `preț_final = max(preț_bază - valoare_fixă, 0)`; `value` este suma (ex. „150 lei”). |
| `free_days` | Campanii „x zile gratuite”. | Marchează zilele gratuite cu preț 0 și redistribuie reducerea pe restul perioadei. | `discount_total = număr_zile_gratuite * tarif_zilnic_mediu`; `value` reprezintă numărul de zile. |
| `deposit_waiver` | Eliminarea sau reducerea garanției. | Setează depozitul la 0 sau la valoarea specificată în `value`. | Dacă `value` este prezent, folosește acea sumă; altfel depozit 0. |
| `extra_driver` | Șofer adițional inclus. | Marchează serviciul „driver extra” ca gratuit în rezervare. | Fără calcul suplimentar; `value` este opțional. |
| `airport_transfer` | Transfer aeroport–hotel inclus. | Include serviciul de transfer în ofertă cu tarif 0. | Nu necesită `value`; afișarea este mesaj static. |
| `custom` | Mesaje personalizate (ex. „Asigurare completă cadou”). | Folosește `value` ca text informativ, fără calcul automat. | `value` este obligatoriu și se afișează ca atare. |

> **Notă:** Pentru compatibilitate, câmpul `features` poate fi transmis în continuare. Dacă `benefits` lipsește, sistemul derivă automat lista de features din beneficiile salvate.

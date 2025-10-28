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
- `show_on_site` – boolean; implicit doar ofertele vizibile pe site sunt returnate pentru public.
- `audience` – `public` pentru listă destinată site-ului (fără drafturi), `admin` pentru consola internă.
- `limit` / `per_page` – numărul de înregistrări returnate.
- `include` – liste separate prin virgulă pentru relații suplimentare (`translations`, `author`, etc.).
- `search` – text liber pentru titlu/descriere.

> **Vizibilitate** – Cererile publice (`audience` omis sau `public`) returnează exclusiv ofertele cu `status` public și `show_on_site = true`. Editorii autentificați pot folosi `audience=admin` sau rutele `/api/admin/offers*` pentru a gestiona ofertele ascunse care sunt atașate articolelor de blog, dar nu apar în pagina publică de promoții.

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
      "offer_type": "percentage_discount",
      "offer_value": "20",
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
      "show_on_site": true,
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
  "offer_type": "percentage_discount",
  "offer_value": "15",
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
  "show_on_site": true,
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
    "show_on_site": true,
    "starts_at": "2025-07-01T00:00:00+03:00",
    "ends_at": "2025-08-31T23:59:59+03:00",
    "created_at": "2025-05-18T11:22:00+03:00",
    "updated_at": "2025-05-18T11:22:00+03:00"
  }
}
```

### Câmpuri dedicate tipului de ofertă

- `offer_type` – codul promoției, stabilit din lista de mai jos. Determină logica backend care se aplică asupra rezervării.
- `offer_value` – valoare asociată tipului. Pentru reduceri procentuale folosiți un număr fără semn (`20` înseamnă 20%). Pentru
  sume fixe includeți moneda (`50 lei`). Pentru tipurile fără valoare o puteți omite.

Badge-ul afișat în UI poate fi transmis manual (`discount_label`), însă adminul îl autocompletează din `offer_type` +
`offer_value` dacă textul lipsește.

### Tipuri de ofertă suportate

| Cod (`offer_type`) | Ce afișăm în admin | Implementare backend | Calcul recomandat | Exemplu badge (cu `offer_value`) |
| --- | --- | --- | --- | --- |
| `percentage_discount` | Reducere procentuală | aplicați procentul asupra tarifului de bază înainte de taxe/extra servicii. | `total_final = total_initial * (1 - value/100)` (valorile procentuale sunt transmise fără semn). | `offer_value = "20"` → `-20% reducere` |
| `fixed_discount` | Reducere valorică | scădeți o sumă fixă din totalul rezervării (convertiți în moneda comenzii). | extrageți componenta numerică din `offer_value` și scădeți-o din total; nu coborâți sub 0. | `offer_value = "50 lei"` → `-50 lei reducere` |
| `free_day_bonus` | Zile gratuite | oferiți zile suplimentare fără cost (ex: 1 zi cadou la minim 3 plătite). | `days_plătite = max(0, days_totale - value)` și recalculați totalul pe baza noilor zile facturate. | `offer_value = "1 zi"` → `+1 zi gratuite` |
| `free_service_upgrade` | Upgrade gratuit | includeți un serviciu premium (asigurare, scaun copil, upgrade categorie) la cost zero. | marcați serviciul ca inclus în comandă și setați valoarea lui la 0; puteți identifica serviciul din `offer_value`. | `offer_value = "Asigurare completă"` → `Asigurare completă gratuit` |
| `deposit_waiver` | Fără depozit | eliminați blocarea garanției/depozitului standard. | setați depozitul rezervării la 0 și nu solicitați autorizare pe card. | (fără valoare) → `Fără depozit` |

> **Notă UI:** pentru `free_service_upgrade` cardurile publice afișează automat mesajul „Upgrade-ul gratuit este disponibil în limita stocului și se confirmă telefonic după trimiterea cererii de rezervare.” pentru a seta așteptările clienților.

---

## Aplicarea ofertelor în checkout

- Un client selectează explicit o ofertă din homepage sau din pagina dedicată `/offers` apăsând butonul cardului.
- În acel moment frontend-ul salvează oferta în contextul de rezervare (`BookingContext`) și o trimite către checkout.
- Ofertele nu se aplică implicit: dacă utilizatorul ajunge în checkout fără să apese pe un card promoțional, câmpul nu este trimis.

La trimiterea formularului frontend-ul include un câmp opțional `applied_offers` în payload-ul către `POST /bookings`:

```jsonc
{
  "customer_name": "Ion Popescu",
  "customer_email": "ion@example.com",
  "customer_phone": "+40 723 817 551",
  "rental_start_date": "2025-08-10",
  "rental_end_date": "2025-08-15",
  "car_id": 42,
  "applied_offers": [
    {
      "id": 12,
      "title": "Weekend fără garanție",
      "offer_type": "percentage_discount",
      "offer_value": "20",
      "discount_label": "-20% reducere"
    },
    {
      "id": 18,
      "title": "Upgrade SUV gratuit",
      "offer_type": "free_service_upgrade",
      "offer_value": "SUV Premium",
      "discount_label": "Upgrade gratuit"
    }
  ]
}
```

Backend-ul poate utiliza această listă pentru a aplica logica descrisă în tabelul de mai sus (inclusiv cumularea ofertelor acolo unde este permisă). Dacă lista este goală, cheia lipsește din request.

Rezultatele `POST /api/bookings/quote` și `POST /api/bookings` includ câmpurile `applied_offers`, `offers_discount` și `deposit_waived` pentru a confirma promoțiile acceptate, totalul reducerilor aplicate și faptul că depozitul a fost eliminat atunci când o ofertă de tip `deposit_waiver` este validă.

---

## PUT `/api/offers/{id}`
Actualizează parțial oferta. Toate câmpurile devin `sometimes` la nivel de validare.

### Request
```json
{
  "description": "Rezervările confirmate cu minim 21 de zile primesc în continuare reducere.",
  "status": "published",
  "primary_cta_label": "Profită de reducere",
  "offer_type": "deposit_waiver",
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
declanșa logica necesară (ex. "Reducere 15%", "Șofer adițional inclus").

Pentru aplicarea automată a promoției folosiți combinația `offer_type` + `offer_value`, conform tabelului de mai sus.

> **Notă:** Pentru compatibilitate, câmpul `features` poate fi transmis în continuare. Dacă `benefits` lipsește, UI-ul public folosește
lista din `features`.

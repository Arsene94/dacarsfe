# Activity Logs API

Sistemul de loguri urmărește orice modificare a datelor din backend și oferă un istoric auditabil pentru toate modulele admin. Fiecare eveniment de tip create/update/delete pentru modelele Eloquent este capturat automat de serviciul `ActivityLogger`, iar datele sunt păstrate cu context (atribute, schimbări, utilizator, IP, user-agent).

- **Tabel:** `activity_logs`
- **Model:** `App\Models\ActivityLog`
- **Serviciu:** `App\Services\ActivityLogger`
- **Rutare:** `/api/activity-logs`

> Logurile pot fi șterse **doar** de utilizatorul cu ID `1`. Toate celelalte roluri pot consulta istoricul (dacă au permisiunea `activity_logs.view`) dar nu pot șterge.

## Endpoint overview
| Method | URL | Descriere | Auth | Permisiune |
| --- | --- | --- | --- | --- |
| GET | `/api/activity-logs` | Listează logurile cu căutare full-text și filtre. | Bearer token | `activity_logs.view` |
| POST | `/api/activity-logs` | Creează un log manual (pentru sisteme externe). | Bearer token | `activity_logs.create` |
| DELETE | `/api/activity-logs/{id}` | Șterge un log existent (doar user ID 1). | Bearer token | `activity_logs.delete` + user ID 1 |

### Parametri comuni (GET `/api/activity-logs`)
- `search` – caută în mesaj, acțiune, nume/email utilizator, entitate.
- `user_id` – filtrează după autor.
- `action` – filtrează după acțiune (`car.created`, `booking.updated`, etc.). Acceptă prefixe (`action=booking` => `booking.*`).
- `from` / `to` – interval de date (inclusiv), se aplică pe `created_at`.
- `per_page` – 1-100, implicit 25.
- `sort` – `latest` (implicit) sau `oldest`.

### Structura payloadului automat
Un log generat automat arată astfel:
```json
{
  "id": 4821,
  "action": "booking.updated",
  "message": "Booking a fost actualizat (BK-24091)",
  "user": {
    "id": 7,
    "name": "Ana Ionescu",
    "email": "ana.ionescu@dacars.ro"
  },
  "subject": {
    "type": "App\\Models\\Booking",
    "id": "24091",
    "label": "BK-24091"
  },
  "context": {
    "changes": {
      "status": "confirmed",
      "total_price": 1899
    },
    "original": {
      "status": "pending",
      "total_price": 1799
    }
  },
  "ip_address": "10.0.12.4",
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0)"
}
```

---

## GET `/api/activity-logs`
Listează logurile cu filtre și paginare. Rezultatul este sortat descrescător după `created_at` în mod implicit.

### Exemplu request
```
GET /api/activity-logs?search=booking&user_id=7&from=2025-05-01&to=2025-05-31&per_page=10
Authorization: Bearer <token>
```

### Exemplu răspuns (200)
```json
{
  "data": [
    {
      "id": 4821,
      "action": "booking.updated",
      "message": "Booking a fost actualizat (BK-24091)",
      "user": {
        "id": 7,
        "name": "Ana Ionescu",
        "email": "ana.ionescu@dacars.ro"
      },
      "subject": {
        "type": "App\\Models\\Booking",
        "id": "24091",
        "label": "BK-24091"
      },
      "context": {
        "changes": {
          "status": "confirmed",
          "total_price": 1899
        },
        "original": {
          "status": "pending",
          "total_price": 1799
        }
      },
      "ip_address": "10.0.12.4",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0)",
      "created_at": "2025-05-12T09:21:32+03:00",
      "updated_at": "2025-05-12T09:21:32+03:00"
    }
  ],
  "links": {
    "first": "https://api.dacars.ro/api/activity-logs?page=1",
    "last": "https://api.dacars.ro/api/activity-logs?page=5",
    "prev": null,
    "next": "https://api.dacars.ro/api/activity-logs?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "path": "https://api.dacars.ro/api/activity-logs",
    "per_page": 10,
    "to": 10,
    "total": 42
  }
}
```

---

## POST `/api/activity-logs`
Creează manual un log (de exemplu, dintr-un serviciu extern sau pentru evenimente non-Eloquent). Dacă `user_id` este omis, se va folosi utilizatorul autentificat.

### Request body
```json
{
  "action": "fleet.imported",
  "message": "Import automat flotă partener complet",
  "context": {
    "source": "ftp://partner.dacars.ro/fleet.csv",
    "total_records": 180
  },
  "subject_type": "integration",
  "subject_id": "partner-22",
  "subject_label": "Import partener FleetOne"
}
```

### Răspuns (201)
```json
{
  "data": {
    "id": 5980,
    "action": "fleet.imported",
    "message": "Import automat flotă partener complet",
    "user": {
      "id": 3,
      "name": "Mihai Pop",
      "email": "mihai.pop@dacars.ro"
    },
    "subject": {
      "type": "integration",
      "id": "partner-22",
      "label": "Import partener FleetOne"
    },
    "context": {
      "source": "ftp://partner.dacars.ro/fleet.csv",
      "total_records": 180
    },
    "ip_address": "10.0.15.8",
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5_0)",
    "created_at": "2025-05-15T08:02:11+03:00",
    "updated_at": "2025-05-15T08:02:11+03:00"
  }
}
```

---

## DELETE `/api/activity-logs/{id}`
Elimină un log din istoric. Răspunsul conține un simplu flag `deleted`.

### Răspuns (200)
```json
{
  "deleted": true
}
```

> Dacă un utilizator diferit de ID 1 încearcă să șteargă loguri, endpoint-ul răspunde cu `403` și mesajul "Doar utilizatorul principal poate șterge loguri.".

---

## Automatizări și bune practici
- `ActivityLogger` face sanitize automat pentru câmpuri sensibile (`password`, `token`, `secret`).
- Pentru modele ce nu folosesc `fillable`, logul va include doar atributele expuse public.
- Dacă ai acțiuni custom (de ex. importuri, joburi queue), folosește `ActivityLogger::log()` sau helperul expus prin API pentru a avea un istoric unitar.
- Recomandare: rulează un job de rotație (ex. lunar) dacă vrei să arhivezi logurile vechi într-un storage extern; API-ul curent nu șterge automat datele.

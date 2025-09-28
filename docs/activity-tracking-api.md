# Activity Tracking API

Acest document descrie contractele REST folosite de front-end pentru a gestiona activitățile operaționale (curățarea mașinilor și livrări). Toate rutele rulează sub prefixul `/api` și necesită autentificare Sanctum cu antet `Authorization: Bearer <token>`.

## Modelul `Activity`

| Câmp | Tip | Descriere |
| --- | --- | --- |
| `id` | integer | Identificator intern. |
| `car_id` | integer | ID-ul mașinii implicate în activitate. |
| `car_plate` | string | Numărul de înmatriculare, returnat pentru afișare rapidă. |
| `performed_at` | date | Data calendaristică (fără timp) la care a avut loc activitatea. |
| `type` | string | Tipul activității (vezi enum-ul de mai jos). |
| `amount` | integer | Valoarea în lei; este întotdeauna `25` pentru fiecare activitate. |
| `notes` | string\|null | Observații opționale introduse de operator. |
| `created_at` | datetime | Timpul înregistrării în sistem. |
| `updated_at` | datetime | Ultima actualizare. |

### Enum-ul `type`

| Valoare | Semnificație |
| --- | --- |
| `cleaning` | Curățarea mașinii. |
| `delivery` | Livrarea mașinii către client. |

Front-end-ul trebuie să trimită valorile în format snake-case. Backend-ul validează că activitățile se creează în intervalul `performed_at` ±90 de zile față de data curentă.

## Listarea activităților

### GET `/api/activities`

Returnează lista paginată de activități, cu posibilitatea filtrării după mașină și săptămână.

#### Parametri query

| Parametru | Tip | Implicit | Descriere |
| --- | --- | --- | --- |
| `week` | string | — | Cod ISO 8601 de tip `YYYY-Www` (ex. `2024-W05`). Limitează rezultatele la săptămâna respectivă. |
| `from` | date | — | Data de început (`YYYY-MM-DD`). Se poate folosi împreună cu `to` în locul parametrului `week`. |
| `to` | date | — | Data de final (`YYYY-MM-DD`). |
| `car_id` | integer | — | Filtrează activitățile pentru o singură mașină. |
| `type` | string | — | `cleaning` sau `delivery`. |
| `page` | integer | `1` | Numărul paginii. |
| `per_page` | integer | `15` | Dimensiunea paginii (max. `100`). |

#### Răspuns 200

```json
{
  "data": [
    {
      "id": 42,
      "car_id": 7,
      "car_plate": "B-55-DAC",
      "performed_at": "2024-02-02",
      "type": "cleaning",
      "amount": 25,
      "notes": null
    },
    {
      "id": 43,
      "car_id": 7,
      "car_plate": "B-55-DAC",
      "performed_at": "2024-02-03",
      "type": "delivery",
      "amount": 25,
      "notes": "Predare client corporate"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 37
  }
}
```

## Crearea și gestionarea activităților

### POST `/api/activities`

Creează o activitate nouă.

#### Body JSON

```json
{
  "car_id": 7,
  "performed_at": "2024-02-02",
  "type": "cleaning",
  "notes": "Spălare completă interior/exterior"
}
```

- `car_id` este obligatoriu și trebuie să existe în flota activă.
- `performed_at` trebuie să fie o dată calendaristică validă.
- `type` trebuie să fie unul dintre `cleaning` sau `delivery`.
- `notes` este opțional.

#### Răspuns 201

```json
{
  "data": {
    "id": 44,
    "car_id": 7,
    "car_plate": "B-55-DAC",
    "performed_at": "2024-02-02",
    "type": "cleaning",
    "amount": 25,
    "notes": "Spălare completă interior/exterior",
    "created_at": "2024-02-02T09:15:21Z",
    "updated_at": "2024-02-02T09:15:21Z"
  }
}
```

### GET `/api/activities/{activity}`

Returnează detaliile unei activități. Util pentru formularele de editare.

### PUT `/api/activities/{activity}`

Actualizează valorile `performed_at`, `type`, `car_id` și `notes`. Suma (`amount`) rămâne blocată la `25` lei.

### DELETE `/api/activities/{activity}`

Șterge o activitate introdusă eronat. Endpoint-ul răspunde cu `204 No Content`.

## Sumare săptămânale

### GET `/api/activities/weekly-summary`

Calculează totalul activităților pentru o săptămână și returnează valorile necesare front-end-ului.

#### Parametri query

| Parametru | Tip | Implicit | Descriere |
| --- | --- | --- | --- |
| `week` | string | — | Cod ISO 8601 `YYYY-Www`. Dacă este omis se folosește săptămâna curentă a serverului. |
| `car_id` | integer | — | Opțional: limitează calculul la o singură mașină. |

#### Răspuns 200

```json
{
  "data": {
    "week": "2024-W05",
    "start_date": "2024-01-29",
    "end_date": "2024-02-04",
    "activities_count": 18,
    "amount_per_activity": 25,
    "total_amount": 450,
    "breakdown_by_type": {
      "cleaning": {
        "count": 10,
        "amount": 250
      },
      "delivery": {
        "count": 8,
        "amount": 200
      }
    },
    "breakdown_by_day": [
      { "date": "2024-01-29", "count": 2, "amount": 50 },
      { "date": "2024-01-30", "count": 4, "amount": 100 },
      { "date": "2024-01-31", "count": 3, "amount": 75 },
      { "date": "2024-02-01", "count": 5, "amount": 125 },
      { "date": "2024-02-02", "count": 2, "amount": 50 },
      { "date": "2024-02-03", "count": 1, "amount": 25 },
      { "date": "2024-02-04", "count": 1, "amount": 25 }
    ]
  }
}
```

- `total_amount` este calculat ca `activities_count * 25`.
- `breakdown_by_type` și `breakdown_by_day` ajută la randări grafice rapide.

### POST `/api/activities/weekly-summary/dispatch`

Trimite sumarul săptămânal către un canal extern (e-mail, Slack etc.). Endpoint-ul inserează o sarcină în coadă și returnează payload-ul folosit.

#### Body JSON

```json
{
  "week": "2024-W05",
  "channel": "email",
  "recipients": ["manager@dacars.ro"],
  "include_breakdown": true
}
```

- `week` este opțional; dacă lipsește se preia săptămâna anterioară completă.
- `channel` acceptă `email`, `slack` sau `whatsapp`. Valorile suplimentare se resping cu `422 Unprocessable Entity`.
- `recipients` reprezintă lista de adrese/identificatori; este necesară pentru `email` și `whatsapp`.
- `include_breakdown` decide dacă în sumar se atașează tabelele `breakdown_by_type` și `breakdown_by_day`.

#### Răspuns 202

```json
{
  "data": {
    "week": "2024-W05",
    "channel": "email",
    "recipients": ["manager@dacars.ro"],
    "queued_job_id": "activity-summary-7f92b7a6"
  }
}
```

Front-end-ul poate afișa un mesaj de confirmare imediat și poate interoga un endpoint generic de job status dacă este nevoie.

## Reguli de business

- Fiecare activitate valorează `25` lei. Valoarea nu se poate edita din UI și nici din API.
- Nu se pot introduce mai mult de 8 activități pe zi pentru aceeași mașină; backend-ul validează și răspunde cu `422` dacă limita este depășită.
- Endpoint-urile folosesc caching pe baza parametrilor (`week`, `car_id`) și invalidează cache-ul la creare/actualizare/ștergere prin `cacheFlush(['activities'])`.
- Timpul săptămânii se calculează folosind zona `Europe/Bucharest`. Front-end-ul trebuie să afișeze dată și monedă localizate.

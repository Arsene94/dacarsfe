# Public Content API

Acest document descrie contractul dintre frontend-ul Next.js și backend-ul Laravel pentru furnizarea textelor statice afișate în zona publică (landing, flotă, checkout, succes). Sistemul permite livrarea copy-ului în mai multe limbi, editabil din consola de admin, și este consumat de `PublicContentProvider` (`@/context/PublicContentContext`).

## Flux public — obținerea copy-ului

```
GET /api/public/content
```

### Parametri query

| Parametru | Tip | Implicit | Descriere |
| --- | --- | --- | --- |
| `locale` | string | `ro` | Codul limbii cerute (ex. `ro`, `en`). |
| `fallback_locale` | string | – | Limbă alternativă folosită dacă pentru `locale` nu există conținut complet. |
| `sections` | string / listă | – | Subset de secțiuni cerute (`header,hero,benefits,home.fleet,cars,checkout,success`). Dacă lipsește se returnează întregul copy public. |
| `version` | string | – | Identificatorul versiunii locale din cache-ul frontend-ului. Dacă este identic, backend-ul poate răspunde cu 304 / payload gol. |
| `include_draft` | boolean | `false` | Forțează servirea versiunii draft (util pentru pre-vizualizare). |

### Răspuns `200 OK`

```json
{
  "locale": "ro",
  "version": "2025-02-10T09:45:12Z",
  "updated_at": "2025-02-10T09:45:12Z",
  "sections": [
    "header",
    "hero",
    "benefits",
    "home.fleet",
    "home.offers",
    "home.process",
    "home.contact",
    "cars",
    "checkout",
    "success",
    "footer"
  ],
  "content": {
    "header": {
      "brandAria": "DaCars — închirieri auto rapide și oneste",
      "navigation": {
        "items": [
          { "label": "Acasă", "href": "/" },
          { "label": "Flotă", "href": "/cars" },
          { "label": "Oferte", "href": "#oferte" },
          { "label": "Rezervare", "href": "/checkout" },
          { "label": "Contact", "href": "#contact" }
        ]
      },
      "mobile": {
        "openLabel": "Deschide meniul",
        "closeLabel": "Închide meniul"
      },
      "cta": {
        "label": "Rezervă acum",
        "ariaLabel": "Rezervă acum",
        "href": "/checkout"
      },
      "languageSwitcher": {
        "label": "Limba",
        "ariaLabel": "Schimbă limba"
      }
    },
    "hero": { "badge": "Te ținem aproape de casă", "title": "Închiriere auto București - Otopeni" },
    "benefits": { "title": "De ce să alegi <span class=\"text-jade\">DaCars</span>?" },
    "home": {
      "fleet": {
        "heading": {
          "title": "Flota noastră <span class=\"text-jade\">premium</span>",
          "description": "Mașini moderne și verificate pentru fiecare călătorie."
        },
        "carousel": {
          "regionAriaLabel": "Carousel cu mașini recomandate",
          "previousAriaLabel": "Mașina precedentă",
          "nextAriaLabel": "Mașina următoare"
        },
        "cta": { "label": "Vezi toată flota", "href": "/cars" }
      },
      "offers": {
        "title": "Oferte <span class=\"text-jadeLight\">speciale</span>",
        "cards": [
          { "title": "Pachet Nuntă", "discount": "10% reducere" },
          { "title": "Reducere Prieteni", "discount": "20% reducere" }
        ]
      },
      "process": {
        "title": "Procesul nostru <span class=\"text-jade\">simplu</span>",
        "steps": [
          { "number": "01", "title": "Rezervă online" },
          { "number": "02", "title": "Ridici la aeroport" },
          { "number": "03", "title": "Drum bun acasă" }
        ]
      },
      "contact": {
        "title": "Contactează-ne <span class=\"text-jade\">oricând</span>",
        "items": [
          { "icon": "phone", "title": "Telefon", "link": { "href": "tel:+40723817551" } },
          { "icon": "mail", "title": "Email", "link": { "href": "mailto:contact@dacars.ro" } },
          { "icon": "mapPin", "title": "Locație" }
        ]
      }
    },
    "cars": {
      "header": {
        "title": "Flota noastră <span class=\"text-jade\">completă</span>",
        "description": "Descoperă toate mașinile disponibile și alege varianta potrivită."
      },
      "search": {
        "placeholder": "Caută mașină...",
        "filtersToggle": { "label": "Filtre", "ariaLabel": "Comută filtrele" }
      },
      "filters": {
        "categoriesLabel": "Categorie",
        "allOption": "Toate",
        "clear": { "label": "Resetează filtrele" }
      },
      "results": {
        "countLabel": "mașini găsite",
        "emptyState": { "title": "Nu am găsit mașini", "description": "Încearcă să modifici filtrele." }
      },
      "cta": { "title": "Nu găsești mașina potrivită?", "primary": { "label": "Rezervă acum" } }
    },
    "footer": {
      "brand": { "title": "DaCars" },
      "navigation": { "items": [] }
    }
  }
}
```

> `content` este un obiect arbore ce urmează structura folosită de frontend. Cheile pot fi extinse; valorile necunoscute sunt ignorate. Lipsa unui câmp determină folosirea fallback-ului local din componentă.

### Răspuns gol (304 / 204)

Frontend-ul trimite `version`. Dacă backend-ul decide că versiunea nu s-a schimbat, poate răspunde cu `204 No Content` (fără body) sau `304 Not Modified` cu antet `ETag`. Furnizorul nu trebuie să trimită din nou `content`.

## Flux admin — gestionare copy

Consola admin oferă două instrumente dedicate super administratorilor:

- `/admin/public-content` — editor JSON care permite actualizarea draft-urilor, publicarea ultimelor modificări și generarea de traduceri automate între limbi.
- `/admin/public-content/export` — utilitarul de export descris mai jos, folosit pentru snapshot-uri complete și bootstrap în backend.

### `GET /api/admin/public-content/{locale}`

Returnează structura completă (inclusiv câmpuri non-publice, meta, istoricul versiunilor). Frontend-ul admin folosește răspunsul pentru a popula formularul de editare.

### `PUT /api/admin/public-content/{locale}`

Payload minim:

```json
{
  "locale": "ro",
  "version": "2025-02-10T09:45:12Z",
  "status": "draft",
  "content": {
    "hero": {
      "title": "Închirieri auto rapide în București și Otopeni"
    },
    "footer": {
      "brand": {
        "title": "DaCars România"
      }
    }
  }
}
```

- `locale` — limba editată.
- `version` — versiunea curentă cunoscută de client; backend-ul trebuie să respingă cu `409 Conflict` dacă există un draft mai nou.
- `status` — `draft` / `published` (menține compatibilitatea cu toggle-urile din admin).
- `content` — patch JSON cu secțiunile modificate. Backend-ul trebuie să fuzioneze cu structura existentă.
- `publish` — opțional (`true/false`). Dacă este `true`, backend-ul poate publica imediat draft-ul rezultat fără a apela explicit endpoint-ul de mai jos.

Răspuns: structura completă a versiunii actualizate (`PublicContentResponse`).

### `POST /api/admin/public-content/{locale}/publish`

Payload opțional:

```json
{
  "version": "2025-02-10T09:45:12Z"
}
```

Publică ultima variantă de draft. Răspunsul trebuie să includă noua versiune (`status = "published"`, `version` actualizat).

### `POST /api/admin/public-content/translate`

Endpoint folosit de pagina de gestionare pentru a cere backend-ului traduceri automate între două limbi suportate.

#### Request

```json
{
  "source_locale": "ro",
  "target_locale": "en",
  "mode": "missing",
  "sections": ["hero", "checkout.summary"]
}
```

- `source_locale` — limba sursă.
- `target_locale` — limba țintă.
- `mode` — `missing` (implicit, traduce doar câmpurile lipsă) sau `full` (suprascrie complet cu traducerea generată).
- `sections` — listă opțională de chei pentru a restrânge traducerea. Dacă lipsește, backend-ul trebuie să proceseze întregul conținut public.

#### Response `200 OK`

```json
{
  "source_locale": "ro",
  "target_locale": "en",
  "sections": ["hero", "checkout.summary"],
  "translated": 12,
  "content": {
    "hero": {
      "title": "Fast car rentals in Bucharest and Otopeni"
    }
  }
}
```

- `translated` — numărul de chei actualizate de motorul de traducere.
- `content` — structura JSON ce conține traducerile generate; frontend-ul o poate insera direct în editorul locale-ului țintă.

### Export batch din consola (super admin)

- Frontend-ul expune utilitarul `/admin/public-content/export` pentru a extrage dintr-un foc toate textele publice disponibile în contextul curent.
- Accesul este limitat la utilizatorii cu `super_user = true` (nu este suficient `manage_supers`).
- Pagina afișează rezumatul secțiunilor active și oferă acțiunile `Copiază JSON` (clipboard), `Descarcă fișier` (`dacars-public-content-<locale>.json`) și `Trimite către backend` (apel API descris mai jos).
- Structura exportată respectă schema de mai jos și poate fi folosită direct ca payload pentru `PUT /api/admin/public-content/{locale}` sau pentru popularea inițială a bazei de date.

```json
{
  "locale": "ro",
  "version": null,
  "updated_at": null,
  "sections": [
    "header",
    "hero",
    "benefits",
    "home.fleet",
    "home.offers",
    "home.process",
    "home.contact",
    "cars",
    "footer"
  ],
  "content": {
    "header": { "brandAria": "DaCars — închirieri auto rapide și oneste", "navigation": { "items": [] } },
    "hero": { "badge": "Te ținem aproape de casă", "title": "Închiriere auto București - Otopeni" },
    "benefits": { "title": "De ce să alegi <span class=\"text-jade\">DaCars</span>?" },
    "home": {
      "fleet": { "heading": { "title": "Flota noastră <span class=\"text-jade\">premium</span>" } },
      "offers": { "title": "Oferte <span class=\"text-jadeLight\">speciale</span>" },
      "process": { "title": "Procesul nostru <span class=\"text-jade\">simplu</span>" },
      "contact": { "title": "Contactează-ne <span class=\"text-jade\">oricând</span>" }
    },
    "cars": { "header": { "title": "Flota noastră <span class=\"text-jade\">completă</span>" } },
    "checkout": {
      "hero": { "title": { "lead": "Rezervă-ți", "highlight": "mașina" } },
      "form": { "personal": { "title": "Informații personale" } },
      "summary": { "title": "Rezumatul rezervării" }
    },
    "success": {
      "header": { "title": { "lead": "Rezervarea este", "highlight": "confirmată!" } },
      "details": { "title": "Detaliile rezervării tale" },
      "contact": { "title": "Contactează-ne oricând:" }
    },
    "footer": { "brand": { "title": "DaCars" } }
  }
}
```

> Valorile din exemplu au fost scurtate pentru lizibilitate; în aplicație se exportă structura completă, identică cu fallback-urile locale sau cu răspunsul backend disponibil.

### `POST /api/admin/public-content/{locale}/snapshot`

Acest endpoint primește payload-ul complet generat de pagina de export și îl stochează în backend (de ex. într-o zonă tampon folosită pentru bootstrap-ul bazei de date).

#### Request

```json
{
  "locale": "ro",
  "sections": [
    "header",
    "hero",
    "benefits",
    "home.fleet",
    "home.offers",
    "home.process",
    "home.contact",
    "cars",
    "checkout",
    "success",
    "footer"
  ],
  "content": {
    "header": { "brandAria": "DaCars — închirieri auto rapide și oneste" },
    "hero": { "title": "Închirieri auto rapide în București și Otopeni" },
    "benefits": { "title": "De ce să alegi <span class=\"text-jade\">DaCars</span>?" },
    "home": { "fleet": { "heading": { "title": "Flota noastră <span class=\"text-jade\">premium</span>" } } },
    "cars": { "header": { "title": "Flota noastră <span class=\"text-jade\">completă</span>" } },
    "checkout": { "summary": { "title": "Rezumatul rezervării" } },
    "success": { "header": { "title": { "lead": "Rezervarea este", "highlight": "confirmată!" } } },
    "footer": { "brand": { "title": "DaCars" } }
  },
  "version": null,
  "updated_at": null
}
```

- `locale` — limba payload-ului.
- `sections` — lista completă a secțiunilor incluse în `content`.
- `content` — obiectul cu toate valorile agregate.
- `version` — șir (`string`) dacă există versiune, `null` altfel.
- `updated_at` — timestamp ISO 8601 (`string`) sau `null`.

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Public content snapshot received"
}
```

Backend-ul poate returna orice mesaj informativ; frontend-ul afișează notificarea de succes dacă `success = true`.

## Integrare în frontend

- `PublicContentProvider` este inițializat în `app/layout.tsx` cu limba din cookie `dacars_locale` și fallback `ro`.
- Componentele consumă copy folosind:
  - `const { t } = usePublicContent();` pentru șiruri individuale (`t("hero.title", "Fallback")`).
  - `usePublicContentSection("benefits", FALLBACK)` pentru structuri complexe (liste, obiecte).
- La schimbarea limbii (`LanguageSwitcher`) se trimite cererea `GET /api/public/content?locale={nou}`. Dacă backend-ul răspunde cu nouă versiune, state-ul providerului este actualizat și componentele se re-randează cu textele noi.

### Persistență client

- Locale-ul curent este salvat în `localStorage` (`dacars:locale`) și cookie `dacars_locale` (1 an) pentru a fi preluat pe server.
- Ultima versiune recepționată este reținută în context și trimisă ca `version` la cererile ulterioare pentru a evita transferul inutil de date.

## Considerații backend

- Backend-ul trebuie să livreze structura completă pentru `locale`; elementele lipsă cad pe fallback-ul din frontend.
- Este recomandată validarea cheilor transmise în `content` (whitelist) pentru a preveni introducerea de noduri neașteptate.
- Pentru scalabilitate, se poate implementa un mecanism de versionare bazat pe hash (ex. `version = sha256(content)`), folosind anteturi HTTP `ETag`/`If-None-Match`.
- Admin-ul poate păstra un istoric al versiunilor pentru audit (ex. tabel `public_contents` cu `locale`, `status`, `content`, `version`, `published_at`).
- Până la implementarea rutei `GET /api/public/content`, frontend-ul folosește fallback-urile locale și afișează doar un avertisment în consolă (fără eroare). După ce backend-ul răspunde cu succes, provider-ul actualizează automat textele.

## Chei uzuale

Secțiuni deja consumate de frontend (2025-02-10): `header`, `hero`, `benefits`, `home.*`, `cars`, `checkout`, `success`, `footer`. Cheile trebuie păstrate stabile; adăugările noi se pot face sub același nod (ex. `header.navigation.secondary`).


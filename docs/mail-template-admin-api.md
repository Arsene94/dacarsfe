# Mail Branding & Template Admin API

All routes below live under the `/api` prefix and require an authenticated Sanctum token (`Authorization: Bearer <token>`). The
endpoints power the Next.js admin editor that customises branding, Twig templates, metadata, and attachments for booking emails.

## Mail branding settings

### GET `/api/mail-branding-settings`
Returns the last saved branding payload together with the resolved values that the mailer will actually use (defaults merged with
overrides).

#### Example response
```json
{
  "data": {
    "site": {
      "title": "DaCars",
      "url": "https://dacars.ro",
      "logo_path": "images/logo-308x154.webp",
      "logo_max_height": 62,
      "description": "Mașini oneste pentru români onești. Predare în aeroport în sub 5 minute, fără taxe ascunse.",
      "email": "contact@dacars.ro",
      "phone": "+40 723 817 551",
      "phone_link": "+40723817551",
      "support_phone": "+40 723 817 551",
      "support_phone_link": "+40722123456",
      "address": "Calea Bucureștilor 305, Otopeni, Ilfov",
      "availability": "Disponibil 24/7",
      "menu_items": [
        { "label": "Acasă", "url": "/" },
        { "label": "Flota auto", "url": "/cars" },
        { "label": "Oferte speciale", "url": "/offers" },
        { "label": "Rezervă acum", "url": "/form" }
      ],
      "footer_links": [
        { "label": "Termeni și condiții", "url": "/terms" },
        { "label": "Politica de confidențialitate", "url": "/privacy" }
      ],
      "social_links": [
        { "label": "Facebook", "url": "https://www.facebook.com/DaCars" },
        { "label": "Instagram", "url": "https://www.instagram.com/DaCars" }
      ]
    },
    "colors": {
      "berkeley": "#1A3661",
      "jade": "#206442",
      "jadeLight": "#38B275",
      "eefie": "#191919"
    },
    "resolved_site": {
      "title": "DaCars",
      "url": "https://dacars.ro",
      "logo_path": "images/logo-308x154.webp",
      "logo_max_height": 62,
      "description": "Mașini oneste pentru români onești. Predare în aeroport în sub 5 minute, fără taxe ascunse.",
      "email": "contact@dacars.ro",
      "phone": "+40 723 817 551",
      "phone_link": "+40723817551",
      "support_phone": "+40 723 817 551",
      "support_phone_link": "+40722123456",
      "address": "Calea Bucureștilor 305, Otopeni, Ilfov",
      "availability": "Disponibil 24/7",
      "menu_items": [
        { "label": "Acasă", "url": "/" },
        { "label": "Flota auto", "url": "/cars" },
        { "label": "Oferte speciale", "url": "/offers" },
        { "label": "Rezervă acum", "url": "/form" }
      ],
      "footer_links": [
        { "label": "Termeni și condiții", "url": "/terms" },
        { "label": "Politica de confidențialitate", "url": "/privacy" }
      ],
      "social_links": [
        { "label": "Facebook", "url": "https://www.facebook.com/DaCars" },
        { "label": "Instagram", "url": "https://www.instagram.com/DaCars" }
      ]
    },
    "resolved_colors": {
      "berkeley": "#1A3661",
      "jade": "#206442",
      "jadeLight": "#38B275",
      "eefie": "#191919"
    }
  }
}
```

Attachment entries include a `with_deposit` field (null, `true`, or `false`) describing when the file is attached.

`resolved_site` is the configuration the mailer loads after merging defaults with the saved override. URLs stay relative; the mail
layer turns them into absolute links when building the email context.

### PUT `/api/mail-branding-settings`
Updates the stored branding JSON. Omitted keys are left untouched. Array fields (`menu_items`, `footer_links`, `social_links`)
are replaced wholesale, so send the entire array when you edit a single entry. The dashboard may submit either `logo_path` or a
`logo` alias—the controller normalises the value and persists it as `logo_path`.

#### Example request body
```json
{
  "site": {
    "title": "DaCars",
    "url": "https://dacars.ro",
    "logo": "storage/logo-308x154.webp",
    "logo_max_height": 72,
    "description": "Flota premium de închirieri auto la aeroportul Otopeni.",
    "email": "contact@dacars.ro",
    "phone": "+40 723 817 551",
    "phone_link": "+40723817551",
    "support_phone": "+40 723 817 551",
    "support_phone_link": "+40722123456",
    "address": "Calea Bucureștilor 305, Otopeni, Ilfov",
    "availability": "Disponibil 24/7",
    "menu_items": [
      { "label": "Acasă", "url": "/" },
      { "label": "Flota auto", "url": "/cars" },
      { "label": "Oferte speciale", "url": "/offers" },
      { "label": "Rezervă acum", "url": "/form" }
    ],
    "footer_links": [
      { "label": "Termeni și condiții", "url": "/terms" },
      { "label": "Politica de confidențialitate", "url": "/privacy" }
    ],
    "social_links": [
      { "label": "Facebook", "url": "https://www.facebook.com/DaCars" },
      { "label": "Instagram", "url": "https://www.instagram.com/DaCars" }
    ]
  },
  "colors": {
    "berkeley": "#1A3661",
    "jade": "#206442",
    "jadeLight": "#38B275",
    "eefie": "#191919"
  }
}
```

#### Example success response
```json
{
  "data": {
    "site": {
      "title": "DaCars",
      "url": "https://dacars.ro",
      "logo_path": "storage/logo-308x154.webp",
      "logo_max_height": 72,
      "description": "Flota premium de închirieri auto la aeroportul Otopeni.",
      "email": "contact@dacars.ro",
      "phone": "+40 723 817 551",
      "phone_link": "+40723817551",
      "support_phone": "+40 723 817 551",
      "support_phone_link": "+40722123456",
      "address": "Calea Bucureștilor 305, Otopeni, Ilfov",
      "availability": "Disponibil 24/7",
      "menu_items": [
        { "label": "Acasă", "url": "/" },
        { "label": "Flota auto", "url": "/cars" },
        { "label": "Oferte speciale", "url": "/offers" },
        { "label": "Rezervă acum", "url": "/form" }
      ],
      "footer_links": [
        { "label": "Termeni și condiții", "url": "/terms" },
        { "label": "Politica de confidențialitate", "url": "/privacy" }
      ],
      "social_links": [
        { "label": "Facebook", "url": "https://www.facebook.com/DaCars" },
        { "label": "Instagram", "url": "https://www.instagram.com/DaCars" }
      ]
    },
    "colors": {
      "berkeley": "#1A3661",
      "jade": "#206442",
      "jadeLight": "#38B275",
      "eefie": "#191919"
    },
    "resolved_site": {
      "title": "DaCars",
      "url": "https://dacars.ro",
      "logo_path": "storage/logo-308x154.webp",
      "logo_max_height": 72,
      "description": "Flota premium de închirieri auto la aeroportul Otopeni.",
      "email": "contact@dacars.ro",
      "phone": "+40 723 817 551",
      "phone_link": "+40723817551",
      "support_phone": "+40 723 817 551",
      "support_phone_link": "+40722123456",
      "address": "Calea Bucureștilor 305, Otopeni, Ilfov",
      "availability": "Disponibil 24/7",
      "menu_items": [
        { "label": "Acasă", "url": "/" },
        { "label": "Flota auto", "url": "/cars" },
        { "label": "Oferte speciale", "url": "/offers" },
        { "label": "Rezervă acum", "url": "/form" }
      ],
      "footer_links": [
        { "label": "Termeni și condiții", "url": "/terms" },
        { "label": "Politica de confidențialitate", "url": "/privacy" }
      ],
      "social_links": [
        { "label": "Facebook", "url": "https://www.facebook.com/DaCars" },
        { "label": "Instagram", "url": "https://www.instagram.com/DaCars" }
      ]
    },
    "resolved_colors": {
      "berkeley": "#1A3661",
      "jade": "#206442",
      "jadeLight": "#38B275",
      "eefie": "#191919"
    }
  }
}
```

#### Validation errors
```json
{
  "message": "The site.menu_items.0.label field is required.",
  "errors": {
    "site.menu_items.0.label": [
      "The site.menu_items.0.label field is required."
    ]
  }
}
```

## Mail templates
Template keys follow dot notation (`booking/request.twig` → `booking.request`). Keys containing `..`, spaces, or special
characters are rejected. Each template persists editable metadata (`title`, `subject`) plus an optional attachment list. Every
attachment entry exposes `id`, `name`, `size`, `mime_type`, `url`, and a `with_deposit` toggle that restricts delivery to
bookings with (1) or without (0) a security deposit. The API also returns a preview context and the full list of available Twig
variables so the dashboard can build a rich editor.

### GET `/api/mail-templates`
Lists every editable Twig file together with stored metadata.

#### Example response
```json
{
  "data": [
    {
      "key": "booking.base_email",
      "path": "booking/base_email.twig",
      "name": "Booking / Base Email",
      "title": null,
      "subject": null,
      "updated_at": null
    },
    {
      "key": "booking.request",
      "path": "booking/request.twig",
      "name": "Booking / Request",
      "title": "Cerere rezervare",
      "subject": "[DaCars] Cererea ta a ajuns la noi",
      "updated_at": "2024-06-01T12:15:42+00:00"
    },
    {
      "key": "booking.status_reserved",
      "path": "booking/status_reserved.twig",
      "name": "Booking / Status Reserved",
      "title": "Cererea de rezervarea este efectuată cu succes",
      "subject": "[DaCars] Rezervarea ta este confirmată",
      "updated_at": null
    },
    {
      "key": "booking.status_waiting_advance",
      "path": "booking/status_waiting_advance.twig",
      "name": "Booking / Status Waiting Advance",
      "title": "Avem nevoie de avans",
      "subject": "[DaCars] Acțiune necesară pentru rezervare",
      "updated_at": null
    },
    {
      "key": "partials.header",
      "path": "partials/header.twig",
      "name": "Partials / Header",
      "title": null,
      "subject": null,
      "updated_at": null
    },
    {
      "key": "partials.footer",
      "path": "partials/footer.twig",
      "name": "Partials / Footer",
      "title": null,
      "subject": null,
      "updated_at": null
    }
  ]
}
```

### GET `/api/mail-templates/{template}`
Fetches a template by key, including metadata, attachments, a preview context plus both the flattened variable list and descriptive labels for each entry. The preview context
is built by the booking mail service and respects any JSON front matter embedded in the template.

#### Example response
```json
{
  "data": {
    "key": "booking.request",
    "path": "booking/request.twig",
    "name": "Booking / Request",
    "title": "Cerere rezervare",
    "subject": "[DaCars] Cererea ta a ajuns la noi",
    "attachments": [],
    "updated_at": "2024-06-01T12:15:42+00:00",
    "contents": "{#\n  \"hero\": {\n    \"icon_char\": \"📝\",\n    \"icon_background\": \"@colors.jadeLight\",\n    \"title_html\": \"Cererea ta a ajuns la <span style=\\\"color:@{colors.jade};\\\">DaCars</span>!\",\n    \"message_lines\": [\n      \"Mulțumim, <strong>@{customer_display_name}</strong>! Echipa noastră verifică disponibilitatea mașinii alese.\",\n      \"Primești confirmarea finală în cel mai scurt timp, împreună cu pașii următori.\"\n    ],\n    \"badge_label\": \"Cerere @{booking_number}\",\n    \"badge_background\": \"#dff5eb\",\n    \"badge_color\": \"@colors.jade\"\n  },\n  \"cta_buttons\": [\n    {\n      \"label\": \"Descoperă flota completă\",\n      \"url\": \"@links.fleet\",\n      \"variant\": \"primary\"\n    },\n    {\n      \"label\": \"Contactează-ne rapid\",\n      \"url\": \"@links.contact_phone\",\n      \"variant\": \"secondary\"\n    }\n  ],\n  \"footer_note\": \"Ținem legătura prin email și telefon pentru orice actualizare legată de rezervare.\",\n  \"reservation_title\": \"Detaliile cererii tale\"\n}\n{{ header|raw }}\n{% include 'booking/base_email.twig' %}\n{{ footer|raw }}\n",
    "example_context": {
      "booking_number": "#123456",
      "customer_name": "Client Exemplu",
      "booking_overview": {
        "status_label": "În așteptare",
        "duration_days": 4,
        "currency": "EUR"
      },
      "customer": {
        "name": "Client Exemplu",
        "display_name": "Client Exemplu",
        "first_name": "Client",
        "email": "client@example.com",
        "phone": "+40 723 817 551"
      },
      "dates": {
        "start_date": "23.09.2025",
        "start_time": "11:00",
        "end_date": "27.09.2025",
        "end_time": "11:00"
      },
      "payment": {
        "advance_required": true,
        "advance_formatted": "€100,00",
        "total_formatted": "€221,00",
        "link": null,
        "advance_instruction": null
      },
      "services_list": [
        { "name": "Scaun copil", "price": "€5,00" },
        { "name": "Asigurare extinsă", "price": "€12,00" }
      ],
      "hero": {
        "icon_char": "📝",
        "icon_background": "#38B275",
        "title_html": "Cererea ta a ajuns la <span style=\"color:#206442;\">DaCars</span>!",
        "badge_label": "Cerere #123456"
      },
      "cta_buttons": [
        { "label": "Descoperă flota completă", "url": "https://dacars.ro/cars", "variant": "primary" },
        { "label": "Contactează-ne rapid", "url": "tel:+40723817551", "variant": "secondary" }
      ],
      "important_steps": [
        { "number": "1", "title": "La aterizare", "description": "Sună-ne imediat ce ai ajuns la terminal." },
        { "number": "2", "title": "Ne întâlnim în 5 minute", "description": "Un coleg DaCars vine în zona stabilită pentru predarea mașinii." },
        { "number": "3", "title": "Drum bun!", "description": "Primești cheile și poți porni spre destinație fără griji." }
      ],
      "site": {
        "title": "DaCars",
        "url": "https://dacars.ro",
        "logo_path": "images/logo-308x154.webp",
        "logo": "https://dacars.ro/images/logo-308x154.webp",
        "logo_max_height": 62,
        "menu_items": [
          { "label": "Acasă", "url": "https://dacars.ro/" },
          { "label": "Flota auto", "url": "https://dacars.ro/cars" },
          { "label": "Rezervă acum", "url": "https://dacars.ro/form" }
        ],
        "footer_links": [
          { "label": "Termeni și condiții", "url": "https://dacars.ro/terms" },
          { "label": "Politica de confidențialitate", "url": "https://dacars.ro/privacy" }
        ]
      },
      "colors": {
        "berkeley": "#1A3661",
        "jade": "#206442",
        "jadeLight": "#38B275",
        "eefie": "#191919"
      },
      "links": {
        "home": "https://dacars.ro/",
        "fleet": "https://dacars.ro/cars",
        "offers": "https://dacars.ro/offers",
        "checkout": "https://dacars.ro/form",
        "contact_phone": "tel:+40723817551",
        "support_phone": "tel:+40722123456",
        "contact_email": "mailto:contact@dacars.ro"
      },
      "header": "<table role=\"presentation\" ...>",
      "footer": "<table role=\"presentation\" ...>"
    },
    "available_variables": [
      "amount",
      "amount_raw",
      "booking_number",
      "booking_overview.status_label",
      "car_name",
      "colors.berkeley",
      "cta_buttons.[].label",
      "cta_buttons.[].url",
      "customer_name",
      "customer.phone",
      "customer_phone_link",
      "dates.start_date",
      "dates.end_time",
      "hero.title_html",
      "important_steps.[].number",
      "important_steps.[].description",
      "services_list.[].name",
      "services_list.[].price",
      "site.menu_items.[].label",
      "site.menu_items.[].url",
      "support.phone_label"
    ],
    "available_variable_details": [
      {
        "key": "amount",
        "description": "Totalul rezervării formatat cu simbolul monedei."
      },
      {
        "key": "customer_name",
        "description": "Numele complet al clientului."
      },
      {
        "key": "services_list.[].price",
        "description": "Prețul fiecărui serviciu suplimentar din lista simplificată."
      }
    ]
  }
}
```

The preview context also includes additional helper structures such as `general_info_rows`, `pricing_info_rows`, `reservation_highlights`,
`pricing_summary`, and boolean flags (`payment_advance_required`, `with_deposit`). `header` and `footer` contain fully rendered
HTML snippets ready to be inlined by your editor.

### PUT `/api/mail-templates/{template}`
Updates a template. Send any combination of `contents`, `title`, or `subject` (at least one key is required). The file on disk is
replaced with the payload you send when `contents` is present.

#### Example request body
```json
{
  "title": "Confirmare rezervare",
  "subject": "[DaCars] Rezervarea este confirmată",
  "contents": "{# \"hero\": { \"title_html\": \"Rezervarea este <span style=\\\"color:@{colors.jade};\\\">confirmată</span>!\" } #}\n{{ header|raw }}\n{% include 'booking/base_email.twig' %}\n{{ footer|raw }}\n"
}
```

#### Example success response
```json
{
  "data": {
    "key": "booking.request",
    "path": "booking/request.twig",
    "name": "Booking / Request",
    "title": "Confirmare rezervare",
    "subject": "[DaCars] Rezervarea este confirmată",
    "attachments": [],
    "updated_at": "2024-06-01T12:20:11+00:00",
    "contents": "{# \"hero\": { \"title_html\": \"Rezervarea este <span style=\\\"color:@{colors.jade};\\\">confirmată</span>!\" } #}\n{{ header|raw }}\n{% include 'booking/base_email.twig' %}\n{{ footer|raw }}\n"
  }
}
```

#### Validation errors
```json
{
  "message": "No changes were provided."
}
```

Invalid keys respond with `422 { "message": "Invalid template key." }`, while unknown files yield a 404 payload.

### POST `/api/mail-templates/{template}/attachments`
Uploads an attachment (multipart `file` field) and optionally receives a `with_deposit` toggle. Set `with_deposit=1` to deliver
the file only when the booking includes a deposit, `with_deposit=0` to send it only for no-deposit reservations, or omit the
field to attach it in every scenario. The controller enforces the configured limit (`MAIL_TEMPLATE_ATTACHMENT_MAX_KB`, default
8192 KB) and responds with HTTP 201 when the upload succeeds.

#### Example `curl`
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@conditii-generale.pdf" \
  -F "with_deposit=1" \
  https://dacars.ro/api/mail-templates/booking.status_reserved/attachments
```

#### Example response
```json
{
  "data": {
    "attachment": {
      "id": "f9ae1c4d-7b63-4a8f-9c3d-1f2b3c4d5e6f",
      "name": "conditii-generale.pdf",
      "size": 245678,
      "mime_type": "application/pdf",
      "url": "https://dacars.ro/storage/mail-template-attachments/booking/status_reserved/f9ae1c4d/conditii-generale.pdf",
      "with_deposit": true
    },
    "attachments": [
      {
        "id": "f9ae1c4d-7b63-4a8f-9c3d-1f2b3c4d5e6f",
        "name": "conditii-generale.pdf",
        "size": 245678,
        "mime_type": "application/pdf",
        "url": "https://dacars.ro/storage/mail-template-attachments/booking/status_reserved/f9ae1c4d/conditii-generale.pdf",
        "with_deposit": true
      }
    ]
  }
}
```

Missing files or oversized uploads return a 422 validation error. Unknown templates return 404.

### DELETE `/api/mail-templates/{template}/attachments/{attachment}`
Deletes an attachment by UUID. An invalid template key yields 422; an unknown attachment returns 404.

#### Example response
```json
{
  "data": {
    "attachments": []
  }
}
```

## Template front matter & inline overrides
Each Twig file may start with a JSON block wrapped in `{# ... #}`. The block is parsed before rendering and can override any
context value delivered by the mail service. Strings support two kinds of lookups:

- `@{path.to.value}` interpolates the referenced value into the string.
- `@path.to.value` replaces the entire value (objects and arrays are supported).

Example front matter (taken from the booking request email):

```twig
{#
{
  "hero": {
    "icon_char": "📝",
    "icon_background": "@colors.jadeLight",
    "title_html": "Cererea ta a ajuns la <span style=\"color:@{colors.jade};\">DaCars</span>!"
  },
  "cta_buttons": [
    { "label": "Descoperă flota completă", "url": "@links.fleet", "variant": "primary" }
  ]
}
#}
```

## Booking context reference
The booking mail service builds a rich context that every template receives. Key sections include:

- `header` / `footer` – pre-rendered HTML partials ready to inject with `{{ header|raw }}` / `{{ footer|raw }}`.
- `site` – branding information (`title`, `url`, `logo`, `menu_items`, `footer_links`, `social_links`, `email`, `phone`, etc.).
- `colors` – the Berkeley/Jade colour palette (plus any overrides saved through branding settings).
- `links` – helpful absolute URLs (`home`, `fleet`, `offers`, `checkout`, `calendar`, `contact_phone`, `support_phone`, `contact_email`).
- `hero`, `cta_buttons`, `footer_note`, `support`, `reservation_title` – hero banner content that can be overridden by front matter.
- `booking_number`, `booking_overview`, `customer`, `dates`, `payment` – core booking metadata and payment helpers.
- `reservation_highlights`, `pricing_summary`, `services_list`, `flight_information`, `wheel_prize` – structured blocks used across
  the redesigned base email.
- `general_info_rows`, `customer_info_rows`, `car_info_rows`, `pricing_info_rows` – table-friendly two-column rows.
- Flat variables such as `amount`, `rental_start_date`, `pickup_address`, `payment_link`, `rental_plan_type`, `with_deposit_label`
  are always included to simplify Twig substitutions.

### Flattened variables
The `available_variables` array surfaces every reachable key using dot notation. Array indices are represented with `[]` segments.
For UI-friendly tooltips, `available_variable_details` pairs each key with a human-readable description generată dinamic pe baza contextului.
Examples:

- `services_list.[].name` – each add-on service label.
- `important_steps.[].title` – the three timeline blocks.
- `general_info_rows.[].[].label` – rows generated for the summary tables.
- `site.menu_items.[].url` – navigation items coming from branding settings.
- `colors.jadeLight`, `payment_advance_instruction`, `customer_phone_link`, `wheel_prize_discount_signed`, etc.

Use the list to populate variable pickers in the dashboard; any newly introduced data points appear automatically because the
keys are computed from the live preview context.

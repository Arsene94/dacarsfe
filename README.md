# DaCars - Website Închirieri Auto

Website modern și funcțional pentru DaCars - serviciu de închirieri auto în România, cu focus pe românii care călătoresc și au nevoie de o mașină la întoarcerea acasă.

## Funcționalități Principale

### 🎯 Core Features
- **Homepage complet** cu hero section, beneficii, flotă auto, oferte speciale
- **Pagină flotă** cu sistem avansat de filtrare și sortare
- **Sistem de rezervare** cu formular validat și calcul automat al prețului
- **Roată a norocului** cu premii și reduceri din API Laravel
- **Design responsive** optimizat pentru toate dispozitivele
- **Integrare Google Maps** pentru locația din Otopeni

### 🎨 Design & UX
- **Identitate vizuală consistentă**: Berkeley Blue, Jade Green, Eefie Black
- **Tipografie premium**: Poppins pentru titluri, DM Sans pentru text
- **Animații subtile** și micro-interacțiuni pentru engagement
- **Layout aerisit** cu spațiu alb generos
- **CTA-uri optimizate** pentru conversii maxime

### 🎡 Roata Norocului
- **Integrare API Laravel** pentru premii și probabilități
- **Sistem de coduri de reducere** cu validare în timp real
- **Aplicare automată** a reducerilor la rezervare
- **Design interactiv** cu animații fluide
- **Tracking utilizatori** pentru prevenirea abuzurilor

## Structura API Laravel

### Endpoint-uri necesare:

```php
// Obține premiile disponibile
GET /api/wheel/prizes
Response: {
  "prizes": [
    {
      "id": 1,
      "name": "10% Reducere",
      "description": "Reducere 10% la următoarea rezervare",
      "discount_percentage": 10,
      "probability": 25,
      "color": "#1E7149",
      "icon": "gift",
      "is_active": true
    }
  ]
}

// Învârte roata
POST /api/wheel/spin
Body: { "user_id": "optional" }
Response: {
  "success": true,
  "prize": { /* obiect premiu */ },
  "code": "WHEEL10",
  "message": "Felicitări! Ai câștigat 10% reducere!"
}

// Validează cod de reducere
POST /api/wheel/validate-code
Body: { "code": "WHEEL10" }
Response: { "valid": true, "discount": 10 }

// Aplică reducerea
POST /api/wheel/apply-discount
Body: { "code": "WHEEL10", "reservation": { /* date rezervare */ } }
Response: { "success": true, "new_total": 45.50 }
```

## Instalare și Rulare

```bash
# Instalează dependențele
npm install

# Pornește serverul de dezvoltare
npm run dev

# Build pentru producție
npm run build
```

## Configurare API

Adaugă în `.env`:
```
REACT_APP_API_URL=http://localhost:8000/api
```

## Tehnologii Utilizate

- **React 18** cu TypeScript
- **React Router** pentru navigare
- **Tailwind CSS** pentru styling
- **Lucide React** pentru iconuri
- **Vite** pentru build și development

## Structura Proiectului

```
src/
├── components/          # Componente reutilizabile
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── SpinWheel.tsx
│   └── SpinWheelButton.tsx
├── pages/              # Pagini principale
│   ├── HomePage.tsx
│   ├── FleetPage.tsx
│   ├── ReservationPage.tsx
│   └── SuccessPage.tsx
├── services/           # Servicii API
│   └── wheelApi.ts
└── App.tsx            # Componenta principală
```

## Caracteristici Roata Norocului

- **Design interactiv** cu segmente colorate pentru fiecare premiu
- **Animații fluide** cu CSS transforms și transitions
- **Sistem de probabilități** controlat din backend
- **Validare coduri** în timp real
- **Aplicare automată** a reducerilor la checkout
- **Tracking utilizatori** pentru prevenirea abuzurilor
- **Responsive design** pentru mobile și desktop

## Optimizări SEO

- Meta tags optimizate pentru închirieri auto România
- Structured data pentru Google
- Imagini optimizate cu alt text descriptiv
- URLs prietenoase pentru SEO
- Performance optimizat pentru Core Web Vitals
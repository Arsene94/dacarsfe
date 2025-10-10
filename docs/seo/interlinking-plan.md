# Plan interlinking pagini pilot DaCars

| Pagină sursă | Link intern adăugat | Ancoră folosită | Scop |
| --- | --- | --- | --- |
| `/faq` | `/offers` | "Vezi promoțiile active DaCars" | Trimite utilizatorii și LLM-urile către reducerile curente imediat după informare.
| `/faq` | `/cars` | "Explorează flota completă" | Conectează întrebările frecvente cu lista de mașini disponibile.
| `/faq` | `/contact` | "Contactează un consultant 24/7" | Asigură acces rapid la suport uman din zona Q&A.
| `/offers` | `/faq` | "Întrebări frecvente despre reduceri" | Clarifică condițiile ofertelor și reduce abandonul.
| `/offers` | `/cars` | "Verifică disponibilitatea flotei" | Invită utilizatorii să rezerve direct după citirea promoțiilor.
| `/offers` | `/contact` | "Cere o ofertă personalizată" | Încurajează discuții directe pentru pachete complexe.
| `/cars` | `/offers` | "Promoții verificate" | Evidențiază reducerile aplicabile mașinilor filtrate.
| `/cars` | `/faq` | "Întrebări frecvente" | Conectează selecția de mașini cu clarificările standard.
| `/cars` | `/contact` | "Solicită un consultant" | Oferă asistare umană rapidă în procesul de filtrare.
| `/contact` | `/offers` | "Promoții active" | Recomandă ofertele înainte de inițierea unei discuții.
| `/contact` | `/cars` | "Flota disponibilă" | Permite utilizatorilor să revină în listă după luarea datelor de contact.
| `/contact` | `/faq` | "Întrebări frecvente" | Direcționează către răspunsuri instant pentru întrebări uzuale.

## Actualizări sitemap și robots

- `/offers` a fost adăugat în lista `STATIC_PAGES` cu frecvență de actualizare zilnică pentru includere în `sitemap.xml`.
- `robots.txt` blochează acum indexarea paginilor cu valoare scăzută (`/politica-de-confidentialitate`, `/politica-cookie`) pentru a concentra crawl bugetul.


# Diagnostic LCP homepage — secțiunea Hero

## Context și date de măsurare
- **Element LCP:** imagine cu alt="Fundal aeroport" din hero-ul paginii principale.
- **LCP total măsurat:** ~7,4 s pe profilul Lighthouse (Moto G4, conexiune 4G lentă).
- **Defalcare LCP:**
  - TTFB: ~600 ms (≈8%).
  - Întârziere pornire încărcare resursă: ~20 ms (≈0%).
  - Durată încărcare resursă: ~220 ms (≈3%).
  - Întârziere randare element: ~6,56 s (≈89%).

Interpretare: imaginea este descoperită și descărcată foarte rapid, dar browserul rămâne blocat ~6,5 s înainte să poată afișa cadrele finale.

## Cauze probabile
1. **Blocarea firului principal de JavaScript/CSS.**
   - Hidratări sau scripturi mari (ex. `HeroBookingForm`, logici de formular) pot consuma CPU imediat după TTFB și întârzie randarea imaginii până când firul principal se eliberează.
2. **Cost mare de decodare pentru formatul AVIF.**
   - Fișierul `bg-hero-1280x720.avif` are dimensiune mică, însă AVIF necesită decodare complexă. Pe hardware mobil low-end, transformarea în pixeli poate dura secunde, alimentând „Element render delay”.
3. **Resurse de randare critice (CSS/fonturi) încărcate tardiv.**
   - Layout-ul hero-ului depinde de clase Tailwind și gradient. Dacă CSS-ul critic nu este disponibil imediat sau dacă există multe fonturi/declarații blocante, browserul poate amâna paint-ul final.

## Recomandări de optimizare
### Măsuri deja implementate
- Hero-ul utilizează acum varianta WebP a imaginii de fundal și forțează livrarea în format `image/webp`, reducând timpul de decodare pe dispozitive mobile.
- Formularul din hero este redat exclusiv pe client (SSR dezactivat) și afișează un schelet lightweight până la hidratare, eliberând firul principal în primele secunde.
- Încărcarea categoriilor din API este programată prin `requestIdleCallback`/timeout astfel încât operațiunea să pornească doar după paint-ul inițial.

### 1. Reduceți lucrul pe firul principal înainte de LCP
- Spargeți logica formularului Hero în module încărcate lazy (`dynamic(() => import(...), { ssr: false })`) pentru componente non-critice.
- Eliminați/operați în background orice efecte de inițializare grele (analytics, tracking) folosind `useEffect` cu `requestIdleCallback` sau `defer`/`async` pe scripturi externe.
- Monitorizați în Chrome Performance pentru task-uri >50 ms și tăiați/fragmentați bucățile costisitoare.

### 2. Testați alternative de format pentru imagine
- Generați versiuni WebP/JPEG progresiv pentru hero și serviți-le condițional (`<picture>` sau `next/image` ajustând `formats`) pentru a compara timpii; păstrați `image/webp` ca default până când decodarea AVIF devine suficient de rapidă.
- Ajustați `quality` și rezoluția astfel încât varianta mobilă să nu depășească 960 px lățime; o imagine ușor mai mare dar care se decodează instant poate reduce masiv LCP.
- Măsurați în Lighthouse: dacă „Image Decode” scade sub 200 ms, păstrați varianta respectivă.

### 3. Asigurați CSS și fonturi critice cât mai devreme
- Mențineți clasele Tailwind esențiale în bundle-ul critic (verificați configurarea `content` din `tailwind.config.ts` pentru a nu fi eliminate accidental).
- Inserați `font-display: swap` pentru Poppins/DM Sans astfel încât textul să nu blocheze paint-ul.
- Dacă există CSS voluminos pentru zone non-critice, extrageți-l în fișiere încărcate ulterior.

### 4. Verificați prioritizarea resursei LCP
- Confirmați folosirea `priority` pe componenta `next/image` din hero (setează automat `fetchpriority="high"` în HTML și nu mai este nevoie de prop suplimentar).
- Verificați că nu există `loading="lazy"` sau interacțiuni cu `IntersectionObserver` pe containerul hero.

## Plan de lucru propus
1. Capturați o trasă Lighthouse + Chrome Performance pentru homepage după pornirea serverului de producție.
2. Aplicați optimizările de JS (code-splitting / defer) și re-rulați trasarea pentru a valida reducerea task-urilor >200 ms.
3. Produceți variante WebP/JPEG ale imaginii și măsurați comparativ LCP (tabel cu format vs. timp).
4. Dacă LCP rămâne >2,5 s, analizați și restul resurselor critice (ex. `app/layout.tsx`) pentru alte blocaje.

## KPI țintă
- LCP < 2,5 s (valoare „bună” pentru Core Web Vitals) pe conexiune mobilă simulată.
- „Element render delay” <10% din LCP total.
- Zero task-uri JavaScript >100 ms în primele 3 s după `navigationStart`.

## Follow-up
- Documentați în Notion rezultatele fiecărui experiment (format imagine, code-splitting) și creați tichete dedicate pentru implementarea optimizărilor în backlog-ul frontend.
- După livrare, monitorizați LCP real (CrUX / Google Analytics 4) pentru trafic mobil din România pe homepage.

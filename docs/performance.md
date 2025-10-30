# Monitorizarea performanței și optimizarea LCP

Pentru a ține sub control metricile Core Web Vitals – în special Largest Contentful Paint (LCP) pe mobil – rulează periodic Lighthouse CI în modul mobil. Înainte de rulare, pornește aplicația (de exemplu `npm run dev` sau `npm run start` după build) pe portul implicit `3000`.

```bash
npm run audit:lcp
```

Comanda folosește configurația din `config/lighthouse/lighthouserc.json` și generează rapoarte în directorul `.lighthouse/`. Setările emulează un dispozitiv mobil cu rețea 4G lentă și CPU încetinit, astfel încât problemele reale de LCP să fie vizibile.

Dacă raportul semnalează depășirea pragului de 2.5s pentru LCP, investighează paginile afectate cu PageSpeed Insights sau Lighthouse în Chrome DevTools și aplică optimizări (optimizarea imaginilor erou, reducerea JS critic, preîncărcarea resurselor, etc.). După implementare, rulează din nou testele pentru a valida îmbunătățirile.

## Ghid pentru optimizarea imaginilor

- Folosește componentele `next/image` cu `sizes` explicite pentru toate cardurile. Pentru grilele auto și cardurile de blog reutilizează preset-urile din `lib/images/sizePresets.ts` astfel încât imaginile generate să nu depășească containerul.
- Evită atributul `priority` pentru imaginile din secțiunile aflate sub pliul paginii (ex. flota, listări) pentru a permite încărcarea lazy.
- Next.js livrează automat formatele `image/avif` și `image/webp` conform configurației din `next.config.js`. Dacă adaugi imagini statice noi, rulează `npm run images:webp` pentru a genera versiuni optimizate și asigură-te că folosești extensii moderne (`.webp`/`.avif`).

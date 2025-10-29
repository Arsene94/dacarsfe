# Monitorizarea performanței și optimizarea LCP

Pentru a ține sub control metricile Core Web Vitals – în special Largest Contentful Paint (LCP) pe mobil – rulează periodic Lighthouse CI în modul mobil. Înainte de rulare, pornește aplicația (de exemplu `npm run dev` sau `npm run start` după build) pe portul implicit `3000`.

```bash
npm run audit:lcp
```

Comanda folosește configurația din `config/lighthouse/lighthouserc.json` și generează rapoarte în directorul `.lighthouse/`. Setările emulează un dispozitiv mobil cu rețea 4G lentă și CPU încetinit, astfel încât problemele reale de LCP să fie vizibile.

Dacă raportul semnalează depășirea pragului de 2.5s pentru LCP, investighează paginile afectate cu PageSpeed Insights sau Lighthouse în Chrome DevTools și aplică optimizări (optimizarea imaginilor erou, reducerea JS critic, preîncărcarea resurselor, etc.). După implementare, rulează din nou testele pentru a valida îmbunătățirile.

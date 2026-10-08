# antgio90.it · about.antgio90.it

Sito statico generato da file JSON. Il sito non ha dipendenze npm (serve solo Node ≥ 18); il CV PDF usa Playwright, solo dentro GitHub Actions.

```
content/profile.json        → antgio90.it (testi e link)
content/cv.json             → CV (il PDF viene generato da qui)
public/                     → file statici copiati così come sono (styles.css, CV PDF generato)
build.mjs                   → genera dist/ per antgio90.it
cv/                         → template HTML del CV + script PDF (Playwright/Chromium) + font Open Sans
.github/workflows/cv-pdf.yml→ GitHub Action che rigenera il PDF quando cambia il CV

about/content/site.json     → email, Instagram, footer (comuni alle 3 pagine)
about/content/about.json    → pagina About (intro, timeline, interessi)
about/content/projects.json → pagina Projects (sezioni e card)
about/content/photos.json   → pagina Photos (banner e galleria)
about/public/               → style.css e img/
about/build.mjs             → genera about/dist/

.pages.yml                  → configurazione di Pages CMS (form di modifica)
```

## Modificare i contenuti

**Dal browser, con form: [app.pagescms.org](https://app.pagescms.org)** → login con GitHub → repo `rubik90.github.io` → branch `main`.
Ogni "Save" crea un commit e Vercel ripubblica in circa 10 secondi.

**Modifica diretta:** apri il file JSON su GitHub (oppure premi `.` per aprire github.dev), modificalo e fai il commit.

**Foto:** dalla sezione Media di Pages CMS ("Foto"), poi selezionale nel campo immagine. Le dimensioni vengono lette in automatico durante il build.

**CV:** modifica la voce "CV" in Pages CMS (o `content/cv.json`). Al salvataggio la GitHub Action *CV PDF* rigenera `public/Antonio-Giordano-CV.pdf` e lo committa (≈1–2 min), poi Vercel lo pubblica. L'URL resta `antgio90.it/Antonio-Giordano-CV.pdf`. Non caricare il PDF a mano: verrebbe sovrascritto.
Nei testi del CV puoi usare `**grassetto**`, `*corsivo*`, `[testo](https://link)`. Stato della generazione: tab *Actions* del repo su GitHub.

## Rete di sicurezza

- Se un campo obbligatorio è vuoto o un'immagine non esiste, il build fallisce, Vercel non pubblica e il sito resta alla versione precedente. L'errore si legge nei log del deploy su Vercel.
- Per provare modifiche più grandi: lavora su un branch diverso da `main` → Vercel genera un URL di preview → se va bene, fai il merge.

## Anteprima in locale

```bash
node build.mjs && python -m http.server -d dist 8000                    # antgio90.it
cd about && node build.mjs && python -m http.server -d dist 8001        # about
cd cv && npm ci && npx playwright install chromium && npm run pdf        # CV PDF
```

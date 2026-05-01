# IsolaWatt Static Site

Static website for `isolawatt.com`, hosted with GitHub Pages and the custom
domain configured in `CNAME`.

The homepage is a commercial MVP for IsolaWatt Solar Sizer: landing page,
off-grid photovoltaic calculator, editable load list, scenario presets, live
sizing results, local browser project save, shareable project links, and a mini
report that can be copied or printed to PDF from the browser. It is also a small
installable PWA: supported browsers can cache the static pages for offline use
after the first visit. It uses only HTML, CSS, and vanilla JavaScript.

Required public URL for Google Play:

```text
https://isolawatt.com/privacy/
```

## Files

- `index.html`: Italian landing page and calculator shell.
- `app.js`: browser-only solar sizing calculator, presets, local save, share links, navigation, and PWA registration.
- `styles.css`: shared responsive and print styling.
- `manifest.webmanifest`: PWA metadata, icons, display mode, and shortcuts.
- `service-worker.js`: same-origin static cache for offline use. It does not call external services.
- `privacy/index.html`: public Privacy Policy for Google Play.
- `camper/`, `barca/`, `baita/`, `casa-isolata/`, `calcolo-batteria-fotovoltaico/`: Static SEO guide pages with URL hash preset links for the calculator.
- `assets/isolawatt-logo.svg`: reusable app/site logo.
- `assets/isolawatt-logo-192.png`: PWA icon.
- `assets/isolawatt-logo-512.png`: PNG logo.
- `assets/isolawatt-logo-512.jpg`: JPEG logo with white background.
- `CNAME`: GitHub Pages custom domain, currently `isolawatt.com`.
- `robots.txt` and `sitemap.xml`: crawler metadata.

The site remains 100% static, privacy-friendly, without any backend, external tracking, or cookies.

## Local Testing

Open `index.html` directly in a browser for basic static testing. No install,
build step, backend, or database is required.

Use a local server to test the PWA service worker, because service workers do
not run from `file://`:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Manual PWA checks:

- Confirm the app manifest is loaded in browser DevTools.
- Confirm `service-worker.js` registers on `localhost` or `https://isolawatt.com`.
- Turn the browser offline after the first load and reopen `/`, `/camper/`, and `/privacy/`.
- Confirm no external network requests are made.

Before using the policy URL in Play Console, make sure `support@isolawatt.com`
is active or forwarded to an inbox you control.

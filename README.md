# IsolaWatt Static Site

Static website for `isolawatt.com`, hosted with GitHub Pages and the custom
domain configured in `CNAME`.

The homepage is a commercial MVP for IsolaWatt Solar Sizer: landing page,
off-grid photovoltaic calculator, live sizing results, and a mini report that
can be copied or printed to PDF from the browser. It uses only HTML, CSS, and
vanilla JavaScript.

Required public URL for Google Play:

```text
https://isolawatt.com/privacy/
```

## Files

- `index.html`: Italian landing page and calculator shell.
- `app.js`: browser-only solar sizing calculator.
- `styles.css`: shared responsive and print styling.
- `privacy/index.html`: public Privacy Policy for Google Play.
- `assets/isolawatt-logo.svg`: reusable app/site logo.
- `assets/isolawatt-logo-512.png`: PNG logo.
- `assets/isolawatt-logo-512.jpg`: JPEG logo with white background.
- `CNAME`: GitHub Pages custom domain, currently `isolawatt.com`.
- `robots.txt` and `sitemap.xml`: crawler metadata.

## Local Testing

Open `index.html` directly in a browser. No install, build step, backend, or
database is required.

Optional local server:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Before using the policy URL in Play Console, make sure `support@isolawatt.com`
is active or forwarded to an inbox you control.

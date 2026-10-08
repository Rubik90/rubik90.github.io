// CV template: content/cv.json → print-ready HTML (A4), layout derived from "CV 2_optimized.docx".
// Zero dependencies. Inline markup allowed in text fields: **bold**, *italic*, [label](https://url)

const esc = s => (s == null ? '' : String(s))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const md = s => esc(s)
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

const host = url => String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const list = a => (Array.isArray(a) ? a : []).filter(x => x != null && x !== '');

export function validate(cv) {
  const need = ['name', 'contact.email'];
  const missing = need.filter(p => {
    const v = p.split('.').reduce((o, k) => (o == null ? o : o[k]), cv);
    return v == null || (typeof v === 'string' && !v.trim());
  });
  if (missing.length) throw new Error(`content/cv.json: campi obbligatori vuoti → ${missing.join(', ')}`);
}

// Entry: "**Org,** Place— *Role*" / PERIOD / bullets / plain lines
const entry = e => `
      <article class="entry">
        <h3>${e.org ? `<strong>${esc(e.org)},</strong> ` : ''}${esc(e.place || '')}${e.role ? `— <em>${esc(e.role)}</em>` : ''}</h3>
        ${e.period ? `<p class="period">${esc(e.period)}</p>` : ''}
        ${list(e.bullets).length ? `<ul>${list(e.bullets).map(b => `<li>${md(b)}</li>`).join('')}</ul>` : ''}
        ${list(e.lines).length ? `<div class="lines">${list(e.lines).map(l => `<p>${md(l)}</p>`).join('')}</div>` : ''}
      </article>`;

const section = (title, items) => list(items).length ? `
    <section>
      <h2>${esc(title)}</h2>${list(items).map(entry).join('')}
    </section>` : '';

export function renderCv(cv, { fontsHref = 'fonts' } = {}) {
  validate(cv);
  const c = cv.contact || {};
  const cert = cv.certifications || {};

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(cv.pdf?.title || cv.name + ' - Curriculum Vitae')}</title>
<meta name="author" content="${esc(cv.name)}">
<meta name="description" content="${esc(cv.pdf?.subject || '')}">
<style>
  @font-face { font-family: 'CV Sans'; font-weight: 400; font-style: normal; src: url('${fontsHref}/arimo-latin-400-normal.woff2') format('woff2'); }
  @font-face { font-family: 'CV Sans'; font-weight: 400; font-style: italic; src: url('${fontsHref}/arimo-latin-400-italic.woff2') format('woff2'); }
  @font-face { font-family: 'CV Sans'; font-weight: 700; font-style: normal; src: url('${fontsHref}/arimo-latin-700-normal.woff2') format('woff2'); }
  @font-face { font-family: 'CV Sans'; font-weight: 700; font-style: italic; src: url('${fontsHref}/arimo-latin-700-italic.woff2') format('woff2'); }

  @page { size: A4; margin: 12mm 15mm 15mm; }

  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'CV Sans', Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.15; color: #000; }
  p { margin: 0; }
  a { color: #1155cc; }

  .cv { display: grid; grid-template-columns: 68fr 32fr; column-gap: 9mm; }
  aside { padding-top: 1mm; }

  /* header */
  .name { margin: 4mm 0 0; font-size: 24pt; line-height: 1.1; font-weight: 700; }
  .web { margin-top: 3mm; font-size: 11pt; font-style: italic; }
  .web a { color: inherit; text-decoration: none; }
  .contact p { font-size: 9pt; }
  .contact .strong { font-weight: 700; }
  .contact .gap { margin-top: 3.5mm; }

  /* sections */
  h2 { margin: 0 0 3.5mm; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .1pt; break-after: avoid; }
  main section { margin-top: 9mm; }
  main section + section { margin-top: 5mm; }
  main section:first-of-type { margin-top: 13mm; }

  .entry { margin-bottom: 4.5mm; }
  .entry h3 { margin: 0; font-size: 12pt; line-height: 1.2; font-weight: 400; break-after: avoid; }
  .entry h3 strong { font-weight: 700; }
  .period { margin: 1.6mm 0 2mm; font-size: 8.5pt; break-after: avoid; }
  ul { margin: 0; padding-left: 10.5mm; }
  li { font-size: 10pt; line-height: 1.17; text-align: justify; margin: 0; break-inside: avoid; }
  li::marker { font-size: 9pt; }
  .lines p { font-size: 9pt; line-height: 1.2; }

  aside section { margin-top: 9mm; }
  aside section:first-of-type { margin-top: 23mm; }
  aside .skills { text-align: justify; font-size: 9pt; line-height: 1.2; }
  aside .awards p, aside .langs p { font-size: 9pt; }
  aside .langs p { font-size: 10pt; }
  aside .cert p { font-size: 10.5pt; line-height: 1.25; }
  aside h2.cert-title { margin-bottom: 1.5mm; }
  aside .langs h2 { margin-bottom: 3mm; }

  .declaration { margin-top: 9mm; break-inside: avoid; }
  .declaration h2 { font-size: 8pt; margin-bottom: 2.5mm; }
  .declaration p { font-size: 8pt; }
</style>
</head>
<body>
  <div class="cv">
    <main>
      <h1 class="name">${esc(cv.name)}</h1>
      ${cv.website ? `<p class="web"><a href="${esc(cv.website)}">${esc(host(cv.website))}</a></p>` : ''}
${section('Experience', cv.experience)}
${section('Education', cv.education)}
${section('Volunteering', cv.volunteering)}
      ${cv.declaration ? `<div class="declaration"><h2>Declaration</h2><p>${md(cv.declaration)}</p></div>` : ''}
    </main>

    <aside>
      <div class="contact">
        ${c.address ? `<p>${esc(c.address)}</p>` : ''}
        ${c.city ? `<p>${esc(c.city)}</p>` : ''}
        ${c.phone ? `<p class="strong gap">${esc(c.phone)}</p>` : ''}
        <p class="strong${c.phone ? '' : ' gap'}">${esc(c.email)}</p>
      </div>
      ${list(cv.skills).length ? `<section><h2>Skills</h2><p class="skills">${list(cv.skills).map(esc).join(' | ')}</p></section>` : ''}
      ${list(cv.awards).length ? `<section class="awards"><h2>Awards</h2>${list(cv.awards).map(a => `<p><strong>${esc(a.title)}</strong>${a.period ? ` - ${esc(a.period)}` : ''}</p>`).join('')}</section>` : ''}
      ${list(cv.languages).length ? `<section class="langs"><h2>Languages</h2>${list(cv.languages).map(l => `<p>${esc(l.label)}</p>${l.url ? `<p><a href="${esc(l.url)}">${esc(l.url)}</a></p>` : ''}`).join('')}</section>` : ''}
      ${list(cert.items).length ? `<section class="cert"><h2 class="cert-title">${esc(cert.title || 'Certifications')}</h2>${list(cert.items).map(i => `<p>${md(i)}</p>`).join('')}</section>` : ''}
    </aside>
  </div>
</body>
</html>
`;
}

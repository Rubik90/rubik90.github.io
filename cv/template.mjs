// CV template: content/cv.json → print-ready HTML (A4). Zero dependencies.
// Inline markup allowed in text fields: **bold**, *italic*, [label](https://url)

const esc = s => (s == null ? '' : String(s))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const md = s => esc(s)
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

const host = url => String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const hostSlash = url => String(url || '').replace(/^https?:\/\/(www\.)?/, '');
const cssStr = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

export function validate(cv) {
  const need = ['name', 'contact.email', 'summary'];
  const missing = need.filter(p => {
    const v = p.split('.').reduce((o, k) => (o == null ? o : o[k]), cv);
    return v == null || (typeof v === 'string' && !v.trim());
  });
  if (missing.length) throw new Error(`content/cv.json: campi obbligatori vuoti → ${missing.join(', ')}`);
}

export function renderCv(cv, { fontsHref = 'fonts' } = {}) {
  validate(cv);
  const c = cv.contact || {};
  const headline = (cv.headline || []).filter(Boolean);
  const footerText = [c.email, c.phone, hostSlash(c.linkedin), host(c.website)].filter(Boolean).join('  •  ');
  const headerText = [cv.name?.toUpperCase(), headline[0], 'Curriculum Vitae'].filter(Boolean).join('   |   ');

  const section = (title, body, cls = '') => body ? `
  <section class="${cls}">
    <h2>${esc(title)}</h2>
    ${body}
  </section>` : '';

  const twoColTable = (left = [], right = []) => {
    const rows = Math.max(left.length, right.length);
    if (!rows) return '';
    return `<table class="grid">${Array.from({ length: rows }, (_, i) =>
      `<tr><td>${md(left[i] || '')}</td><td>${md(right[i] || '')}</td></tr>`).join('')}</table>`;
  };

  const experience = (cv.experience || []).map(e => `
    <article class="entry">
      <div class="entry-head">
        <h3>${esc(e.role)}${e.company ? ` <span class="sep">|</span> <span class="org">${esc(e.company)}</span>` : ''}</h3>
        <span class="when">${[e.period, e.location].filter(Boolean).map(esc).join(' <span class="sep">|</span> ')}</span>
      </div>
      ${e.summary ? `<p class="lede">${md(e.summary)}</p>` : ''}
      ${(e.bullets || []).length ? `<ul>${e.bullets.map(b => `<li>${md(b)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');

  const comp = cv.competencies || [];
  const competencies = comp.length ? `<table class="grid comp">${Array.from({ length: Math.ceil(comp.length / 2) }, (_, r) =>
    `<tr>${[comp[2 * r], comp[2 * r + 1]].map(x => x ? `<td><h4>${esc(x.title)}</h4><p>${md(x.text)}</p></td>` : '<td></td>').join('')}</tr>`).join('')}</table>` : '';

  const highlights = (cv.highlights || []).length ? `<table class="hl">${cv.highlights.map(h =>
    `<tr><th>${esc(h.title).replace(/(\S*-\S*)/g, '<span class="nw">$1</span>')}</th><td>${md(h.text)}</td></tr>`).join('')}</table>` : '';

  const education = (cv.education || []).map(e => `
    <article class="entry">
      <div class="entry-head">
        <h3>${esc(e.degree)}</h3>
        <span class="when">${[e.period, e.location].filter(Boolean).map(esc).join(' <span class="sep">|</span> ')}</span>
      </div>
      ${e.institution ? `<p class="inst">${esc(e.institution)}</p>` : ''}
      ${e.details ? `<p>${md(e.details)}</p>` : ''}
    </article>`).join('');

  const honors = (cv.honors || []).length ? `<ul>${cv.honors.map(h => `<li>${md(h)}</li>`).join('')}</ul>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(cv.pdf?.title || cv.name + ' - Curriculum Vitae')}</title>
<meta name="author" content="${esc(cv.name)}">
<meta name="description" content="${esc(cv.pdf?.subject || '')}">
<style>
  @font-face { font-family: 'Open Sans'; font-weight: 400; font-style: normal; src: url('${fontsHref}/open-sans-latin-400-normal.woff2') format('woff2'); }
  @font-face { font-family: 'Open Sans'; font-weight: 400; font-style: italic; src: url('${fontsHref}/open-sans-latin-400-italic.woff2') format('woff2'); }
  @font-face { font-family: 'Open Sans'; font-weight: 600; font-style: normal; src: url('${fontsHref}/open-sans-latin-600-normal.woff2') format('woff2'); }
  @font-face { font-family: 'Open Sans'; font-weight: 700; font-style: normal; src: url('${fontsHref}/open-sans-latin-700-normal.woff2') format('woff2'); }

  :root { --navy:#1e3a8a; --blue:#2563eb; --ink:#334155; --muted:#64748b; --line:#cbd5e1; --soft:#f1f5f9; }

  @page {
    size: A4;
    margin: 15mm 16mm 16mm;
    @top-left { content: ${cssStr(headerText)}; font: 600 8.5pt 'Open Sans', sans-serif; color: var(--muted); vertical-align: bottom; padding-bottom: 3mm; border-bottom: .4pt solid var(--line); }
    @bottom-left { content: ${cssStr(footerText)}; font: 400 7.5pt 'Open Sans', sans-serif; color: var(--muted); vertical-align: top; padding-top: 3mm; border-top: .4pt solid var(--line); }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 400 7.5pt 'Open Sans', sans-serif; color: var(--muted); vertical-align: top; padding-top: 3mm; border-top: .4pt solid var(--line); }
  }
  @page :first { margin-top: 14mm; @top-left { content: none; border: 0; } }

  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: 'Open Sans', Arial, sans-serif; font-size: 8.6pt; line-height: 1.4; color: var(--ink); }
  a { color: var(--blue); }
  strong { color: #1e293b; font-weight: 700; }
  p { margin: 0; }

  header.top { display: flex; justify-content: space-between; align-items: center; gap: 6mm; padding-bottom: 4mm; border-bottom: 1.4pt solid var(--navy); }
  header.top h1 { margin: 0; font-size: 21pt; line-height: 1.05; font-weight: 700; letter-spacing: .3pt; color: var(--navy); text-transform: uppercase; }
  header.top .headline { margin-top: 1.5mm; font-size: 9.6pt; font-weight: 600; color: var(--blue); }
  header.top .headline .sep { color: var(--muted); font-weight: 400; margin: 0 1.5mm; }
  header.top .contact { font-size: 7.9pt; line-height: 1.55; color: #475569; text-align: left; white-space: nowrap; }
  header.top .contact .sep { margin: 0 1.2mm; color: var(--muted); }

  section { margin-top: 3.2mm; }
  h2 { margin: 0 0 2.2mm; padding-bottom: 1mm; border-bottom: 1pt solid var(--navy); font-size: 10.2pt; font-weight: 700; letter-spacing: .2pt; color: var(--navy); text-transform: uppercase; break-after: avoid; }
  h3 { margin: 0; font-size: 9.8pt; font-weight: 700; color: var(--navy); }
  h3 .org { color: var(--blue); }
  .sep { color: var(--muted); font-weight: 400; margin: 0 .8mm; }
  h4 { margin: 0 0 .8mm; font-size: 8.6pt; font-weight: 700; color: var(--navy); }

  .summary p { text-align: justify; hyphens: auto; }

  table { width: 100%; border-collapse: collapse; }
  .grid td { width: 50%; vertical-align: top; padding: 1.6mm 2.4mm; background: var(--soft); border: .5pt solid #dbe2ea; }
  .grid.comp td { padding: 1.6mm 2.4mm; }
  .grid.comp p { font-size: 7.9pt; line-height: 1.33; }
  tr, .entry, li { break-inside: avoid; }

  .entry { margin-bottom: 2mm; }
  .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; break-after: avoid; }
  .entry-head .when { white-space: nowrap; font-size: 8.4pt; font-weight: 600; color: var(--muted); }
  .lede { margin: .6mm 0 1.2mm; font-style: italic; color: var(--muted); font-size: 8.3pt; }
  .inst { color: var(--blue); font-weight: 600; font-size: 8.8pt; margin-bottom: .6mm; }
  ul { margin: 0; padding-left: 3.6mm; }
  li { margin: .5mm 0; padding-left: .6mm; }
  li::marker { color: var(--muted); font-size: 7pt; }

  .hl th, .hl td { vertical-align: top; padding: 1.3mm 2.4mm; border-bottom: .5pt solid #dbe2ea; text-align: left; }
  .hl th { width: 35%; background: var(--soft); color: var(--navy); font-weight: 700; }
  .hl tr:last-child th, .hl tr:last-child td { border-bottom: 0; }

  .nw { white-space: nowrap; }
  .page-break { break-before: page; }
  .privacy { margin-top: 3mm; font-size: 6.8pt; font-style: italic; color: var(--muted); text-align: center; }
</style>
</head>
<body>
  <header class="top">
    <div>
      <h1>${esc(cv.name)}</h1>
      ${headline.length ? `<div class="headline">${headline.map(esc).join('<span class="sep">|</span>')}</div>` : ''}
    </div>
    <div class="contact">
      ${c.location ? `<div>Location: ${esc(c.location)}</div>` : ''}
      <div>Email: ${esc(c.email)}${c.phone ? `<span class="sep">|</span>Phone: ${esc(c.phone)}` : ''}</div>
      ${c.linkedin || c.website ? `<div>${[c.linkedin && `LinkedIn: <a href="${esc(c.linkedin)}">${esc(hostSlash(c.linkedin))}</a>`, c.website && `Web: <a href="${esc(c.website)}">${esc(host(c.website))}</a>`].filter(Boolean).join('<span class="sep">|</span>')}</div>` : ''}
      ${c.language_note ? `<div>${esc(c.language_note)}${c.language_url ? ` (<a href="${esc(c.language_url)}">${esc(host(c.language_url))}</a>)` : ''}</div>` : ''}
    </div>
  </header>
${section('Professional Summary', `<p>${md(cv.summary)}</p>`, 'summary')}
${section('Certifications & Languages', twoColTable(cv.certifications, cv.languages))}
${section('Professional Experience', experience)}
${section('Technical Competencies & Domain Expertise', competencies, cv.layout?.competencies_new_page !== false ? 'page-break' : '')}
${section('Selected Technical & Safety Highlights', highlights)}
${section('Education & Academic Background', education)}
${section('Honors & Additional Experience', honors)}
  ${cv.privacy ? `<p class="privacy">${md(cv.privacy)}</p>` : ''}
</body>
</html>
`;
}

// Build for antgio90.it — content/profile.json + public/ → dist/
// Zero dependencies. Run: node build.mjs
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';

const OUT = 'dist';
const data = JSON.parse(readFileSync('content/profile.json', 'utf8'));

// ---------- helpers ----------
const esc = s => (s == null ? '' : String(s))
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function required(obj, paths, file) {
  const missing = paths.filter(p => {
    const v = p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
    return v == null || (typeof v === 'string' && !v.trim());
  });
  if (missing.length) throw new Error(`${file}: campi obbligatori vuoti → ${missing.join(', ')}`);
}

// target/rel by URL type: mailto/tel stay in page, everything else opens a new tab
const linkAttrs = url => /^(mailto|tel):/i.test(url) ? '' : ' target="_blank" rel="noopener noreferrer"';

const ICONS = {
  document: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h6"/></svg>',
  email: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>',
  globe: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg>',
  badge: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="m8 14-1 7 5-3 5 3-1-7M10 9l1.5 1.5L14 8"/></svg>',
  link: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};
const icon = name => name === 'linkedin'
  ? '<span class="icon linkedin" aria-hidden="true">in</span>'
  : `<span class="icon">${ICONS[name] || ICONS.link}</span>`;

// ---------- validation ----------
required(data, ['seo.title', 'seo.description', 'first_name', 'last_name', 'bio'], 'content/profile.json');
(data.links || []).forEach((l, i) => required(l, ['label', 'url'], `content/profile.json links[${i}]`));

// ---------- template ----------
const d = data;
const linkCard = l => `        <a class="link-card${l.highlight ? ' primary' : ''}" href="${esc(l.url)}"${linkAttrs(l.url)}>
          ${icon(l.icon)}
          <span class="link-text"><strong>${esc(l.label)}</strong>${l.description ? `<span>${esc(l.description)}</span>` : ''}</span>${l.badge ? `
          <span class="format">${esc(l.badge)}</span>` : ''}
        </a>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#203ece">
  <meta name="description" content="${esc(d.seo.description)}">
  <title>${esc(d.seo.title)}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23203ece'/%3E%3Ctext x='32' y='42' text-anchor='middle' fill='white' font-family='Arial,sans-serif' font-size='28' font-weight='700'%3EAG%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="profile" aria-labelledby="name">
    <header class="topline">
      <a class="monogram" href="./" aria-label="${esc(d.first_name)} ${esc(d.last_name)}, home">AG<span aria-hidden="true">.</span></a>
      <span class="location"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>${esc(d.location)}</span>
    </header>

    <div class="content">
      <section class="intro" aria-label="About ${esc(d.first_name)}">
        <p class="eyebrow">${esc(d.eyebrow)}</p>
        <h1 id="name">${esc(d.first_name)}<br>${esc(d.last_name)}<span class="name-dot" aria-hidden="true">.</span></h1>
        <p class="bio">${esc(d.bio)}</p>${(d.expertise || []).length ? `
        <div class="expertise" aria-label="Areas of experience">
          ${d.expertise.map(e => `<span>${esc(e)}</span>`).join('')}
        </div>` : ''}${d.certification?.title ? `
        <div class="certification">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 2.5 2.5L16 9"/></svg>
          <p><strong>${esc(d.certification.title)}</strong><span>${esc(d.certification.detail)}</span></p>
        </div>` : ''}
      </section>

      <nav class="links" aria-label="CV, profiles and contact">
${(d.links || []).map(linkCard).join('\n')}
      </nav>
    </div>
    <footer><span>${esc(d.footer?.left)}</span><span>${esc(d.footer?.right)}</span></footer>
  </main>
</body>
</html>
`;

// ---------- output ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, html);
console.log(`✔ antgio90.it → ${OUT}/index.html`);

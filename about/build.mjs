// Build for about.antgio90.it — content/*.json + public/ → dist/
// Zero dependencies. Run (from about/): node build.mjs
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';

const OUT = 'dist';
const load = f => JSON.parse(readFileSync(`content/${f}.json`, 'utf8'));
const site = load('site');
const about = load('about');
const projects = load('projects');
const photos = load('photos');

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

const ext = url => /^(mailto|tel):/i.test(url) ? '' : ' target="_blank" rel="noopener noreferrer"';
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Reads width/height from JPEG/PNG/WebP headers so <img> keeps explicit dimensions (no layout shift).
function imageSize(src) {
  const file = 'public' + (src.startsWith('/') ? src : '/' + src);
  if (!existsSync(file)) throw new Error(`Immagine non trovata: ${src} (atteso in about/${file})`);
  const b = readFileSync(file);
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = b.toString('ascii', 12, 16);
    if (fmt === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (fmt === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    if (fmt === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
const img = (src, alt, { cls = '', lazy = false } = {}) => {
  const s = imageSize(src);
  return `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}"${s ? ` width="${s[0]}" height="${s[1]}"` : ''}${lazy ? ' loading="lazy"' : ''} alt="${esc(alt)}">`;
};

const I = {
  arrow: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  email: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>',
  instagram: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
  document: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/></svg>',
  slides: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  github: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.9-2.4c3-.3 6.1-1.5 6.1-6.6a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.6 12.6 0 0 0-6.6 0C5.8.9 4.7 1.2 4.7 1.2a4.8 4.8 0 0 0-.1 3.6A5.2 5.2 0 0 0 3.2 8.4c0 5.1 3.1 6.3 6.1 6.6a3 3 0 0 0-.9 2.3V21"/></svg>',
  link: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};

// ---------- validation ----------
required(site, ['email', 'main_site_url', 'cv_url'], 'about/content/site.json');
for (const [name, p] of Object.entries({ about, projects, photos })) required(p, ['seo.title', 'seo.description', 'title'], `about/content/${name}.json`);
required(about, ['portrait', 'portrait_alt', 'intro'], 'about/content/about.json');

// ---------- layout ----------
const NAV = [['/', 'About'], ['/projects', 'Projects'], ['/photos', 'Photos']];
const layout = (page, current, main) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#203ece">
  <meta name="description" content="${esc(page.seo.description)}">
  <title>${esc(page.seo.title)}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23203ece'/%3E%3Ctext x='32' y='42' text-anchor='middle' fill='white' font-family='Arial,sans-serif' font-size='28' font-weight='700'%3EAG%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="page">
    <header class="topline">
      <a class="monogram" href="${esc(site.main_site_url)}" aria-label="Antonio Giordano, main profile">AG<span aria-hidden="true">.</span></a>
      <nav class="nav" aria-label="Sections">
${NAV.map(([href, label]) => `        <a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
        <a href="${esc(site.cv_url)}" target="_blank" rel="noopener">Resume ${I.arrow}</a>
      </nav>
    </header>

    <main>
${main}
    </main>

    <footer>
      <span>${esc(site.copyright)}</span>
      <span class="links"><a href="${esc(site.main_site_url)}">${esc(site.main_site_url.replace(/^https?:\/\//, ''))}</a><a href="mailto:${esc(site.email)}">Email</a>${site.instagram_url ? `<a href="${esc(site.instagram_url)}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ''}</span>
    </footer>
  </div>
</body>
</html>
`;

// ---------- About ----------
const timeline = items => `<ol class="timeline">
${(items || []).map(t => `            <li><span class="when">${esc(t.when)}</span><span class="what">${esc(t.what)}</span>${t.where ? `<span class="where">${esc(t.where)}</span>` : ''}${t.detail ? `<span class="detail">${esc(t.detail)}</span>` : ''}</li>`).join('\n')}
          </ol>`;

const a = about;
const aboutMain = `      <section class="hero" aria-labelledby="title">
        ${img(a.portrait, a.portrait_alt, { cls: 'portrait' })}
        <div>
          <p class="eyebrow">${esc(a.eyebrow)}</p>
          <h1 id="title">${esc(a.title)}<span class="dot">.</span></h1>
          <p class="lead">${esc(a.intro)}</p>
          <div class="chips">
            <a class="chip" href="mailto:${esc(site.email)}">${I.email}${esc(site.email)}</a>${site.instagram_url ? `
            <a class="chip" href="${esc(site.instagram_url)}" target="_blank" rel="noopener noreferrer">${I.instagram}${esc(site.instagram_handle)}</a>` : ''}
          </div>
        </div>
      </section>
${(a.background || []).length ? `
      <section aria-labelledby="background">
        <h2 id="background">Background</h2>
        <div class="prose">
${a.background.map(p => `          <p>${esc(p)}</p>`).join('\n')}
        </div>
      </section>
` : ''}
      <section class="two-col" aria-label="Experience and education">
        <div>
          <h2>Experience</h2>
          ${timeline(a.experience)}${(a.volunteering || []).length ? `
          <h2 class="sub">Volunteering</h2>
          ${timeline(a.volunteering)}` : ''}
        </div>
        <div>
          <h2>Education</h2>
          ${timeline(a.education)}${(a.honors || []).length ? `
          <h2 class="sub">Honors</h2>
          ${timeline(a.honors)}` : ''}
        </div>
      </section>
${(a.interests || []).length ? `
      <section aria-labelledby="interests">
        <h2 id="interests">Interests</h2>
        <div class="chips" style="margin-top:0">
          ${a.interests.map(i => `<span class="chip">${esc(i)}</span>`).join('')}
        </div>
      </section>` : ''}`;

// ---------- Projects ----------
const p = projects;
const card = c => `          <a class="card" href="${esc(c.url)}"${ext(c.url)}>
            <span class="tag">${I[c.icon] || I.link}${esc(c.tag)}</span>
            <h3>${esc(c.title)}</h3>
            ${c.description ? `<p>${esc(c.description)}</p>` : ''}
            <span class="meta"><span>${esc(c.meta)}</span><span class="open">Open ${I.arrow}</span></span>
          </a>`;
const projectsMain = `      <section aria-labelledby="title">
        <p class="eyebrow">${esc(p.eyebrow)}</p>
        <h1 id="title">${esc(p.title)}<span class="dot">.</span></h1>
        ${p.intro ? `<p class="lead">${esc(p.intro)}</p>` : ''}
      </section>
${(p.sections || []).map(s => {
  const id = s.anchor || slug(s.title);
  return `
      <section aria-labelledby="${esc(id)}">
        <h2 id="${esc(id)}">${esc(s.title)}</h2>
        <div class="cards">
${(s.cards || []).map(card).join('\n')}
        </div>
      </section>`;
}).join('\n')}`;

// ---------- Photos ----------
const ph = photos;
const shot = (x, lazy = false) => `<figure class="shot"><a href="${esc(x.image)}">${img(x.image, x.alt || x.caption || '', { lazy })}</a>${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ''}</figure>`;
const photosMain = `      <section aria-labelledby="title">
        <p class="eyebrow">${esc(ph.eyebrow)}</p>
        <h1 id="title">${esc(ph.title)}<span class="dot">.</span></h1>
      </section>

      <section aria-label="Gallery" style="border-top:0;padding-top:28px">${ph.banner?.image ? `
        <div class="banner">
          ${shot(ph.banner)}
        </div>` : ''}
        <div class="gallery">
${(ph.gallery || []).filter(x => x.image).map(x => `          ${shot(x, true)}`).join('\n')}
        </div>
      </section>`;

// ---------- output ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, layout(a, '/', aboutMain));
writeFileSync(`${OUT}/projects.html`, layout(p, '/projects', projectsMain));
writeFileSync(`${OUT}/photos.html`, layout(ph, '/photos', photosMain));
console.log(`✔ about.antgio90.it → ${OUT}/{index,projects,photos}.html`);

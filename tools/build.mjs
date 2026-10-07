#!/usr/bin/env node
/* ==========================================================================
   ELDOVANT — build
   Reads eldovant-data.js (the only file you edit) and writes everything a
   crawler or a social scraper needs without running JavaScript:

     · one page per visible title, EN + IT   (en/productions/<slug>/, it/produzioni/<slug>/)
     · title, canonical, hreflang, Open Graph, Twitter and JSON-LD on every page
     · sitemap.xml and robots.txt

   Zero dependencies. Run:  node tools/build.mjs        (add --check to only validate)
   The GitHub Action in .github/workflows/build.yml runs it on every push that
   touches the data or the artwork, and commits the result.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.eldovant.com';
const CHECK = process.argv.includes('--check');
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- data ---------- */
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'eldovant-data.js'), 'utf8'), ctx, { filename: 'eldovant-data.js' });
const D = ctx.window.ELDOVANT_DATA || {};

const slug = (x) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const STAGES = (D.stages || []).filter(Boolean);
const ALIAS = {};
STAGES.forEach((s) => { ALIAS[slug(s.id)] = s.id; (s.aliases || []).forEach((a) => (ALIAS[slug(a)] = s.id)); });
const PATH = STAGES.filter((s) => s.path !== false).map((s) => s.id);
const norm = (x) => ALIAS[slug(x)] || null;
const T = (v, l) => (v && typeof v === 'object' ? (v[l] ?? v.en ?? '') : v == null ? '' : String(v));
const stageName = (id, l) => T((STAGES.find((s) => s.id === id) || {}).name, l);
const stageNote = (id, l) => T((STAGES.find((s) => s.id === id) || {}).note, l);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso, l) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return isNaN(d) ? '' : d.toLocaleDateString(l === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/* ---------- validation ---------- */
const errors = [], warns = [];
const all = (D.productions || []).filter((p) => p && p.title);
const slugs = new Set();
all.forEach((p) => {
  const id = `“${p.title}”`;
  const st = norm(p.status);
  if (!st) errors.push(`${id}: status “${p.status}” is not one of: ${STAGES.map((s) => s.id).join(', ')}`);
  if (p.visible === false) return;
  if (p.page !== false) {
    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) errors.push(`${id}: needs a slug (lowercase letters, digits, hyphens) to get a page — or set page:false`);
    else if (slugs.has(p.slug)) errors.push(`${id}: slug “${p.slug}” is used twice`);
    else slugs.add(p.slug);
  }
  ['image', 'poster', 'og'].forEach((k) => {
    if (p[k] && !/^https?:/i.test(p[k]) && !fs.existsSync(path.join(ROOT, p[k]))) errors.push(`${id}: ${k} file not found: ${p[k]}`);
  });
  if (!p.og) warns.push(`${id}: no og image — social previews will use the brand image`);
  if (!p.logline) warns.push(`${id}: no logline`);
  if (p.logline && typeof p.logline === 'object' && !(p.logline.en && p.logline.it)) warns.push(`${id}: logline is missing a language`);
  if (!p.imageAlt) warns.push(`${id}: no imageAlt`);
  if (p.artStatus && st && norm(p.artStatus) !== st) warns.push(`${id}: status is now “${st}” but the artwork was made for “${norm(p.artStatus)}” — swap poster / image / og, then update artStatus`);
  if (st === 'released' && !p.watchUrl) warns.push(`${id}: released but no watchUrl — no Watch button will show`);
  if (p.trailer && p.trailer.type === 'youtube' && !/^[\w-]{6,20}$/.test(p.trailer.id || '')) errors.push(`${id}: trailer.id is not a valid YouTube id`);
});
if (!STAGES.length) errors.push('stages: missing in eldovant-data.js');
const feat = all.filter((p) => p.visible !== false && p.featured);
if (feat.length > 1) warns.push(`more than one featured title (${feat.map((p) => p.title).join(', ')}) — the first is used`);

const PR = all.filter((p) => p.visible !== false);
const withPage = PR.filter((p) => p.page !== false && p.slug);
const featured = PR.filter((p) => p.featured)[0] || PR[0] || null;

warns.forEach((w) => console.warn('  ! ' + w));
if (errors.length) { errors.forEach((e) => console.error('  ✗ ' + e)); console.error(`\nBuild stopped: ${errors.length} error(s).`); process.exit(1); }
if (CHECK) { console.log(`OK — ${PR.length} title(s), ${withPage.length} page(s), ${warns.length} warning(s).`); process.exit(0); }

/* ---------- site map of pages ---------- */
const LANG = {
  en: {
    dir: 'en', prod: 'productions', locale: 'en_US',
    pages: { home: '', productions: 'productions/', studio: 'studio/', contact: 'contact/', privacy: 'privacy-policy/', cookies: 'cookie-policy/', terms: 'terms-of-service/' },
    ui: { all: 'All productions', format: 'Format', status: 'Status', announced: 'Announced', production: 'Production', film: 'The film', path: 'The path', pathLead: 'Light marks the stage this title has reached. What came before is developed; what comes next is not yet revealed.', pathH: 'Where it stands.', pathLabel: 'Production path', credits: 'Credits', announcement: 'Announcement', contactH: 'Licensing, distribution, collaboration.', contactP: 'Start on the contact page.', contactCta: 'Contact ELDOVANT', watch: 'Watch', teaser: 'Watch the teaser', poster: 'Poster', note: 'A “Watch” link appears only on a released title. Announcing a title does not mean it can be seen.', crumb: 'Productions' },
  },
  it: {
    dir: 'it', prod: 'produzioni', locale: 'it_IT',
    pages: { home: '', productions: 'produzioni/', studio: 'studio/', contact: 'contatti/', privacy: 'informativa-privacy/', cookies: 'informativa-cookie/', terms: 'termini-di-servizio/' },
    ui: { all: 'Tutte le produzioni', format: 'Formato', status: 'Stato', announced: 'Annunciato', production: 'Produzione', film: 'Il film', path: 'Il percorso', pathLead: 'La luce segna la fase raggiunta da questo titolo. Ciò che è stato è sviluppato; ciò che verrà non è ancora rivelato.', pathH: 'A che punto è.', pathLabel: 'Percorso di produzione', credits: 'Crediti', announcement: 'Annuncio', contactH: 'Licenze, distribuzione, collaborazione.', contactP: 'Si parte dalla pagina Contatti.', contactCta: 'Contatta ELDOVANT', watch: 'Guarda', teaser: 'Guarda il teaser', poster: 'Locandina', note: 'Un link “Guarda” compare solo su un titolo pubblicato. Annunciare un titolo non significa che possa essere visto.', crumb: 'Produzioni' },
  },
};
const OTHER = { en: 'it', it: 'en' };
const url = (l, key, extra = '') => `${SITE}/${LANG[l].dir}/${LANG[l].pages[key]}${extra}`;
const abs = (p) => (p ? (/^https?:/i.test(p) ? p : `${SITE}/${String(p).replace(/^\/+/, '')}`) : '');
const BRAND_OG = 'assets/og-brand.jpg';
const brandOg = fs.existsSync(path.join(ROOT, BRAND_OG));
const ogFor = (p) => (p && p.og ? p.og : brandOg ? BRAND_OG : '');
const ogDims = (rel) => {
  try {
    const b = fs.readFileSync(path.join(ROOT, rel));
    if (b[0] === 0xff) { let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } }
    if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch { /* ignore */ }
  return null;
};
const sameAs = (D.social || []).map((s) => s.href).filter((h) => /^https?:/i.test(h || ''));

/* ---------- head: SEO block between markers ---------- */
const brandFirst = (s) => { const m = /^(.+?)\s+[—–-]\s+ELDOVANT$/.exec(String(s)); return m ? `ELDOVANT — ${m[1]}` : s; };
const S0 = '<!-- build:seo:start -->', S1 = '<!-- build:seo:end -->';
function seoBlock({ l, title: rawTitle, desc, canonical, alts, ogImage, ogAlt, type = 'website', jsonld = [] }) {
  const L = LANG[l];
  const title = brandFirst(rawTitle);
  const out = [S0];
  out.push(`<link rel="canonical" href="${esc(canonical)}">`);
  alts.forEach(([hl, href]) => out.push(`<link rel="alternate" hreflang="${hl}" href="${esc(href)}">`));
  out.push(`<meta property="og:type" content="${type}">`, '<meta property="og:site_name" content="ELDOVANT">',
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`, `<meta property="og:locale" content="${L.locale}">`,
    `<meta property="og:locale:alternate" content="${LANG[OTHER[l]].locale}">`);
  if (ogImage) {
    out.push(`<meta property="og:image" content="${esc(abs(ogImage))}">`);
    const dim = ogDims(ogImage); if (dim) out.push(`<meta property="og:image:width" content="${dim[0]}">`, `<meta property="og:image:height" content="${dim[1]}">`);
    if (ogAlt) out.push(`<meta property="og:image:alt" content="${esc(ogAlt)}">`);
  }
  out.push('<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(desc)}">`);
  if (ogImage) { out.push(`<meta name="twitter:image" content="${esc(abs(ogImage))}">`); if (ogAlt) out.push(`<meta name="twitter:image:alt" content="${esc(ogAlt)}">`); }
  jsonld.forEach((o) => out.push(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`));
  out.push(S1);
  return out.join('\n');
}
function stripHead(html) {
  // remove what the seo block re-declares (our own earlier block, plus hand-written og/canonical/hreflang)
  html = html.replace(new RegExp(`${S0}[\\s\\S]*?${S1}\\n?`), '');
  html = html.replace(/<link rel="canonical"[^>]*>\n?/g, '').replace(/<link rel="alternate" hreflang[^>]*>\n?/g, '').replace(/<meta property="og:[^>]*>\n?/g, '').replace(/<meta name="twitter:[^>]*>\n?/g, '');
  return html;
}
function setHead(html, { title, desc, seo }) {
  html = stripHead(html);
  if (title != null) html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(brandFirst(title))}</title>`);
  if (desc != null) html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  return html.replace('<meta name="color-scheme"', `${seo}\n<meta name="color-scheme"`);
}
const getTitle = (h) => (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'ELDOVANT';
const getDesc = (h) => ((h.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const decode = (s) => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const orgLd = { '@context': 'https://schema.org', '@type': 'Organization', name: 'ELDOVANT', url: SITE + '/', logo: `${SITE}/apple-touch-icon.png`, slogan: 'Original Motion Pictures & Music', ...(sameAs.length ? { sameAs } : {}) };
const siteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ELDOVANT', alternateName: ['Eldovant', 'ELDOVANT Original Motion Pictures & Music'], url: SITE + '/', inLanguage: ['en', 'it'] };

/* ---------- existing pages: SEO block ---------- */
const written = [];
function write(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content) { fs.writeFileSync(p, content); written.push(rel); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

for (const l of ['en', 'it']) {
  const L = LANG[l];
  for (const [key, seg] of Object.entries(L.pages)) {
    const rel = `${L.dir}/${seg}index.html`;
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    let html = read(rel);
    const title = decode(getTitle(html)), desc = decode(getDesc(html));
    const og = key === 'home' || key === 'productions' ? ogFor(featured) : brandOg ? BRAND_OG : ogFor(featured);
    const ld = key === 'home' ? [orgLd, siteLd] : [orgLd];
    if (key !== 'home') {
      const crumbName = key === 'productions' ? LANG[l].ui.crumb : title.replace(/\s+[—–-]\s+ELDOVANT$/, '').replace(/^ELDOVANT\s+[—–-]\s+/, '');
      ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ELDOVANT', item: url(l, 'home') },
        { '@type': 'ListItem', position: 2, name: crumbName, item: url(l, key) }] });
    }
    if (key === 'productions' && withPage.length) {
      ld.push({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(l, 'productions'), inLanguage: l,
        mainEntity: { '@type': 'ItemList', itemListElement: withPage.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: url(l, 'productions', `${p.slug}/`), name: p.title })) } });
    }
    const seo = seoBlock({
      l, title, desc, canonical: url(l, key),
      alts: [['en', url('en', key)], ['it', url('it', key)], ['x-default', SITE + '/']],
      ogImage: og, ogAlt: og === ogFor(featured) && featured ? T(featured.imageAlt, l) : '', jsonld: ld,
    });
    write(rel, setHead(html, { seo, title }));
  }
}

/* ---------- root: the language entry point (x-default) ---------- */
{
  let html = read('index.html');
  const title = decode(getTitle(html)), desc = decode(getDesc(html));
  const og = brandOg ? BRAND_OG : ogFor(featured);
  const seo = seoBlock({
    l: 'en', title, desc, canonical: SITE + '/',
    alts: [['en', url('en', 'home')], ['it', url('it', 'home')], ['x-default', SITE + '/']],
    ogImage: og, ogAlt: '', jsonld: [orgLd, siteLd],
  });
  write('index.html', setHead(html, { seo }));
}

/* ---------- title pages ---------- */
function stagesHtml(status, l) {
  const id = norm(status), arch = id === 'archived', idx = PATH.indexOf(id);
  const ui = l === 'it' ? { current: 'Fase attuale', done: 'Completata', ahead: 'Non ancora raggiunta', archived: 'Archiviato' } : { current: 'Current stage', done: 'Completed', ahead: 'Not yet reached', archived: 'Archived' };
  const cols = PATH.map((_, i) => (!arch && i === idx ? '1.75fr' : '1fr')).join(' ');
  const items = PATH.map((sid, i) => {
    const st = arch ? 'past' : idx < 0 ? 'idle' : i < idx ? 'past' : i === idx ? 'current' : 'future';
    const state = st === 'current' ? ui.current : st === 'past' ? (arch ? ui.archived : ui.done) : st === 'future' ? ui.ahead : '';
    return `<li class="stg-i is-${st}" data-stage="${sid}" style="--i:${i}"${st === 'current' ? ' aria-current="step"' : ''}><span class="stg-state">${esc(state)}</span><span class="stg-streak" aria-hidden="true"></span><span class="stg-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="stg-name">${esc(stageName(sid, l))}</span><p class="stg-note">${esc(stageNote(sid, l))}</p></li>`;
  }).join('');
  return `<ol class="stg in" data-variant="wide" data-notes="all" aria-label="${esc(LANG[l].ui.pathLabel)}" data-status="${id || ''}" style="--cols:${cols}">${items}</ol>`;
}

function annLinks(p, l) {
  const list = ((p.announcement || {}).urls || []).map((u) => (typeof u === 'string' ? { url: u } : u)).filter((u) => u && /^https?:/i.test(u.url || ''));
  if (!list.length) return '';
  const name = (u) => esc(u.label ? T(u.label, l) : ({ 'x.com': 'X', 'twitter.com': 'X', 'instagram.com': 'Instagram', 'tiktok.com': 'TikTok', 'youtube.com': 'YouTube', 'youtu.be': 'YouTube' }[new URL(u.url).hostname.replace(/^(www|m)\./, '')] || new URL(u.url).hostname));
  return `<div class="pj-ann"><h3>${esc(LANG[l].ui.announcement)}</h3><p>${list.map((u) => `<a class="tlink" href="${esc(u.url)}" target="_blank" rel="noopener noreferrer">${name(u)}</a>`).join('')}</p></div>`;
}

const dur = (x) => { const m = /^PT(?:(\d+)M)?(?:(\d+)S)?$/.exec(x || ''); if (!m || (!m[1] && !m[2])) return ''; const sec = +m[2] || 0; return `${+m[1] || 0}:${sec < 10 ? '0' : ''}${sec}`; };
function projectMain(p, l) {
  const U = LANG[l].ui, st = norm(p.status) || 'announced';
  const fmt = ((D.formats || []).find((f) => f.id === p.format) || {}).name;
  const fmtName = T(fmt, l) || ({ short: l === 'it' ? 'Cortometraggio' : 'Short film', feature: l === 'it' ? 'Lungometraggio' : 'Feature film' }[p.format] || '');
  const prodCredit = (p.credits || []).find((c) => /production|produzione/i.test(T(c.role, 'en') + T(c.role, 'it')));
  const t = p.trailer && p.trailer.type === 'youtube' && /^[\w-]{6,20}$/.test(p.trailer.id || '') ? p.trailer : null;
  const img = p.image ? '../../../' + p.image : '';
  const poster = p.poster ? '../../../' + p.poster : '';
  const credits = (p.credits || []).filter((c) => c && c.name);
  const people = (p.people || []).filter((c) => c && c.name);
  const watch = st === 'released' && /^https?:/i.test(p.watchUrl || '') ? `<a class="cta" href="${esc(p.watchUrl)}" target="_blank" rel="noopener noreferrer"><span>${U.watch}</span></a>` : '';
  const teaser = t ? `<a class="cta${watch ? ' ghost' : ''}" id="pjPlay" href="https://www.youtube.com/watch?v=${t.id}" target="_blank" rel="noopener noreferrer"><span>${esc(T(t.label, l) || U.teaser)}</span>${dur(t.duration) ? `<em class="cta-meta">${dur(t.duration)}</em>` : ''}</a>` : '';
  const dt = p.announcedAt ? fmtDate(p.announcedAt, l) : '';
  return `<main id="main">
<!-- build:project:start -->
<section class="pd-hero" id="opening" data-scene="flow" aria-labelledby="h1">
  <div class="pd-screen${img ? '' : ' is-empty'}" id="pdScreen">
    <div class="pd-media" id="pdMedia" aria-hidden="true">${img ? `<img src="${esc(img)}" alt="" decoding="async"${p.imagePosition ? ` style="object-position:${esc(String(p.imagePosition).replace(/[^0-9% .a-z-]/gi, ''))}"` : ''}>` : ''}</div>
    <div class="pd-slit" aria-hidden="true"></div>
    <div class="pd-ui">
      <h1 class="display" id="h1">${esc(p.title)}</h1>
      <div class="pd-side" id="pdSide"><span class="pill" id="pjPill" data-status="${st}">${esc(stageName(st, l))}</span>${p.tagline ? `<p>${esc(T(p.tagline, l))}</p>` : ''}</div>
    </div>
  </div>
  <dl class="pd-strip">
    <div><dt>${U.format}</dt><dd>${esc(fmtName || '—')}</dd></div>
    <div><dt>${U.status}</dt><dd id="pjStat">${esc(stageName(st, l))}</dd></div>
    <div><dt>${U.announced}</dt><dd>${esc(dt || '—')}</dd></div>
    <div><dt>${U.production}</dt><dd>${esc(prodCredit ? prodCredit.name : 'ELDOVANT')}</dd></div>
  </dl>
</section>
<section class="pd-sec pj-film" id="pjFilm" data-scene="flow" aria-labelledby="filmH">
  <div class="wrap pj-grid">
    ${poster ? `<figure class="pj-poster" id="pjPoster"><img src="${esc(poster)}" alt="${esc(T(p.imageAlt, l))}" loading="lazy" decoding="async"></figure>` : ''}
    <div class="pj-text">
      <h2 class="display wipe" id="filmH">${U.film}</h2>
      ${p.logline ? `<p class="pj-lead">${esc(T(p.logline, l))}</p>` : ''}
      ${p.synopsis ? `<p class="pj-syn">${esc(T(p.synopsis, l))}</p>` : ''}
      ${teaser || watch ? `<div class="pj-actions">${watch}${teaser}</div>` : ''}
      ${credits.length || people.length ? `<dl class="tt-credits pj-credits">${credits.map((c) => `<div><dt>${esc(T(c.role, l))}</dt><dd>${esc(c.name)}</dd></div>`).join('')}${people.map((c) => `<div><dt>${esc(T(c.role, l))}</dt><dd>${esc(c.name)}</dd></div>`).join('')}</dl>` : ''}
      ${annLinks(p, l)}
      <p class="pj-back"><a class="tlink" href="../">${U.all}</a></p>
    </div>
  </div>
</section>
<section class="pd-sec pd-legend pd-path" id="status" data-scene="flow" aria-labelledby="statH">
  <div class="wrap">
    <div class="pd-head">
      <h2 class="display wipe" id="statH">${U.pathH}</h2>
      <p class="st-lead">${U.pathLead}</p>
    </div>
    <div class="stg-host" id="pjStages">${stagesHtml(st, l)}</div>
    <p class="lg-note">${U.note}</p>
  </div>
</section>
<section class="contact" id="contact" data-scene="flow" aria-labelledby="contactH">
  <div class="close-line" aria-hidden="true"></div>
  <h2 class="display" id="contactH">${U.contactH}</h2>
  <p>${U.contactP}</p>
  <a class="cta" data-route="contact" href="../../../${LANG[l].dir}/${LANG[l].pages.contact}"><span>${U.contactCta}</span></a>
</section>
<!-- build:project:end -->
</main>`;
}

function projectScript(p, l) {
  const U = LANG[l].ui;
  return `/* ==========================================================================
   Title page — everything below is driven by eldovant-data.js (status, texts, images).
   The static HTML was written by tools/build.mjs; this keeps it in step with the data.
   ========================================================================== */
var S=window.ELDStages, T=S.T, SLUG=${JSON.stringify(p.slug)};
var P=(CFG.productions||[]).filter(function(x){return x&&x.slug===SLUG})[0];
(function(){
  var host=$('#pjStages'); if(!host||!P) return;
  var st=S.norm(P.status)||'announced';
  var pill=$('#pjPill'), stat=$('#pjStat');
  if(pill){ pill.setAttribute('data-status',st); pill.textContent=S.label(st); }
  if(stat) stat.textContent=S.label(st);
  var ol=host.querySelector('.stg');
  if(ol){ S.update(ol,st); ol.classList.add('in'); } else S.mount(host,st,{variant:'wide',notes:'all'});
  var btn=$('#pjPlay'), box=$('#pjPoster'), t=P.trailer||{};
  if(btn&&box&&t.type==='youtube'&&/^[\\w-]{6,20}$/.test(t.id||'')){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      ELDPlayer.play(box,{id:t.id,title:(t.title||P.title)+' \u2014 trailer'});
      box.classList.add('is-playing');
      box.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});
    });
  }
})();

`;
}

function buildProject(p, l) {
  const L = LANG[l], O = LANG[OTHER[l]], U = L.ui;
  let html = read(`${L.dir}/${L.prod}/index.html`);
  html = stripHead(html);
  html = html.replace(/\.\.\/\.\.\//g, '../../../');
  html = html.replace(/(id="btnLang" href=")[^"]*(")/, `$1../../../${O.dir}/${O.prod}/${p.slug}/$2`);
  const title = `${p.title} — ELDOVANT`;
  const desc = T(p.logline, l) || T(p.tagline, l) || title;
  const canonical = url(l, 'productions', `${p.slug}/`);
  const st = norm(p.status) || 'announced';
  const vid = p.trailer && p.trailer.type === 'youtube' && /^[\w-]{6,20}$/.test(p.trailer.id || '') ? p.trailer : null;
  const ogImg = ogFor(p);
  const movie = {
    '@context': 'https://schema.org', '@type': 'Movie', name: p.title, description: desc, url: canonical, inLanguage: l,
    ...(p.tagline ? { alternativeHeadline: T(p.tagline, l) } : {}),
    image: [abs(p.og || p.image || p.poster)].filter(Boolean),
    creativeWorkStatus: stageName(st, 'en'),
    productionCompany: { '@type': 'Organization', name: 'ELDOVANT', url: SITE + '/' },
    ...(st === 'released' && p.year ? { datePublished: String(p.year) } : {}),
    ...(p.announcedAt ? { dateCreated: p.announcedAt } : {}),
    ...(vid ? { trailer: { '@type': 'VideoObject', name: vid.title || `${p.title} — Official Announcement`, description: desc, thumbnailUrl: [abs(p.og || p.image)].filter(Boolean), uploadDate: (p.announcement || {}).date || p.announcedAt || TODAY, ...(vid.duration ? { duration: vid.duration } : {}), embedUrl: `https://www.youtube.com/embed/${vid.id}` } } : {}),
  };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ELDOVANT', item: url(l, 'home') },
    { '@type': 'ListItem', position: 2, name: U.crumb, item: url(l, 'productions') },
    { '@type': 'ListItem', position: 3, name: p.title, item: canonical }] };
  const seo = seoBlock({
    l, title, desc, canonical,
    alts: [['en', url('en', 'productions', `${p.slug}/`)], ['it', url('it', 'productions', `${p.slug}/`)], ['x-default', SITE + '/']],
    ogImage: ogImg, ogAlt: T(p.imageAlt, l), type: 'video.movie', jsonld: [orgLd, movie, crumbs],
  });
  html = setHead(html, { title, desc, seo });
  html = html.replace('</head>', '<link rel="stylesheet" href="../../../eldovant-project.css">\n</head>');
  // body: main + no title-card dialog on a title page
  html = html.replace(/<main id="main">[\s\S]*?<\/main>/, () => projectMain(p, l));
  html = html.replace(/<!-- Title card dialog -->\s*<dialog class="tt"[\s\S]*?<\/dialog>\s*/, '');
  // chapters
  const chap = [['opening', p.title], ['pjFilm', U.film], ['status', U.path], ['contact', l === 'it' ? 'Contatti' : 'Contact']];
  html = html.replace(/var CHAPTERS=\[[\s\S]*?\];/, () => `var CHAPTERS=${JSON.stringify(chap.map(([id, name]) => ({ id, name })))};`);
  // slate script -> title script
  const a = html.indexOf('/* ==========================================================================\n   The slate'), b = html.indexOf('/* ---------- theme ---------- */');
  if (a < 0 || b < 0) throw new Error('productions template changed: slate script markers not found');
  html = html.slice(0, a) + projectScript(p, l) + html.slice(b);
  return html;
}

const keep = new Set();
for (const p of withPage) for (const l of ['en', 'it']) {
  const rel = `${LANG[l].dir}/${LANG[l].prod}/${p.slug}/index.html`;
  keep.add(rel); write(rel, buildProject(p, l));
}
// remove title pages whose title no longer exists (only inside generated folders that carry our marker)
for (const l of ['en', 'it']) {
  const base = path.join(ROOT, LANG[l].dir, LANG[l].prod);
  for (const d of fs.readdirSync(base, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const rel = `${LANG[l].dir}/${LANG[l].prod}/${d.name}/index.html`;
    const f = path.join(ROOT, rel);
    if (fs.existsSync(f) && !keep.has(rel) && fs.readFileSync(f, 'utf8').includes('<!-- build:project:start -->')) { fs.rmSync(path.dirname(f), { recursive: true }); written.push(`${rel} (removed)`); }
  }
}

/* ---------- sitemap + robots ---------- */
const entries = [];
for (const key of Object.keys(LANG.en.pages)) entries.push({ en: url('en', key), it: url('it', key), freq: key === 'home' ? 'weekly' : 'monthly', pri: key === 'home' ? '1.0' : key === 'productions' ? '0.9' : '0.6' });
for (const p of withPage) entries.push({ en: url('en', 'productions', `${p.slug}/`), it: url('it', 'productions', `${p.slug}/`), freq: 'weekly', pri: '0.8', last: p.announcedAt });
const urlset = entries.flatMap((e) => ['en', 'it'].map((l) => `  <url>
    <loc>${e[l]}</loc>
    <lastmod>${e.last && e.last > '2000' ? e.last : TODAY}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.pri}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${e.en}"/>
    <xhtml:link rel="alternate" hreflang="it" href="${e.it}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>
  </url>`)).join('\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlset}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`Built: ${PR.length} title(s), ${withPage.length} title page(s) × 2 languages, ${entries.length * 2} sitemap URLs.`);
console.log(written.length ? 'Changed:\n  ' + written.join('\n  ') : 'No file changed.');

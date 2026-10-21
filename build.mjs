// Build: src/*.html  ->  index.html, awards.html (English, default)  +  hi/index.html, hi/awards.html (Hindi)
//        assets/style.css, assets/main.js  ->  minified, content-hashed copies
//        plus sitemap.xml, robots.txt, site.webmanifest, _headers
//
// Run:  npm run build
//
// Edit src/*.html (bilingual: Hindi text + data-en="English"), assets/style.css, assets/main.js — never the generated files.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import esbuild from 'esbuild';
import postcss from 'postcss';

// Production root of this site (no trailing slash). The site is served from a sub-path of timeslanguages.in.
const SITE = 'https://timeslanguages.in/nbtvasudha';
const SITE_PATH = new URL(SITE).pathname.replace(/\/$/, '');   // '/nbtvasudha'

const NAME_EN = 'NBT Vasudha Summit & Awards 2027';
const NAME_HI = 'NBT वसुधा समिट एवं अवॉर्ड्स 2027';
const ORG_URL = 'https://timeslanguages.in';
const NBT_URL = 'https://navbharattimes.indiatimes.com/';
const PHONE = '+91-9971129087';
const EMAIL = 'deepika.pawar@timesinternet.in';

// ---------------------------------------------------------------- assets
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8);
for (const f of readdirSync('assets')) if (/^(style|main)\.[0-9a-f]{8}\.(css|js)$/.test(f)) unlinkSync('assets/' + f);
const mini = (code, loader, target) => esbuild.transformSync(code, { loader, minify: true, target }).code;
const CSS_TARGET = ['chrome90', 'firefox90', 'safari14', 'ios14'];

// ---- split style.css into "critical" (inlined in <head>, above the fold) and "rest" (loaded without blocking render)
const CRIT_CLASS = /\.(site-header|progress|bar|brands|nav|lang|menu-btn|btn|magnetic|hero[\w-]*|aurora|a[1-4]|mesh|beams|presents|pulse|tagline|countdown|cd-[\w]+|live-chip|facts|scroll-cue|globe|trophy|bubble|xl|twinkle|skip|wrap|reveal|in-view|grad|shine|line|sapling|land|rays|shine-bar|scrolled|open|cta|pagelink|active|sep|nbt|til|gold|ghost|green|no-js|pending)(?![\w-])/;
const CRIT_TAGS = new Set(['*', 'html', 'body', 'h1', 'h2', 'h3', 'p', 'a', 'img', 'main', ':root']);
function selectorIsCritical(sel) {
  if (CRIT_CLASS.test(sel) || /^(:root|::selection|:focus-visible|html\b[^.#]*$)/.test(sel.trim())) return true;
  const bare = sel.replace(/\[[^\]]*\]/g, '').replace(/::?[\w-]+(\([^)]*\))?/g, '').trim();
  if (/[.#]/.test(bare)) return false;
  const parts = bare.split(/[\s>+~]+/).filter(Boolean);
  return parts.length > 0 && parts.every((t) => CRIT_TAGS.has(t));
}
function splitCss(source) {
  const root = postcss.parse(source);
  const crit = postcss.root(), rest = postcss.root(), fonts = postcss.root();
  const isCritRule = (r) => r.selectors.some(selectorIsCritical);
  const kf = [];
  root.each((node) => {
    if (node.type === 'comment') return;
    if (node.type === 'rule') (isCritRule(node) ? crit : rest).append(node.clone());
    else if (node.type === 'atrule') {
      if (node.name === 'font-face') fonts.append(node.clone());
      else if (node.name === 'property') crit.append(node.clone());
      else if (node.name === 'keyframes') kf.push(node);
      else if (node.name === 'media' || node.name === 'supports') {
        const c = node.clone({ nodes: [] }), r = node.clone({ nodes: [] });
        node.each((ch) => { if (ch.type === 'rule') (isCritRule(ch) ? c : r).append(ch.clone()); else if (ch.type !== 'comment') r.append(ch.clone()); });
        if (c.nodes.length) crit.append(c);
        if (r.nodes.length) rest.append(r);
      } else rest.append(node.clone());
    }
  });
  const critText = crit.toString();
  for (const k of kf) (new RegExp(`animation(-name)?:[^;{}]*\\b${k.params}\\b`).test(critText) ? crit : rest).append(k.clone());
  return { crit: crit.toString(), rest: rest.toString(), fonts: fonts.toString() };
}
const { crit: CRIT_RAW, rest: REST_RAW, fonts: FONT_RAW } = splitCss(readFileSync('assets/style.css', 'utf8'));
const critCss = mini(CRIT_RAW, 'css', CSS_TARGET), restCss = mini(REST_RAW, 'css', CSS_TARGET);
const fontCssBase = mini(FONT_RAW, 'css', CSS_TARGET);
// Fonts are applied after first paint: first visit = system fonts (no FCP/LCP/CLS cost), repeat visits = brand fonts from frame 1.
const fontCssFor = (R, display) => fontCssBase.replace(/font-display:\w+/g, `font-display:${display}`).replace(/url\((['"]?)fonts\//g, `url($1${R}assets/fonts/`);
const js = mini(readFileSync('assets/main.js', 'utf8'), 'js', ['chrome80', 'firefox78', 'safari13', 'ios13']);
const CSS_FILE = `style.${hash(restCss)}.css`, JS_FILE = `main.${hash(js)}.js`;
writeFileSync('assets/' + CSS_FILE, restCss);
writeFileSync('assets/' + JS_FILE, js);
const CFG = 'config.js?v=' + hash(readFileSync('assets/config.js', 'utf8'));

const FAVICON_SVG = readFileSync('assets/img/favicon.svg', 'utf8').trim().replace(/\s+/g, ' ');
const b64 = (f) => 'data:image/webp;base64,' + readFileSync(f).toString('base64');
const LOGO_NBT = b64('assets/img/nbt-s.webp'), LOGO_TIL = b64('assets/img/til-s.webp');

// ---------------------------------------------------------------- page metadata
const PAGES = {
  index: {
    file: 'index.html',
    og: 'og-summit.jpg',
    hi: {
      title: 'NBT वसुधा समिट 2027 | 13 फ़रवरी, भारत मंडपम, नई दिल्ली',
      desc: 'NBT वसुधा समिट 2027: नेट ज़ीरो, प्राकृतिक पूँजी, नीति और भाषा के सेतु पर पाँच संवाद, एक दिन। 13 फ़रवरी 2027, भारत मंडपम, नई दिल्ली। डेलीगेट पास ₹999 से।',
      ogAlt: 'NBT वसुधा समिट 2027 — 13 फ़रवरी 2027, भारत मंडपम, नई दिल्ली',
    },
    en: {
      title: 'NBT Vasudha Summit 2027 | 13 Feb, Bharat Mandapam, New Delhi',
      desc: 'NBT Vasudha Summit 2027: five conversations on net zero, natural capital, policy and the language bridge. 13 Feb 2027, Bharat Mandapam, New Delhi. Passes from ₹999.',
      ogAlt: 'NBT Vasudha Summit 2027 — 13 February 2027, Bharat Mandapam, New Delhi',
    },
  },
  awards: {
    file: 'awards.html',
    og: 'og-awards.jpg',
    hi: {
      title: 'NBT वसुधा अवॉर्ड्स 2027 | 48 श्रेणियाँ — नामांकन खुले',
      desc: 'NBT वसुधा अवॉर्ड्स 2027 — संकल्प से प्रभाव तक। 8 ज़िम्मेदार विकास स्तंभों में 48 सस्टेनेबिलिटी अवॉर्ड श्रेणियाँ। नामांकन 10 जनवरी 2027 तक। प्लान ₹9,999 + GST से।',
      ogAlt: 'NBT वसुधा अवॉर्ड्स 2027 — संकल्प से प्रभाव तक',
    },
    en: {
      title: 'NBT Vasudha Awards 2027 | 48 Sustainability Categories — Nominations Open',
      desc: 'NBT Vasudha Awards 2027 — Sankalp Se Prabhao Tak. 48 sustainability award categories across 8 pillars. Nominations close 10 Jan 2027. Plans from ₹9,999 + GST.',
      ogAlt: 'NBT Vasudha Awards 2027 — Sankalp Se Prabhao Tak',
    },
  },
};

// ---------------------------------------------------------------- html helpers
const decodeAttr = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const fixAmp = (s) => s.replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, '&amp;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/\s+/g, ' ').trim();

function findClose(html, from, tag) {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return m.index;
  }
  throw new Error('unclosed <' + tag + '> after ' + from);
}

function toEnglish(html) {
  const re = /<([a-z0-9]+)\b([^>]*?)\sdata-en="([^"]*)"([^>]*)>/g;
  let out = '', pos = 0, m;
  while ((m = re.exec(html))) {
    if (m.index < pos) continue;
    const close = findClose(html, m.index + m[0].length, m[1]);
    out += html.slice(pos, m.index) + `<${m[1]}${m[2]}${m[4]}>` + fixAmp(decodeAttr(m[3]));
    pos = close; re.lastIndex = close;
  }
  out += html.slice(pos);
  // placeholders and links
  out = out.replace(/<([a-z0-9]+)\b([^>]*?)>/g, (tag, name, attrs) => {
    if (!/data-en-(placeholder|href)=/.test(attrs)) return tag;
    const ph = attrs.match(/\sdata-en-placeholder="([^"]*)"/), hr = attrs.match(/\sdata-en-href="([^"]*)"/);
    if (ph) attrs = attrs.replace(/\splaceholder="[^"]*"/, ` placeholder="${ph[1]}"`);
    if (hr) attrs = attrs.replace(/\shref="[^"]*"/, ` href="${hr[1]}"`);
    return `<${name}${attrs}>`;
  });
  return out;
}
const stripI18nAttrs = (h) => h.replace(/\sdata-en(-[a-z]+)?="[^"]*"/g, '');
const squeeze = (h) => h.replace(/<!--(?!\[).*?-->/gs, '').replace(/[ \t]*\n[ \t]*/g, ' ').replace(/ {2,}/g, ' ');

// ---------------------------------------------------------------- JSON-LD
const faqFrom = (html) => [...html.matchAll(/<details>\s*<summary>((?:(?!<\/summary>).)*)<\/summary>\s*<p>((?:(?!<\/p>).)*)<\/p>\s*<\/details>/gs)]
  .map(([, q, a]) => ({ '@type': 'Question', name: stripTags(q), acceptedAnswer: { '@type': 'Answer', text: stripTags(a) } }));

function jsonLd(page, lang, url, html) {
  const L = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const meta = PAGES[page][lang];
  const home = lang === 'en' ? SITE + '/' : SITE + '/hi/';
  const img = `${SITE}/assets/img/${PAGES[page].og}`;
  const org = { '@type': 'Organization', '@id': SITE + '/#organizer', name: 'Times Internet Languages Live', url: ORG_URL, sameAs: [ORG_URL] };
  const nbt = { '@type': 'Organization', '@id': SITE + '/#presenter', name: lang === 'hi' ? 'नवभारत टाइम्स' : 'Navbharat Times', alternateName: 'NBT', url: NBT_URL, sameAs: [NBT_URL],
    logo: { '@type': 'ImageObject', url: SITE + '/assets/img/nbt.webp', width: 256, height: 104 }, parentOrganization: { '@type': 'Organization', name: 'The Times of India' } };
  const place = { '@type': 'Place', name: lang === 'hi' ? 'भारत मंडपम' : 'Bharat Mandapam',
    address: { '@type': 'PostalAddress', streetAddress: 'Pragati Maidan', addressLocality: lang === 'hi' ? 'नई दिल्ली' : 'New Delhi', addressRegion: 'Delhi', postalCode: '110001', addressCountry: 'IN' } };
  const contactPoint = { '@type': 'ContactPoint', contactType: 'partnerships', email: EMAIL, telephone: PHONE, availableLanguage: ['Hindi', 'English'] };
  const offer = (name, price, path) => ({ '@type': 'Offer', name, price: String(price), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: `${url}${path}`, validFrom: '2026-10-01' });
  const crumbs = [{ '@type': 'ListItem', position: 1, name: lang === 'hi' ? 'होम' : 'Home', item: home }];
  if (page === 'awards') crumbs.push({ '@type': 'ListItem', position: 2, name: lang === 'hi' ? 'अवॉर्ड्स' : 'Awards', item: url });

  const summit = {
    '@type': 'Event', '@id': (lang === 'en' ? SITE + '/' : SITE + '/hi/') + '#summit',
    name: lang === 'hi' ? 'NBT वसुधा समिट 2027' : 'NBT Vasudha Summit 2027',
    description: PAGES.index[lang].desc, startDate: '2027-02-13T09:30:00+05:30',
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place, image: [`${SITE}/assets/img/og-summit.jpg`], inLanguage: ['hi-IN', 'en-IN'], isAccessibleForFree: false,
    organizer: [{ '@id': SITE + '/#organizer' }, { '@id': SITE + '/#presenter' }],
    offers: [
      offer(lang === 'hi' ? 'भारत पास' : 'Bharat Pass', 999, '#passes'),
      offer(lang === 'hi' ? 'प्रोफ़ेशनल पास' : 'Professional Pass', 5999, '#passes'),
      offer(lang === 'hi' ? 'वसुधा लीडरशिप पास' : 'Vasudha Leadership Pass', 19999, '#passes'),
      offer(lang === 'hi' ? 'कॉर्पोरेट टेबल (10 सीटें)' : 'Corporate Table (10 seats)', 175000, '#passes'),
    ],
  };
  const awards = {
    '@type': 'Event', '@id': (lang === 'en' ? SITE + '/awards.html' : SITE + '/hi/awards.html') + '#awards',
    name: lang === 'hi' ? 'NBT वसुधा अवॉर्ड्स 2027' : 'NBT Vasudha Awards 2027',
    alternateName: lang === 'hi' ? 'संकल्प से प्रभाव तक' : 'Sankalp Se Prabhao Tak',
    description: PAGES.awards[lang].desc, startDate: '2027-02-13T18:30:00+05:30',
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place, image: [`${SITE}/assets/img/og-awards.jpg`], inLanguage: 'en-IN', isAccessibleForFree: false,
    organizer: [{ '@id': SITE + '/#organizer' }, { '@id': SITE + '/#presenter' }],
    superEvent: { '@id': (lang === 'en' ? SITE + '/' : SITE + '/hi/') + '#summit' },
    offers: [
      offer(lang === 'hi' ? 'व्यक्तिगत ग्रोथ प्लान (1 श्रेणी)' : 'Individual Growth Plan (1 category)', 9999, '#fees'),
      offer(lang === 'hi' ? 'व्यक्तिगत एक्सेलेरेशन प्लान (2 श्रेणियाँ)' : 'Individual Acceleration Plan (2 categories)', 17999, '#fees'),
      offer(lang === 'hi' ? 'कॉर्पोरेट स्टैंडर्ड प्लान (1 श्रेणी)' : 'Corporate Standard Plan (1 category)', 14999, '#fees'),
      offer(lang === 'hi' ? 'कॉर्पोरेट ग्रोथ प्लान (2 श्रेणियाँ)' : 'Corporate Growth Plan (2 categories)', 25999, '#fees'),
      offer(lang === 'hi' ? 'कॉर्पोरेट एक्सेलेरेशन प्लान (3 श्रेणियाँ)' : 'Corporate Acceleration Plan (3 categories)', 45999, '#fees'),
      offer(lang === 'hi' ? 'कॉर्पोरेट एक्सक्लूज़िव प्लान (3 श्रेणियाँ)' : 'Corporate Exclusive Plan (3 categories)', 89999, '#fees'),
    ],
  };
  const graph = [
    org, nbt,
    { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: NAME_EN, alternateName: NAME_HI, inLanguage: ['hi-IN', 'en-IN'], publisher: { '@id': SITE + '/#organizer' } },
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: meta.title, description: meta.desc, inLanguage: L, isPartOf: { '@id': SITE + '/#website' },
      primaryImageOfPage: { '@type': 'ImageObject', url: img, width: 1200, height: 630 }, breadcrumb: { '@id': url + '#breadcrumb' } },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: crumbs },
    page === 'index' ? { ...summit, ...{ contactPoint } } : awards,
  ];
  if (page === 'awards') graph.push({ ...summit, offers: undefined, '@id': summit['@id'] });
  const faq = faqFrom(html);
  if (faq.length) graph.push({ '@type': 'FAQPage', '@id': url + '#faq', inLanguage: L, mainEntity: faq });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

// ---------------------------------------------------------------- head
function head(page, lang, R, url, html) {
  const m = PAGES[page][lang], file = PAGES[page].file;
  const u = (l) => (l === 'en' ? (page === 'index' ? SITE + '/' : `${SITE}/${file}`) : (page === 'index' ? SITE + '/hi/' : `${SITE}/hi/${file}`));
  const image = `${SITE}/assets/img/${PAGES[page].og}`;
    return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    `<title>${escAttr(m.title)}</title>`,
    `<meta name="description" content="${escAttr(m.desc)}">`,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="hi" href="${u('hi')}">`,
    `<link rel="alternate" hreflang="en" href="${u('en')}">`,
    `<link rel="alternate" hreflang="x-default" href="${u('en')}">`,
    '<meta name="theme-color" content="#04110c">',
    '<meta name="color-scheme" content="dark">',
    '<meta name="author" content="Times Internet Languages Live">',
    '<meta name="application-name" content="NBT Vasudha">',
    '<meta name="format-detection" content="telephone=no">',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escAttr(lang === 'hi' ? NAME_HI : NAME_EN)}">`,
    `<meta property="og:title" content="${escAttr(m.title)}">`,
    `<meta property="og:description" content="${escAttr(m.desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${escAttr(m.ogAlt)}">`,
    `<meta property="og:locale" content="${lang === 'hi' ? 'hi_IN' : 'en_IN'}">`,
    `<meta property="og:locale:alternate" content="${lang === 'hi' ? 'en_IN' : 'hi_IN'}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escAttr(m.title)}">`,
    `<meta name="twitter:description" content="${escAttr(m.desc)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${escAttr(m.ogAlt)}">`,
    `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}" type="image/svg+xml">`,
    `<link rel="alternate icon" href="${R}assets/img/favicon-32.png" type="image/png" sizes="32x32">`,
    `<link rel="apple-touch-icon" href="${R}assets/img/apple-touch-icon.png">`,
    `<style>${critCss.replace(/url\((['"]?)fonts\//g, `url($1${R}assets/fonts/`).trim()}</style>`,
    `<script>(function(){var c=${JSON.stringify(fontCssFor(R, 'optional'))};function a(){var s=document.createElement('style');s.textContent=c;document.head.appendChild(s)}try{if(localStorage.getItem('nbtf')){a()}else{addEventListener('load',function(){setTimeout(function(){a();try{localStorage.setItem('nbtf','1')}catch(e){}},300)})}}catch(e){addEventListener('load',a)}})()</script>`,
    `<noscript><style>${fontCssFor(R, 'swap')}</style></noscript>`,
    `<noscript><style>${fontCssFor(R, 'swap')}.pending main>:not(.hero),.pending .horizon,.pending footer{content-visibility:visible!important;visibility:visible!important}</style><link rel="stylesheet" href="${R}assets/${CSS_FILE}"></noscript>`,
    // After first paint: load the remaining CSS, config + app script (+ manifest much later). Nothing here competes with FCP/LCP.
    `<script>(function(){var d=document,e=d.documentElement,n=0;function go(){if(n)return;n=1;var l=d.createElement('link');l.rel='stylesheet';l.id='rest-css';l.href='${R}assets/${CSS_FILE}';d.head.appendChild(l);['${R}assets/${CFG}','${R}assets/${JS_FILE}'].forEach(function(u){var s=d.createElement('script');s.src=u;s.async=false;d.head.appendChild(s)});setTimeout(function(){e.classList.remove('pending')},9000);addEventListener('load',function(){setTimeout(function(){var m=d.createElement('link');m.rel='manifest';m.href='${R}site.webmanifest';d.head.appendChild(m)},6000)})}try{new PerformanceObserver(function(x,o){o.disconnect();go()}).observe({type:'paint',buffered:true})}catch(x){}setTimeout(go,2500)})()</script>`,
    jsonLd(page, lang, url, html),
  ].join('\n');
}

const langSwitch = (page, lang) => {
  const f = PAGES[page].file;
  return lang === 'en'
    ? `<div class="lang" role="group" aria-label="भाषा / Language"><a href="hi/${f}" hreflang="hi" lang="hi" rel="alternate">हिन्दी</a><a href="${f}" hreflang="en" lang="en" aria-current="true">English</a></div>`
    : `<div class="lang" role="group" aria-label="भाषा / Language"><a href="${f}" hreflang="hi" lang="hi" aria-current="true">हिन्दी</a><a href="../${f}" hreflang="en" lang="en" rel="alternate">English</a></div>`;
};

// ---------------------------------------------------------------- build pages
mkdirSync('hi', { recursive: true });
for (const page of Object.keys(PAGES)) {
  const src = readFileSync(`src/${PAGES[page].file}`, 'utf8');
  for (const lang of ['hi', 'en']) {
    const R = lang === 'en' ? '' : '../';
    const url = lang === 'en' ? (page === 'index' ? SITE + '/' : `${SITE}/${PAGES[page].file}`) : (page === 'index' ? SITE + '/hi/' : `${SITE}/hi/${PAGES[page].file}`);
    let body = lang === 'en' ? toEnglish(src) : src;
    body = stripI18nAttrs(body);
    // header logos: inlined (no request before first paint); footer logos stay lazy files
    const hdrEnd = body.indexOf('</header>');
    let hdr = body.slice(0, hdrEnd).replace(/<img class="nbt"[^>]*>/, `<img class="nbt" src="${LOGO_NBT}" alt="Navbharat Times" width="160" height="65" decoding="async">`).replace(/<img class="til"[^>]*>/, `<img class="til" src="${LOGO_TIL}" alt="Times Internet Languages Live" width="130" height="78" decoding="async">`);
    body = (hdr + body.slice(hdrEnd)).replace(/\{\{R\}\}/g, R);
    body = body.replace('<html lang="hi" class="no-js">', `<html lang="${lang}" class="no-js pending">`);
    body = body.replace('<!--LANGSWITCH-->', langSwitch(page, lang)).replace('<!--SCRIPTS-->', '');
    body = body.replace('<!--HEAD-->', head(page, lang, R, url, body));
    body = squeeze(body);
    if (/\{\{|data-en/.test(body)) throw new Error(`leftover token in ${page}/${lang}`);
    writeFileSync(lang === 'en' ? PAGES[page].file : `hi/${PAGES[page].file}`, body);
    console.log(`${lang === 'en' ? '' : 'hi/'}${PAGES[page].file}`.padEnd(18), (body.length / 1024).toFixed(1) + ' KB');
  }
}

// ---------------------------------------------------------------- static files
const today = new Date().toISOString().slice(0, 10);
const loc = (p) => ({ en: p === 'index' ? SITE + '/' : `${SITE}/${PAGES[p].file}`, hi: p === 'index' ? SITE + '/hi/' : `${SITE}/hi/${PAGES[p].file}` });
const entry = (p, l) => `  <url>\n    <loc>${loc(p)[l]}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === 'index' ? (l === 'en' ? '1.0' : '0.9') : (l === 'en' ? '0.9' : '0.8')}</priority>\n` +
  ['hi', 'en'].map((x) => `    <xhtml:link rel="alternate" hreflang="${x}" href="${loc(p)[x]}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc(p).en}"/>\n  </url>`;
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${['index', 'awards'].flatMap((p) => ['hi', 'en'].map((l) => entry(p, l))).join('\n')}\n</urlset>\n`);
// NOTE: crawlers only read robots.txt from the domain ROOT (https://timeslanguages.in/robots.txt). This copy is for reference —
// add its `Sitemap:` line to the root robots.txt of timeslanguages.in (or submit the sitemap in Search Console).
writeFileSync('robots.txt', `User-agent: *\nAllow: ${SITE_PATH}/\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync('site.webmanifest', JSON.stringify({
  name: NAME_EN, short_name: 'NBT Vasudha', description: PAGES.index.en.desc, lang: 'en-IN', start_url: SITE_PATH + '/', scope: SITE_PATH + '/', display: 'standalone',
  background_color: '#04110c', theme_color: '#04110c',
  icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));
// Cache + security headers for Netlify / Cloudflare Pages / similar. (Apache/nginx: copy the same rules.)
writeFileSync('_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/img/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/style.*.css\n  Cache-Control: public, max-age=31536000, immutable\n\n/assets/main.*.js\n  Cache-Control: public, max-age=31536000, immutable\n\n/*.html\n  Cache-Control: public, max-age=0, must-revalidate\n\n/\n  Cache-Control: public, max-age=0, must-revalidate\n`);
console.log('critical css', (critCss.length / 1024).toFixed(1) + ' KB inline; rest', (restCss.length / 1024).toFixed(1) + ' KB; js', (js.length / 1024).toFixed(1) + ' KB', ' ->', CSS_FILE, JS_FILE);

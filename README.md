# NBT Vasudha — Summit 2027 & Sustainability Awards 2026

A plain static site: HTML, CSS, JS and images. No build step, no dependencies.

```
index.html, awards.html        English (default)
hi/index.html, hi/awards.html  Hindi
assets/css/style.css           all styles (Poppins from Google Fonts, loaded without blocking render)
assets/js/config.js            form endpoint (edit this)
assets/js/main.js              all behaviour (forms, menu, tabs, nomination dialog, hero video)
assets/img/                    logos, hero posters, packages photo, icons, social previews
assets/video/hero-720.mp4      hero background, desktop (H.264, no audio, 2.85 MB)
assets/video/hero-480.mp4      hero background, phones and tablets (0.85 MB)
llms.txt                       plain-language facts for AI/LLM citation
sitemap.xml                    the four pages with hreflang alternates
```

Run locally: `python3 -m http.server` and open http://localhost:8000.
Deploy: upload the folder to any static host (GitHub Pages is already set up).

Edit content directly in the four HTML files — keep the English and Hindi pages in sync.

## Forms
Set the endpoint in `assets/js/config.js`. With none set, each form opens a pre-filled email to its contact
(registration: Simran Singh, partnership: Deepika Pawar, nominations: Sagun Kumari). There is no online
payment on the site; nominations and registrations are confirmed by the team. The payload contract is in that file.

## Event facts (keep these identical everywhere)
Summit 2027 and the Sustainability Awards 2026 night are both on **13 February 2027 at Bharat Mandapam,
New Delhi** (awards from 6:30 PM). Awards: 34 categories in four tracks; nomination plans Individual Growth
₹8,999, Individual Acceleration ₹17,999, Corporate Standard ₹25,999, Corporate Growth ₹34,999, Corporate
Acceleration ₹51,999 (all + GST). These appear in the page copy, `<title>`/description/OG tags, the
nomination form options, `llms.txt` and the JSON-LD — when one changes, change all of them on both languages.

## Performance rules
- The hero's LCP is the poster `<img>`; the video has no `src` in the HTML and is attached by `main.js`
  after `load` (480p under 860px, skipped for reduced motion, Save-Data and 2G/3G). Never add `preload`/`autoplay`.
- The mandated Times Languages logo in the hero is also deferred past `load` (its box is reserved in CSS
  so nothing shifts) — it's a 140 KB file for a 90px slot and should not compete with first paint.
- English pages load Poppins with `display=swap` plus a metric-matched fallback; Hindi pages use
  `display=optional` because Devanagari has no matched fallback (prevents layout shift).
- Images below the fold get `loading="lazy"` and explicit `width`/`height`.

# NBT Vasudha Summit & Awards 2027

Static site (HTML/CSS/JS only). Production URL: https://timeslanguages.in/nbtvasudha/

## Edit → build
- Edit `src/index.html`, `src/awards.html` (Hindi text + `data-en="English"`), `assets/style.css`, `assets/main.js`, and `build.mjs` (titles, descriptions, JSON-LD, SITE url).
- Run `npm install` once, then `npm run build`. It generates `index.html`, `awards.html`, `hi/*.html`, hashed CSS/JS, `sitemap.xml`, `robots.txt`, `site.webmanifest`, `_headers`. **Never edit the generated files.**
- If you add new Devanagari wording, re-subset the two Devanagari fonts in `assets/fonts` (unknown glyphs fall back to the system font until then).

## Go-live checklist
1. Upload everything except `src/`, `node_modules/`, `build.mjs`, `package*.json` (keeping them is harmless).
2. Serve with compression (brotli/gzip) and the cache headers in `_headers` (immutable for `/assets/*`).
3. `robots.txt` only works at the domain root: add the `Sitemap: https://timeslanguages.in/nbtvasudha/sitemap.xml` line to https://timeslanguages.in/robots.txt.
4. Search Console: add the property, submit the sitemap, request indexing of the 4 URLs. Validate structured data with Google's Rich Results Test.
5. Set the `endpoint` in `assets/config.js` so form leads are stored (otherwise forms open an email).

## Off-page SEO (cannot be done in code)
- Link to the site from navbharattimes.com and timeslanguages.in (homepage, event/awards sections, relevant articles) using descriptive anchors like "NBT Vasudha Awards 2027".
- Publish launch articles/press releases and nomination-call stories; get coverage and backlinks from sustainability/ESG outlets and partner sites.
- Share the pages on social (the OG image/cards are ready); add listings on event platforms (Allevents, Eventbrite-style, LinkedIn Events) linking back.
- Keep the Hindi and English URLs consistent in every link (hreflang is already set).

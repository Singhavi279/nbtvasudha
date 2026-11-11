# NBT Vasudha — Summit 2027 & Sustainability Awards 2026

A plain static site: HTML, CSS, JS and images. No build step, no dependencies.

```
index.html, awards.html        English (default)
hi/index.html, hi/awards.html  Hindi
assets/css/style.css           all styles (Poppins loaded from Google Fonts)
assets/js/config.js            form endpoint + payment settings (edit this)
assets/js/main.js              all behaviour
assets/img/                    logos, hero image, icons, social previews

```

Run locally: `python3 -m http.server` and open http://localhost:8000.
Deploy: upload the folder to any static host (GitHub Pages is already set up).

Edit content directly in the four HTML files — keep the English and Hindi pages in sync.

## Forms and payment
Set the endpoints in `assets/js/config.js`. With none set, forms open a pre-filled email and the
registration popup records the registration and shows a "payment pending" state — it never shows "paid"
without server-side verification. The request/response contract is documented in that file.

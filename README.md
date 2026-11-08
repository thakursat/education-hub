# Education Hub Home Tutors — website

Static, SEO-first, mobile-first site for home tuition in Lucknow. No framework, no dependencies.

## Commands

- `npm run build` — generates the full site into `dist/`
- `npm start` — build + serve locally at http://localhost:4321

## Editing

- Business details, subjects, classes, boards, areas, fees, FAQs, blog posts: `src/data.js`
- **Before going live, set `SITE.url` in `src/data.js` to the real domain** (canonicals, sitemap, schema use it). Also set `SITE.email` and `SITE.social`.
- Photos: drop JPGs into `src/assets/photos/` and rebuild — `parents.jpg`, `tutors.jpg`, `institutes.jpg` (home "Who are you looking for" cards, 4:3) and `about.jpg` (About section). Optional board logos: `board-cbse.png`, `board-icse.png`, `board-up-board.png`, `board-ib.png`, `board-igcse.png`, `board-nios.png`. Any slot without a file keeps its illustration. Export at ~1200px wide, under 200 KB.
- Tutor profiles: add real tutors to `tutors` in `src/data.js` (photos go in `src/assets/photos/tutors/`). Parent reviews: add to `testimonials`. Both sections stay hidden while empty.
- Tuition jobs: edit `src/jobs.json` (array of `{ id, title, area, budget, gender, subjects, mode, active }`), rebuild.
- Layout/templates: `src/build.js` · styles: `src/theme.css` (visual theme, header, home sections, footer) and `src/styles.css` (inner-page components) · forms/menu/animations: `src/main.js`

## Deploy

Upload `dist/` to any static host (Netlify, Cloudflare Pages, Vercel, cPanel). Then submit `https://<domain>/sitemap.xml` in Google Search Console and create a Google Business Profile with the same name, address and phone.

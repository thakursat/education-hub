# Education Hub Home Tutors — website

Static, SEO-first, mobile-first site for home tuition in Lucknow. No framework, no dependencies.

## Commands

- `npm run build` — generates the full site into `dist/`
- `npm start` — build + serve locally at http://localhost:4321

## Editing

- Business details, subjects, classes, boards, areas, fees, FAQs, blog posts: `src/data.js`
- Live domain: `https://eduhometutor.in` (`SITE.url` in `src/data.js`; canonicals, sitemap and schema use it). `www.eduhometutor.in` redirects to it (see `vercel.json`). Fill in `SITE.social` when the profiles exist.
- Photos: drop JPGs into `src/assets/photos/` and rebuild — `parents.jpg`, `tutors.jpg`, `institutes.jpg` (home "Who are you looking for" cards, 4:3) and `about.jpg` (About section). Optional board logos: `board-cbse.png`, `board-icse.png`, `board-up-board.png`, `board-ib.png`, `board-igcse.png`, `board-nios.png`. Any slot without a file keeps its illustration. Blog covers use `blog-<post-slug>.jpg`. Export at ~900px wide (4:3), under 150 KB.
- `parents`, `tutors`, `about` and the "how to choose a tutor" blog cover are real sessions by our tutors (Subhashini Mourya, Adharsh Mishra, Nabila Irshad, Arpit Singh). The rest are free Pexels stock photos (https://www.pexels.com/license/ — commercial use allowed, no attribution required): institutes 3231358, Class 10 post 6958537, "home tuition vs coaching" post 18012462 (`https://www.pexels.com/photo/<id>/`).
- Tutor profiles: add real tutors to `tutors` in `src/data.js` (photos go in `src/assets/photos/tutors/`). Parent reviews: add to `testimonials`. Both sections stay hidden while empty.
- Tuition jobs: edit `src/jobs.json` (array of `{ id, title, area, budget, gender, subjects, mode, active }`), rebuild.
- Layout/templates: `src/build.js` · styles: `src/theme.css` (visual theme, header, home sections, footer) and `src/styles.css` (inner-page components) · forms/menu/animations: `src/main.js`

## Deploy

Upload `dist/` to any static host (Netlify, Cloudflare Pages, Vercel, cPanel). Then submit `https://eduhometutor.in/sitemap.xml` in Google Search Console and create a Google Business Profile with the same name, address and phone.

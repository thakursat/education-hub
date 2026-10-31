// Static site generator: `node src/build.js` writes the full site to dist/.
// No dependencies on purpose — any static host (Netlify, Vercel, Cloudflare Pages, cPanel) can serve dist/.

const fs = require('fs');
const path = require('path');
const { homeScene, tutorScene } = require('./illustrations');
const { SITE, subjects, classes, boards, exams, areas, faqs, fees, posts, testimonials } = require('./data');

const SRC = __dirname;
const DIST = path.join(SRC, '..', 'dist');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => SITE.url + p;
const wa = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
const tel = `tel:${SITE.phone}`;
const addressLine = `${SITE.address.street}, ${SITE.address.locality}, ${SITE.address.region} ${SITE.address.postalCode}`;

const pages = [];

// Inlined into every page: one round trip to first paint on slow mobile networks.
const CSS = fs
  .readFileSync(path.join(SRC, 'styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
// Only the logo wordmark uses a web font; display=optional means it never causes a layout shift.
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=optional';

// ---------- Structured data ----------

const orgId = abs('/#organization');

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': ['EducationalOrganization', 'LocalBusiness'],
  '@id': orgId,
  name: SITE.name,
  alternateName: SITE.shortName,
  slogan: SITE.tagline,
  url: abs('/'),
  logo: abs('/assets/logo-512.jpg'),
  image: abs('/assets/logo-full.jpg'),
  telephone: SITE.phone,
  email: SITE.email,
  priceRange: '₹₹',
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.locality,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
  openingHours: SITE.hours,
  hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.address.street}, Lucknow ${SITE.address.postalCode}`)}`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: SITE.phone,
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
  },
  areaServed: [{ '@type': 'City', name: 'Lucknow' }, ...areas.map((a) => ({ '@type': 'Place', name: `${a.name}, Lucknow` }))],
  knowsAbout: [...subjects.map((s) => s.name), ...boards.map((b) => b.name), ...exams.map((e) => e.short)],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Home tuition services',
    itemListElement: subjects.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: `${s.name} home tuition`, url: abs(`/subjects/${s.slug}/`) },
    })),
  },
  sameAs: Object.values(SITE.social).filter(Boolean),
};

const itemListSchema = (name, items) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, url: abs(u) })),
});

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#website'),
  url: abs('/'),
  name: SITE.name,
  inLanguage: SITE.lang,
  publisher: { '@id': orgId },
};

const breadcrumbSchema = (crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(url) })),
});

const faqSchema = (list) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

const serviceSchema = (name, description, url, area = 'Lucknow') => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Home Tuition',
  name,
  description,
  url: abs(url),
  provider: { '@id': orgId },
  areaServed: { '@type': 'Place', name: area },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', description: 'Free demo class' },
});

// ---------- Shared fragments ----------

const nav = [
  ['Home', '/'],
  ['About', '/about/'],
  ['Subjects', '/subjects/'],
  ['Classes', '/classes/'],
  ['Areas', '/areas/'],
  ['Fees', '/fees/'],
  ['Tuition Jobs', '/tuition-jobs/'],
  ['Blog', '/blog/'],
  ['Contact', '/contact/'],
];

// Nav items that open a dropdown (desktop: hover/focus, mobile: tap to expand inside the menu panel).
const navSubs = {
  '/subjects/': ['Browse by subject', subjects.slice(0, 8).map((s) => [`${s.icon} ${s.name}`, `/subjects/${s.slug}/`]), ['All subjects →', '/subjects/']],
  '/classes/': [
    'Browse by class',
    [
      ...classes
        .filter((c) => ['nursery', 'class-1', 'class-5', 'class-8', 'class-9', 'class-10', 'class-11', 'class-12'].includes(c.slug))
        .map((c) => [c.name, `/classes/${c.slug}/`]),
      ...exams.slice(0, 2).map((e) => [e.short, `/exams/${e.slug}/`]),
    ],
    ['All classes →', '/classes/'],
  ],
  '/areas/': ['Tutors near you', areas.slice(0, 8).map((a) => [`📍 ${a.name}`, `/areas/${a.slug}/`]), ['All areas →', '/areas/']],
};

function header(current) {
  const links = nav
    .map(([n, u]) => {
      const cur = u === current ? ' aria-current="page"' : '';
      const sub = navSubs[u];
      if (!sub) return `<li><a href="${u}"${cur}>${n}</a></li>`;
      const [label, items, all] = sub;
      const id = `sub-${u.replace(/\//g, '')}`;
      return `<li class="has-sub"><a href="${u}"${cur}>${n}</a><button class="sub-toggle" aria-expanded="false" aria-controls="${id}" aria-label="Show ${n} menu"><span aria-hidden="true">▾</span></button>
<div class="sub" id="${id}"><p class="sub__label">${label}</p><ul>${items.map(([t, h]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('')}</ul><a class="sub__all" href="${all[1]}">${all[0]}</a></div></li>`;
    })
    .join('');
  return `
<a class="skip" href="#main">Skip to content</a>
<div class="topbar">
  <div class="wrap topbar__in">
    <a href="${tel}" class="topbar__item">📞 ${SITE.phoneDisplay}</a>
    <span class="topbar__item hide-sm">📍 Triveni Nagar, Lucknow</span>
    <a href="/become-a-tutor/" class="topbar__item">Join as Tutor →</a>
  </div>
</div>
<header class="hdr" id="top">
  <div class="wrap hdr__in">
    <a class="brand" href="/" title="${esc(SITE.name)} — home">
      <img src="/assets/emblem-112.jpg" width="56" height="42" alt="" fetchpriority="high">
      <span class="brand__txt"><b>Education <em>Hub</em></b><small>Home Tutors</small></span>
    </a>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>${links}</ul>
      <a class="btn btn--primary nav__cta" href="/get-tutor/">Book Free Demo</a>
    </nav>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>
  </div>
</header>`;
}

function footer() {
  const col = (title, items) =>
    `<div class="ftr__col"><h3>${title}</h3><ul>${items.map(([n, u]) => `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ul></div>`;
  return `
<footer class="ftr">
  <div class="wrap ftr__grid">
    <div class="ftr__col ftr__brand">
      <img src="/assets/logo-240.jpg" width="120" height="120" alt="${esc(SITE.name)} logo" loading="lazy" decoding="async">
      <p>Verified home tutors for every class, board and subject across Lucknow. Free demo class, transparent fees.</p>
      <address>
        <strong>${esc(SITE.name)}</strong><br>
        ${esc(SITE.address.street)},<br>${esc(SITE.address.locality)} – ${SITE.address.postalCode}, ${esc(SITE.address.region)}<br>
        <a href="${tel}">📞 ${SITE.phoneDisplay}</a><br>
        <a href="mailto:${SITE.email}">✉️ ${SITE.email}</a><br>
        🕘 ${SITE.hoursDisplay}
      </address>
    </div>
    ${col(
      'Subjects',
      subjects.slice(0, 8).map((s) => [`${s.name} Tutor`, `/subjects/${s.slug}/`]),
    )}
    ${col('Classes & Exams', [
      ...classes
        .filter((c) => ['class-10', 'class-12', 'class-9', 'class-11', 'class-5'].includes(c.slug))
        .map((c) => [`${c.name} Tutor`, `/classes/${c.slug}/`]),
      ...exams.slice(0, 2).map((e) => [`${e.short} Tutor`, `/exams/${e.slug}/`]),
      ...boards.slice(0, 3).map((b) => [`${b.name} Tutor`, `/boards/${b.slug}/`]),
    ])}
    ${col(
      'Areas',
      areas.slice(0, 10).map((a) => [`Home Tutor in ${a.name}`, `/areas/${a.slug}/`]),
    )}
    ${col('Company', [
      ['About Us', '/about/'],
      ['Get a Tutor', '/get-tutor/'],
      ['Become a Tutor', '/become-a-tutor/'],
      ['Tuition Jobs', '/tuition-jobs/'],
      ['Fees', '/fees/'],
      ['Blog', '/blog/'],
      ['Contact', '/contact/'],
      ['Privacy Policy', '/privacy-policy/'],
      ['Terms & Conditions', '/terms-conditions/'],
      ['Refund Policy', '/refund-policy/'],
      ['Disclaimer', '/disclaimer/'],
    ])}
  </div>
  <div class="ftr__bottom wrap">
    <p>© ${new Date().getFullYear()} ${esc(SITE.name)}, Lucknow. All rights reserved.</p>
    <p class="ftr__tag">${esc(SITE.tagline)}</p>
    <p class="ftr__credit">Created with <span aria-label="love">❤️</span> by <a href="https://www.linkedin.com/in/thakursatyam9415" target="_blank" rel="noopener">Satyam Singh</a> &amp; <a href="https://www.neosharks.in/" target="_blank" rel="noopener">Neosharks</a></p>
  </div>
</footer>
<div class="dock" aria-label="Quick contact">
  <a href="${tel}" class="dock__btn dock__call">📞 Call</a>
  <a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" class="dock__btn dock__wa" target="_blank" rel="noopener">💬 WhatsApp</a>
  <a href="/get-tutor/" class="dock__btn dock__demo">🎓 Free Demo</a>
</div>
<a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" class="wa-float" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
  <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.2c-.2.2-.4.3-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5l-.6-.4z"/></svg>
</a>`;
}

const areaOptions = () => areas.map((a) => `<option>${esc(a.name)}</option>`).join('') + '<option>Other area in Lucknow</option>';

const classOptions = () => classes.map((c) => `<option>${esc(c.name)}</option>`).join('');

function leadForm(context = '', id = 'lead') {
  return `
<form class="lead" id="${id}" data-lead novalidate>
  <h2 class="lead__title">Book a Free Demo Class</h2>
  <p class="lead__sub">We call back within 30 minutes during working hours.</p>
  <input type="hidden" name="context" value="${esc(context)}">
  <label>Parent / Student name<input name="name" autocomplete="name" required minlength="2" placeholder="e.g. Priya Sharma"></label>
  <label>Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile"></label>
  <div class="lead__row">
    <label>Class<select name="class" required><option value="">Select</option>${classOptions()}</select></label>
    <label>Area<select name="area" required><option value="">Select</option>${areaOptions()}</select></label>
  </div>
  <label>Subjects (optional)<input name="subjects" placeholder="e.g. Maths, Science"></label>
  <fieldset class="lead__pref"><legend>Tutor preference</legend>
    <label><input type="radio" name="gender" value="Any" checked> Any</label>
    <label><input type="radio" name="gender" value="Female"> Female</label>
    <label><input type="radio" name="gender" value="Male"> Male</label>
  </fieldset>
  <p class="lead__err" role="alert" hidden></p>
  <button class="btn btn--primary btn--block" type="submit">Get Free Demo on WhatsApp →</button>
  <p class="lead__fine">✔ Free demo ✔ No advance payment ✔ Verified tutors</p>
</form>`;
}

const breadcrumbs = (crumbs) =>
  `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${crumbs
    .map(([n, u], i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`))
    .join('')}</ol></nav>`;

const faqBlock = (list, title = 'Frequently Asked Questions') => `
<section class="sec" aria-labelledby="faq-h">
  <div class="wrap narrow">
    <h2 class="h2" id="faq-h">${title}</h2>
    <div class="faq">${list.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  </div>
</section>`;

const ctaBand = (title = 'Ready to find the right tutor?') => `
<section class="cta">
  <div class="wrap cta__in">
    <div>
      <h2>${esc(title)}</h2>
      <p>Free demo class · Verified tutors · Replace anytime</p>
    </div>
    <div class="cta__btns">
      <a class="btn btn--light" href="/get-tutor/">Book Free Demo</a>
      <a class="btn btn--ghost" href="${tel}">Call ${SITE.phoneDisplay}</a>
    </div>
  </div>
</section>`;

const marqueeItems = [
  '🛡️ 100% verified tutors',
  '🎁 Free demo class',
  '⚡ Tutor matched in 24 hours',
  '📚 CBSE · ICSE · UP Board · IB · IGCSE',
  '🎯 JEE & NEET specialists',
  '👩‍🏫 Female & male tutors',
  '🔁 Free tutor replacement',
  '📍 Tutors across Lucknow',
];
// The list is rendered twice so the CSS loop is seamless; the copy is hidden from screen readers.
const marquee = `
<div class="marquee" role="region" aria-label="Why parents choose us">
  <div class="marquee__track">
    <ul>${marqueeItems.map((m) => `<li>${m}</li>`).join('')}</ul>
    <ul aria-hidden="true">${marqueeItems.map((m) => `<li>${m}</li>`).join('')}</ul>
  </div>
</div>`;

// Renders nothing until real parent reviews are added to data.js.
const testimonialsBlock = () =>
  testimonials.length
    ? `
<section class="sec" aria-labelledby="testi-h">
  <div class="wrap">
    <div class="sec__head">
      <div><p class="eyebrow">Testimonials</p><h2 class="h2" id="testi-h">What parents say</h2></div>
      <div class="carousel__nav" data-carousel-nav="testi"><button type="button" data-dir="-1" aria-label="Previous review">←</button><button type="button" data-dir="1" aria-label="Next review">→</button></div>
    </div>
    <div class="carousel" id="testi">${testimonials
      .map(
        (t) =>
          `<figure class="quote"><div class="quote__stars" aria-label="${t.rating} out of 5">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div><blockquote>${esc(t.text)}</blockquote><figcaption><b>${esc(t.name)}</b><span>${esc(t.detail)}</span></figcaption></figure>`,
      )
      .join('')}</div>
  </div>
</section>`
    : '';

const finalCta = `
<section class="final">
  <div class="wrap final__in">
    <p class="pill pill--dark">📅 Book today — free demo within 24 hours</p>
    <h2>Start your child's learning journey with <span>Education Hub</span></h2>
    <p>Verified, experienced home tutors across Lucknow. No advance payment, no risk — just a free demo class at your home.</p>
    <div class="final__btns">
      <a class="btn btn--light" href="/get-tutor/">Book Free Demo Now</a>
      <a class="btn btn--ghost" href="${tel}">📞 Call ${SITE.phoneDisplay}</a>
    </div>
    <ul class="final__ticks"><li>100% free demo</li><li>No advance payment</li><li>Replace tutor anytime</li><li>Verified &amp; safe</li></ul>
  </div>
</section>`;

// Shown once per visit on desktop only — Google penalises pop-ups that cover content on mobile.
const welcome = `
<dialog class="welcome" id="welcome" aria-labelledby="welcome-h">
  <button class="welcome__x" type="button" data-close aria-label="Close">✕</button>
  <img src="/assets/emblem-112.jpg" width="72" height="54" alt="" loading="lazy">
  <h2 id="welcome-h">Welcome to <span>Education Hub</span></h2>
  <p>Looking for the right tutor, or want to start teaching? Choose your path.</p>
  <div class="welcome__grid">
    <a class="welcome__opt" href="/get-tutor/"><span>👨‍👩‍👧</span><b>Hire a tutor</b><small>Verified tutors for home &amp; online classes</small></a>
    <a class="welcome__opt" href="/become-a-tutor/"><span>🧑‍🏫</span><b>Join as a tutor</b><small>Get tuition jobs near your home</small></a>
  </div>
</dialog>`;

const steps = `
<section class="sec sec--alt" aria-labelledby="how-h">
  <div class="wrap">
    <p class="eyebrow">How it works</p>
    <h2 class="h2" id="how-h">Your tutor in four easy steps</h2>
    <ol class="steps">
      <li><b>1</b><span class="steps__ic" aria-hidden="true">📝</span><h3>Tell us your need</h3><p>Share class, subjects, board and area by form, call or WhatsApp.</p></li>
      <li><b>2</b><span class="steps__ic" aria-hidden="true">🤝</span><h3>We match a tutor</h3><p>We shortlist a verified tutor who fits your needs and timing.</p></li>
      <li><b>3</b><span class="steps__ic" aria-hidden="true">🏠</span><h3>Free demo class</h3><p>Meet the tutor at home. Continue only if you are happy.</p></li>
      <li><b>4</b><span class="steps__ic" aria-hidden="true">🚀</span><h3>Regular classes</h3><p>Classes begin with monthly feedback and easy tutor change if needed.</p></li>
    </ol>
  </div>
</section>`;

const trustStrip = `
<ul class="trust wrap">
  <li><span>🛡️</span><b>Verified tutors</b><small>ID, address & interview</small></li>
  <li><span>🎁</span><b>Free demo</b><small>No commitment</small></li>
  <li><span>⚡</span><b>Fast matching</b><small>Usually within 24 hrs</small></li>
  <li><span>🔁</span><b>Free replacement</b><small>Anytime you need</small></li>
  <li><span>💸</span><b>Clear fees</b><small>No hidden charges</small></li>
</ul>`;

const subjectCards = (list = subjects) => `
<div class="cards cards--sm">${list
  .map(
    (s) =>
      `<a class="card" href="/subjects/${s.slug}/"><span class="card__ic" aria-hidden="true">${s.icon}</span><h3>${s.name}</h3><p>${esc(s.blurb)}</p><span class="card__more">${s.short} tutors →</span></a>`,
  )
  .join('')}</div>`;

const classGrid = () => {
  const groups = [
    ['pre', 'Pre-primary'],
    ['primary', 'Primary (Class 1–5)'],
    ['middle', 'Middle school (Class 6–8)'],
    ['board', 'Board years (Class 9–12)'],
    ['higher', 'Entrance & higher education'],
  ];
  return groups
    .map(
      ([g, label]) =>
        `<h3 class="h3">${label}</h3><div class="chips">${classes
          .filter((c) => c.group === g)
          .map((c) => `<a class="chip${g === 'board' ? ' chip--hl' : ''}" href="/classes/${c.slug}/"><b>${c.name}</b><small>${c.age}</small></a>`)
          .join('')}</div>`,
    )
    .join('');
};

const boardCards = () => `
<div class="cards cards--sm">${boards
  .map(
    (b) =>
      `<a class="card" href="/boards/${b.slug}/"><span class="tag">${b.badge}</span><h3>${b.name}</h3><p>${esc(b.full)}</p><span class="card__more">${b.name} tutors →</span></a>`,
  )
  .join('')}</div>`;

const areaChips = (list = areas) => `
<div class="chips">${list.map((a) => `<a class="chip" href="/areas/${a.slug}/"><b>${a.name}</b><small>${a.zone}</small></a>`).join('')}</div>`;

// ---------- Page shell ----------

function page({ url, title, description, h1, body, crumbs, schema = [], current, ogType = 'website', noindex = false, lastmod }) {
  const schemas = [businessSchema, websiteSchema, ...(crumbs ? [breadcrumbSchema(crumbs)] : []), ...schema];
  const html = `<!doctype html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${abs(url)}">
<link rel="alternate" hreflang="en-IN" href="${abs(url)}">
<link rel="alternate" hreflang="x-default" href="${abs(url)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
<meta name="theme-color" content="#0b2a6f">
<meta name="geo.region" content="IN-UP">
<meta name="geo.placename" content="Lucknow">
<meta name="geo.position" content="${SITE.geo.lat};${SITE.geo.lng}">
<meta name="ICBM" content="${SITE.geo.lat}, ${SITE.geo.lng}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(url)}">
<meta property="og:image" content="${abs('/assets/og-1200x630.jpg')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SITE.name)} logo">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${abs('/assets/og-1200x630.jpg')}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_URL}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONT_URL}"></noscript>
<style>${CSS}</style>
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
${header(current)}
<main id="main">
${crumbs ? breadcrumbs(crumbs) : ''}
${h1 ? `<section class="phero"><div class="wrap"><h1>${h1}</h1>${description ? `<p>${esc(description)}</p>` : ''}</div></section>` : ''}
${body}
</main>
${footer()}
${welcome}
<script src="/main.js" defer></script>
</body>
</html>
`;
  pages.push({ url, html, noindex, lastmod });
}

// ---------- Home ----------

page({
  url: '/',
  current: '/',
  title: 'Home Tutors in Lucknow | Free Demo Class | Education Hub Home Tutors',
  description:
    'Find verified home tutors in Lucknow for Class 1–12, CBSE, ICSE, UP Board, IB, JEE & NEET. Free demo class at your home within 24 hours. Call 63860 05007.',
  schema: [faqSchema(faqs), serviceSchema('Home Tuition in Lucknow', 'One-to-one home tuition for all classes, boards and subjects across Lucknow.', '/')],
  body: `
<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__copy">
      <p class="pill"><span class="pulse" aria-hidden="true"></span> Tutors available across Lucknow today</p>
      <h1>Best <span class="hl">Home Tutors in Lucknow</span> — at your doorstep</h1>
      <p class="rotator" aria-live="off">Trusted by families for <span class="rotator__word" data-rotate="CBSE students|ICSE students|UP Board students|JEE aspirants|NEET aspirants|IB &amp; IGCSE|Class 1 to 12|Spoken English">CBSE students</span></p>
      <p class="lede">One-to-one home tuition for <strong>Play Group to Class 12</strong>, <strong>CBSE, ICSE, UP Board, IB & IGCSE</strong>, plus <strong>JEE, NEET</strong> and Spoken English. Tell us what your child needs and we'll send a verified tutor for a <strong>free demo class</strong>.</p>
      <ul class="badges">
        <li>🎁 Free demo class</li><li>🛡️ Verified tutors</li><li>💸 No hidden fees</li><li>⚡ 24-hr response</li>
      </ul>
      <div class="hero__btns">
        <a class="btn btn--accent" href="#lead">Book Free Demo</a>
        <a class="btn btn--outline" href="${tel}">📞 ${SITE.phoneDisplay}</a>
      </div>
      <dl class="stats">
        <div><dt>Subjects</dt><dd><span data-count="${subjects.length}">${subjects.length}</span>+</dd></div>
        <div><dt>Class levels</dt><dd><span data-count="${classes.length}">${classes.length}</span></dd></div>
        <div><dt>Boards</dt><dd><span data-count="${boards.length}">${boards.length}</span></dd></div>
        <div><dt>Demo arranged</dt><dd><span data-count="24">24</span>h</dd></div>
      </dl>
    </div>
    <div class="hero__form">${leadForm('Homepage hero')}</div>
  </div>
</section>
${marquee}
${trustStrip}

<section class="sec" aria-labelledby="who-h">
  <div class="wrap">
    <p class="eyebrow">Choose your path</p>
    <h2 class="h2" id="who-h">What are you looking for?</h2>
    <div class="cards cards--3">
      <a class="card card--role" href="/get-tutor/"><span class="card__ic">👨‍👩‍👧</span><h3>I'm a parent / student</h3><p>Get a verified, experienced tutor at home or online — matched to your class, board and schedule.</p><span class="card__more">Find a tutor →</span></a>
      <a class="card card--role" href="/become-a-tutor/"><span class="card__ic">🧑‍🏫</span><h3>I'm a tutor</h3><p>Get regular tuition leads near your home, flexible hours and timely payments.</p><span class="card__more">Become a tutor →</span></a>
      <a class="card card--role" href="/contact/"><span class="card__ic">🏫</span><h3>School / institute</h3><p>Need subject teachers, substitute faculty or exam-prep support? Let's talk.</p><span class="card__more">Partner with us →</span></a>
    </div>
  </div>
</section>

<section class="sec sec--alt" aria-labelledby="finder-h">
  <div class="wrap narrow">
    <p class="eyebrow">Smart tutor finder</p>
    <h2 class="h2" id="finder-h">Find the right tutor in 10 seconds</h2>
    <form class="finder" data-finder>
      <label>Area<select name="area"><option value="">Any area</option>${areaOptions()}</select></label>
      <label>Class<select name="class"><option value="">Any class</option>${classOptions()}</select></label>
      <label>Subject<select name="subject"><option value="">Any subject</option>${subjects.map((s) => `<option>${s.name}</option>`).join('')}</select></label>
      <label>Board<select name="board"><option value="">Any board</option>${boards.map((b) => `<option>${b.name}</option>`).join('')}</select></label>
      <label>Tutor<select name="gender"><option value="">Any</option><option>Female</option><option>Male</option></select></label>
      <label>Mode<select name="mode"><option value="">Home</option><option>Online</option></select></label>
      <button class="btn btn--primary btn--block" type="submit">Find My Tutor on WhatsApp →</button>
    </form>
  </div>
</section>

<section class="sec" aria-labelledby="jobs-h">
  <div class="wrap">
    <div class="sec__head">
      <div>
        <p class="eyebrow"><span class="pulse" aria-hidden="true"></span> Actively hiring</p>
        <h2 class="h2" id="jobs-h">Latest home tuition jobs in Lucknow</h2>
      </div>
      <div class="carousel__nav" data-carousel-nav="home-jobs" hidden>
        <button type="button" data-dir="-1" aria-label="Previous jobs">←</button><button type="button" data-dir="1" aria-label="Next jobs">→</button>
      </div>
    </div>
    <div class="carousel" id="home-jobs" data-jobs-src="/jobs.json" data-limit="8" aria-live="polite"></div>
    <div class="tutor-band">
      <div><h3>Are you a tutor?</h3><p>Get tuition jobs near your home sent straight to WhatsApp — free registration.</p></div>
      <div class="tutor-band__btns"><a class="btn btn--light" href="/become-a-tutor/">Register as Tutor</a><a class="btn btn--ghost" href="/tuition-jobs/">View all jobs</a></div>
    </div>
  </div>
</section>

${steps}

<section class="sec" aria-labelledby="cls-h">
  <div class="wrap">
    <p class="eyebrow">Classes we teach</p>
    <h2 class="h2" id="cls-h">Home tutors for every class & level</h2>
    <p class="sub">From a toddler's first letters to postgraduate subjects — one trusted place for the whole family.</p>
    ${classGrid()}
  </div>
</section>

<section class="sec sec--mint" aria-labelledby="brd-h">
  <div class="wrap">
    <p class="eyebrow">Boards</p>
    <h2 class="h2" id="brd-h">Every major board covered</h2>
    ${boardCards()}
  </div>
</section>

<section class="sec" aria-labelledby="sub-h">
  <div class="wrap">
    <p class="eyebrow">Subjects</p>
    <h2 class="h2" id="sub-h">Expert tutors for every subject</h2>
    ${subjectCards(subjects.slice(0, 8))}
    <p class="center"><a class="btn btn--outline" href="/subjects/">See all subjects</a></p>
  </div>
</section>

<section class="sec sec--alt" aria-labelledby="exam-h">
  <div class="wrap">
    <p class="eyebrow">Competitive exams</p>
    <h2 class="h2" id="exam-h">JEE, NEET, CUET & Olympiad home coaching</h2>
    <div class="cards cards--sm">${exams.map((e) => `<a class="card" href="/exams/${e.slug}/"><h3>${e.name}</h3><p>${e.subjects}</p><span class="card__more">${e.short} tutors →</span></a>`).join('')}</div>
  </div>
</section>

<section class="sec sec--lav" aria-labelledby="why-h">
  <div class="wrap visual-band">
    <div class="illo-wrap">
      ${homeScene}
      <span class="float float--a"><i>🛡️</i>Verified tutor</span>
      <span class="float float--b"><i>⭐</i>Free demo class</span>
      <span class="float float--c"><i>📈</i>Better marks</span>
    </div>
    <div class="why">
    <div>
      <p class="eyebrow">Why Education Hub</p>
      <h2 class="h2" id="why-h">Learning that actually fits your child</h2>
      <p>Every child learns differently. Some need patience, some need a push, some need someone to finally explain fractions in a way that makes sense. We take the time to understand your child before we suggest a tutor — not just their class and subject, but their pace, their goals and your family's schedule.</p>
      <p>Based in <strong>Triveni Nagar, Lucknow</strong>, we work with experienced teachers, subject experts and qualified graduates across the city, so there's always someone close to you.</p>
      <a class="btn btn--primary" href="/about/">More about us</a>
    </div>
    <ul class="why__list">
      <li><b>Personal matching</b><span>We speak to you first and match by teaching style, not just availability.</span></li>
      <li><b>Safety first</b><span>ID and address verification and a face-to-face interview for every tutor.</span></li>
      <li><b>Progress you can see</b><span>Regular tests and parent feedback so you always know where things stand.</span></li>
      <li><b>Easy replacements</b><span>Not the right fit? We'll arrange another tutor at no extra cost.</span></li>
    </ul>
    </div>
  </div>
</section>

<section class="sec sec--alt" aria-labelledby="area-h">
  <div class="wrap">
    <p class="eyebrow">Service areas</p>
    <h2 class="h2" id="area-h">Home tutors across Lucknow</h2>
    <p class="sub">Most localities in Lucknow covered — here are some of the areas we serve most.</p>
    ${areaChips()}
  </div>
</section>

<section class="sec sec--alt" aria-labelledby="seo-h">
  <div class="wrap narrow prose">
    <h2 id="seo-h">Home tuition in Lucknow — how Education Hub helps</h2>
    <p>Searching for a <strong>home tutor near me in Lucknow</strong> usually means calling a dozen numbers and hoping someone reliable turns up. Education Hub Home Tutors makes it simple: one call or WhatsApp message to <a href="${tel}">${SITE.phoneDisplay}</a>, and we shortlist a verified tutor who suits your child's class, board, subjects and timing.</p>
    <p>We arrange <a href="/classes/">home tuition for every class</a> — from <a href="/classes/nursery/">nursery</a> and <a href="/classes/ukg/">UKG</a> to <a href="/classes/class-10/">Class 10</a> and <a href="/classes/class-12/">Class 12</a> — across <a href="/boards/cbse/">CBSE</a>, <a href="/boards/icse/">ICSE</a>, <a href="/boards/up-board/">UP Board</a>, <a href="/boards/ib/">IB</a> and <a href="/boards/igcse/">IGCSE</a>. Senior students get dedicated <a href="/exams/jee/">JEE</a>, <a href="/exams/neet/">NEET</a> and <a href="/exams/cuet/">CUET</a> tutors, and adults can join one-to-one <a href="/subjects/spoken-english/">spoken English</a> classes.</p>
    <p>Our office is at ${esc(addressLine)}, close to Sitapur Road, Aliganj and Kapoorthala, and our tutors travel across the city — <a href="/areas/gomti-nagar/">Gomti Nagar</a>, <a href="/areas/indira-nagar/">Indira Nagar</a>, <a href="/areas/jankipuram/">Jankipuram</a>, <a href="/areas/mahanagar/">Mahanagar</a>, <a href="/areas/alambagh/">Alambagh</a>, <a href="/areas/ashiyana/">Ashiyana</a> and <a href="/areas/">many more areas</a>.</p>
    <p lang="hi"><strong>लखनऊ में होम ट्यूटर चाहिए?</strong> Education Hub आपके घर पर अनुभवी और वेरिफाइड ट्यूटर भेजता है — कक्षा 1 से 12, CBSE, ICSE, UP Board, JEE और NEET के लिए। पहली डेमो क्लास बिल्कुल फ्री है। कॉल या WhatsApp करें: ${SITE.phoneDisplay}।</p>
  </div>
</section>

${testimonialsBlock()}
${faqBlock(faqs)}
${finalCta}
`,
});

// ---------- Subjects ----------

page({
  url: '/subjects/',
  current: '/subjects/',
  title: 'Subject-wise Home Tutors in Lucknow | Maths, Science, English',
  description:
    'Hire expert home tutors in Lucknow for Maths, Physics, Chemistry, Biology, English, Hindi, Computer Science, Accounts and more. Free demo class.',
  h1: 'Subject-wise home tutors in Lucknow',
  schema: [
    itemListSchema(
      'Subjects',
      subjects.map((s) => [`${s.name} home tutor`, `/subjects/${s.slug}/`]),
    ),
  ],
  crumbs: [
    ['Home', '/'],
    ['Subjects', '/subjects/'],
  ],
  body: `<section class="sec"><div class="wrap"><p class="eyebrow">All subjects</p><h2 class="h2">Choose a subject to find your tutor</h2>${subjectCards()}</div></section>${steps}${ctaBand()}`,
});

for (const s of subjects) {
  const url = `/subjects/${s.slug}/`;
  const sFaqs = [
    {
      q: `How much does a ${s.name} home tutor cost in Lucknow?`,
      a: `Fees depend on the class and number of sessions per week. For school classes a ${s.name} tutor typically costs between ₹2,000 and ₹8,000 per month. We confirm the exact fee before the free demo.`,
    },
    {
      q: `Do you have ${s.name} tutors for CBSE, ICSE and UP Board?`,
      a: `Yes. Our ${s.name} tutors teach all major boards in Lucknow, and we match the tutor to your child's board and textbooks.`,
    },
    { q: `Can I get a female ${s.name} tutor?`, a: 'Yes, just mention your preference while booking and we will match accordingly.' },
    {
      q: `Is online ${s.name} tuition available?`,
      a: `Yes, ${s.name} classes can also be held online over Google Meet or Zoom if home visits don't suit you.`,
    },
  ];
  page({
    url,
    current: '/subjects/',
    title: `${s.name} Home Tutor in Lucknow | Free Demo | Education Hub`,
    description: `Verified ${s.name} home tutors in Lucknow for all classes and boards. ${s.blurb} Book a free demo class today.`.slice(0, 158),
    h1: `${s.name} home tutor in Lucknow`,
    crumbs: [
      ['Home', '/'],
      ['Subjects', '/subjects/'],
      [s.name, url],
    ],
    schema: [faqSchema(sFaqs), serviceSchema(`${s.name} Home Tuition in Lucknow`, s.blurb, url)],
    body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    <h2>Why hire a ${s.name} home tutor?</h2>
    <p>${esc(s.why)}</p>
    <h2>What our ${s.name} tutors cover</h2>
    <ul class="ticks ticks--cols">${s.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <h2>Classes and boards</h2>
    <p>We provide ${s.name} tutors for ${s.slug === 'spoken-english' ? 'school students, college students, working professionals and homemakers' : 'every relevant class from primary school to Class 12 and beyond'}, across CBSE, ICSE, UP Board, IB and IGCSE. Tell us the textbook your school uses and we'll match a tutor who knows it well.</p>
    <h2>Find a ${s.name} tutor near you</h2>
    <p>Popular areas: ${areas
      .slice(0, 10)
      .map((a) => `<a href="/areas/${a.slug}/">${s.name} tutor in ${a.name}</a>`)
      .join(', ')}.</p>
  </article>
  <aside class="sticky">${leadForm(`${s.name} tutor`)}</aside>
</div></section>
<section class="sec sec--alt"><div class="wrap"><h2 class="h2">Other subjects</h2>${subjectCards(subjects.filter((x) => x.slug !== s.slug).slice(0, 4))}</div></section>
${faqBlock(sFaqs, `${s.name} tuition — FAQs`)}
${ctaBand(`Book a free ${s.name} demo class`)}`,
  });
}

// ---------- Classes ----------

page({
  url: '/classes/',
  current: '/classes/',
  title: 'Class-wise Home Tutors in Lucknow | Nursery to Class 12, JEE, NEET',
  description: 'Home tutors in Lucknow for Play Group, Nursery, LKG, UKG, Class 1 to 12, JEE, NEET, diploma and college subjects. Book a free demo class.',
  h1: 'Class-wise home tutors in Lucknow',
  schema: [
    itemListSchema(
      'Classes',
      classes.map((c) => [`${c.name} home tutor`, `/classes/${c.slug}/`]),
    ),
  ],
  crumbs: [
    ['Home', '/'],
    ['Classes', '/classes/'],
  ],
  body: `<section class="sec"><div class="wrap"><p class="eyebrow">All classes</p><h2 class="h2">Pick your child's class</h2>${classGrid()}</div></section>${steps}${ctaBand()}`,
});

const feeFor = (c) => {
  const n = parseInt(c.slug.replace('class-', ''), 10);
  if (c.group === 'pre') return fees[0];
  if (c.group === 'primary') return fees[1];
  if (c.group === 'middle') return fees[2];
  if (n === 9 || n === 10) return fees[3];
  if (n === 11 || n === 12) return fees[4];
  if (c.slug === 'jee-neet') return fees[5];
  return { range: '₹5,000 – ₹12,000', note: 'per month, depending on the course' };
};

for (const c of classes) {
  const url = `/classes/${c.slug}/`;
  const relevant =
    c.group === 'pre'
      ? subjects.filter((s) => ['english', 'mathematics', 'hindi'].includes(s.slug))
      : c.group === 'primary'
        ? subjects.filter((s) => ['mathematics', 'english', 'science', 'hindi'].includes(s.slug))
        : c.group === 'middle'
          ? subjects.filter((s) => ['mathematics', 'science', 'english', 'social-science'].includes(s.slug))
          : subjects.filter((s) => ['mathematics', 'physics', 'chemistry', 'biology', 'accountancy', 'english'].includes(s.slug));
  const cFaqs = [
    {
      q: `What is the fee for a ${c.name} home tutor in Lucknow?`,
      a: `It depends on the number of subjects, days per week and the tutor's experience. A typical range is ${feeFor(c).range} ${feeFor(c).note}. We confirm the exact fee before the free demo.`,
    },
    { q: `Do you have ${c.name} tutors for all boards?`, a: 'Yes — CBSE, ICSE, UP Board, IB, IGCSE and NIOS.' },
    { q: 'How soon can the tutor start?', a: 'In most areas of Lucknow we arrange a free demo within 24 hours of your enquiry.' },
  ];
  page({
    url,
    current: '/classes/',
    title: `${c.name} Home Tutor in Lucknow | Free Demo | Education Hub`,
    description: `Experienced ${c.name} home tutors in Lucknow. ${c.focus} Free demo class at home.`.slice(0, 158),
    h1: `${c.name} home tutor in Lucknow`,
    crumbs: [
      ['Home', '/'],
      ['Classes', '/classes/'],
      [c.name, url],
    ],
    schema: [faqSchema(cFaqs), serviceSchema(`${c.name} Home Tuition in Lucknow`, c.focus, url)],
    body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    <h2>What ${c.name} students need</h2>
    <p>${esc(c.focus)}</p>
    <p>Our ${c.name} tutors build a simple weekly plan around your child's school timetable — covering homework, upcoming tests and the topics they find hardest. Parents get regular updates so nothing comes as a surprise at PTM time.</p>
    <h2>Subjects for ${c.name}</h2>
    ${subjectCards(relevant)}
    <h2>Boards we cover</h2>
    <p>${boards.map((b) => `<a href="/boards/${b.slug}/">${b.name}</a>`).join(' · ')}</p>
    <h2>${c.name} tutors near you</h2>
    ${areaChips(areas.slice(0, 9))}
  </article>
  <aside class="sticky">${leadForm(`${c.name} tutor`)}</aside>
</div></section>
${faqBlock(cFaqs, `${c.name} tuition — FAQs`)}
${ctaBand(`Book a free ${c.name} demo class`)}`,
  });
}

// ---------- Boards ----------

for (const b of boards) {
  const url = `/boards/${b.slug}/`;
  page({
    url,
    current: '/classes/',
    title: `${b.name} Home Tutors in Lucknow | ${b.full} | Education Hub`.slice(0, 70),
    description: `Experienced ${b.name} home tutors in Lucknow for all classes and subjects. Board-focused teaching, regular tests and a free demo class.`,
    h1: `${b.name} home tutors in Lucknow`,
    crumbs: [
      ['Home', '/'],
      ['Boards', '/classes/'],
      [b.name, url],
    ],
    schema: [serviceSchema(`${b.name} Home Tuition in Lucknow`, b.about, url)],
    body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    <p class="tag">${esc(b.full)}</p>
    <h2>About ${b.name} tuition</h2>
    <p>${esc(b.about)}</p>
    <h2>How our ${b.name} tutors help</h2>
    <ul class="ticks">${b.help.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <h2>Popular ${b.name} classes</h2>
    <div class="chips">${classes
      .filter((c) => ['primary', 'middle', 'board'].includes(c.group))
      .map((c) => `<a class="chip" href="/classes/${c.slug}/"><b>${c.name}</b><small>${b.name}</small></a>`)
      .join('')}</div>
  </article>
  <aside class="sticky">${leadForm(`${b.name} tutor`)}</aside>
</div></section>
<section class="sec sec--alt"><div class="wrap"><h2 class="h2">Other boards</h2>${boardCards()}</div></section>
${ctaBand()}`,
  });
}

// ---------- Exams ----------

for (const e of exams) {
  const url = `/exams/${e.slug}/`;
  const eFaqs = [
    {
      q: `Is home tuition good for ${e.short} preparation?`,
      a: `Yes. Many students combine coaching with a ${e.short} home tutor for daily doubt-solving and weak topics. Others prefer only home tuition for full personal attention.`,
    },
    { q: `Who are your ${e.short} tutors?`, a: `Experienced faculty and subject experts with a strong record in ${e.subjects}. We match by subject strength.` },
    { q: 'Can I take only one subject?', a: 'Yes, you can hire a tutor for a single subject or for all subjects.' },
  ];
  page({
    url,
    current: '/classes/',
    title: `${e.short} Home Tutor in Lucknow | One-to-One Coaching | Education Hub`,
    description: `One-to-one ${e.name} home coaching in Lucknow for ${e.subjects}. Personal study plans, mock tests and daily doubt-solving. Free demo.`.slice(
      0,
      158,
    ),
    h1: `${e.name} home tutors in Lucknow`,
    crumbs: [
      ['Home', '/'],
      ['Exams', '/classes/'],
      [e.short, url],
    ],
    schema: [faqSchema(eFaqs), serviceSchema(`${e.name} Home Coaching in Lucknow`, e.about, url)],
    body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    <h2>Personal ${e.short} coaching at home</h2>
    <p>${esc(e.about)}</p>
    <h2>What you get</h2>
    <ul class="ticks">${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  </article>
  <aside class="sticky">${leadForm(`${e.short} tutor`)}</aside>
</div></section>
${faqBlock(eFaqs, `${e.short} coaching — FAQs`)}
${ctaBand(`Start your ${e.short} preparation today`)}`,
  });
}

// ---------- Areas ----------

page({
  url: '/areas/',
  current: '/areas/',
  title: 'Home Tutors Near Me in Lucknow | All Areas Covered | Education Hub',
  description: 'Find a home tutor near you in Lucknow — Triveni Nagar, Aliganj, Gomti Nagar, Indira Nagar, Jankipuram, Mahanagar, Alambagh and more.',
  h1: 'Home tutors near you in Lucknow',
  schema: [
    itemListSchema(
      'Areas served in Lucknow',
      areas.map((a) => [`Home tutor in ${a.name}`, `/areas/${a.slug}/`]),
    ),
  ],
  crumbs: [
    ['Home', '/'],
    ['Areas', '/areas/'],
  ],
  body: `<section class="sec"><div class="wrap">${areaChips()}<p class="sub">Don't see your area? We cover most of Lucknow — <a href="/contact/">just ask</a>.</p></div></section>${ctaBand()}`,
});

for (const a of areas) {
  const url = `/areas/${a.slug}/`;
  const aFaqs = [
    { q: `How quickly can I get a home tutor in ${a.name}?`, a: `In ${a.name} we usually arrange a free demo class within 24 hours of your enquiry.` },
    { q: `Do you have female tutors in ${a.name}?`, a: `Yes, we have both female and male tutors available in and around ${a.name}.` },
    {
      q: `What is the home tuition fee in ${a.name}, Lucknow?`,
      a: 'Fees depend on class and subjects, typically ₹2,000–₹10,000 per month for school classes. We share the exact fee before the demo.',
    },
  ];
  page({
    url,
    current: '/areas/',
    title: `Home Tutor in ${a.name}, Lucknow | Free Demo | Education Hub`,
    description: `Verified home tutors in ${a.name}, Lucknow for Class 1–12, CBSE, ICSE, UP Board, JEE & NEET. Female & male tutors. Free demo within 24 hours.`,
    h1: `Home tutor in ${a.name}, Lucknow`,
    crumbs: [
      ['Home', '/'],
      ['Areas', '/areas/'],
      [a.name, url],
    ],
    schema: [faqSchema(aFaqs), serviceSchema(`Home Tuition in ${a.name}, Lucknow`, `Home tutors in ${a.name}, ${a.zone}, Lucknow.`, url, `${a.name}, Lucknow`)],
    body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    <p class="tag">${esc(a.zone)}</p>
    <h2>Trusted home tuition in ${a.name}</h2>
    <p>${esc(a.note)}</p>
    <p>We send tutors to homes across ${a.name} and nearby — ${a.near.map(esc).join(', ')}. Whether your child needs help with primary-class homework, board exam preparation or JEE/NEET, we'll match a tutor who lives close by, so classes are regular and on time.</p>
    <h2>Popular tuition in ${a.name}</h2>
    <ul class="ticks ticks--cols">
      <li><a href="/subjects/mathematics/">Maths tutor</a></li><li><a href="/subjects/science/">Science tutor</a></li>
      <li><a href="/subjects/english/">English tutor</a></li><li><a href="/classes/class-10/">Class 10 tutor</a></li>
      <li><a href="/classes/class-12/">Class 12 tutor</a></li><li><a href="/exams/jee/">JEE tutor</a></li>
      <li><a href="/exams/neet/">NEET tutor</a></li><li><a href="/subjects/spoken-english/">Spoken English</a></li>
    </ul>
    <h2>Nearby areas</h2>
    ${areaChips(areas.filter((x) => x.slug !== a.slug && (x.zone === a.zone || a.near.some((n) => n.includes(x.name)))).slice(0, 6))}
  </article>
  <aside class="sticky">${leadForm(`Tutor in ${a.name}`)}</aside>
</div></section>
${faqBlock(aFaqs, `Home tuition in ${a.name} — FAQs`)}
${ctaBand(`Find your tutor in ${a.name}`)}`,
  });
}

// ---------- Core pages ----------

page({
  url: '/about/',
  current: '/about/',
  title: 'About Us | Education Hub Home Tutors, Lucknow',
  description:
    'Education Hub Home Tutors connects Lucknow families with verified, experienced home tutors. Learn about our story, values and how we choose tutors.',
  h1: 'About Education Hub Home Tutors',
  crumbs: [
    ['Home', '/'],
    ['About', '/about/'],
  ],
  schema: [{ '@context': 'https://schema.org', '@type': 'AboutPage', url: abs('/about/'), about: { '@id': orgId } }],
  body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    ${homeScene}
    <h2>Our story</h2>
    <p>Education Hub Home Tutors started in Triveni Nagar, Lucknow with a simple idea: finding a good tutor shouldn't depend on luck or on who your neighbour knows. Parents deserve a reliable way to find someone qualified, safe and genuinely invested in their child's progress.</p>
    <p>Today we work with teachers and subject experts across Lucknow — from patient pre-primary educators to senior JEE and NEET faculty — and match them carefully with families who need them.</p>
    <h2>What we believe</h2>
    <ul class="ticks">
      <li><b>Learn today.</b> Strong basics beat last-minute cramming.</li>
      <li><b>Grow every day.</b> Small, steady improvement adds up.</li>
      <li><b>Succeed tomorrow.</b> Confidence and good habits last longer than any exam.</li>
    </ul>
    <h2>How we choose tutors</h2>
    <p>Every tutor goes through ID and address verification, a qualification check, a subject test and a face-to-face interview. We also take feedback from parents after the demo and during classes, and only tutors who keep that feedback strong stay with us.</p>
    <h2>Visit us</h2>
    <p>${esc(addressLine)}. Call <a href="${tel}">${SITE.phoneDisplay}</a> — ${SITE.hoursDisplay}.</p>
  </article>
  <aside class="sticky">${leadForm('About page')}</aside>
</div></section>
${steps}${ctaBand()}`,
});

page({
  url: '/get-tutor/',
  current: '/get-tutor/',
  title: 'Book a Free Demo Class | Get a Home Tutor in Lucknow | Education Hub',
  description:
    'Request a verified home tutor in Lucknow in under a minute. Free demo class, no advance payment, male & female tutors for all classes and boards.',
  h1: 'Get a home tutor in Lucknow',
  crumbs: [
    ['Home', '/'],
    ['Get a Tutor', '/get-tutor/'],
  ],
  body: `<section class="sec"><div class="wrap narrow">${leadForm('Get tutor page')}</div></section>${trustStrip}${steps}`,
});

page({
  url: '/become-a-tutor/',
  current: '/become-a-tutor/',
  title: 'Become a Home Tutor in Lucknow | Tuition Jobs | Education Hub',
  description:
    'Join Education Hub as a home tutor in Lucknow. Get tuition leads near your home, flexible timings and timely payments. Register free on WhatsApp.',
  h1: 'Become a home tutor with Education Hub',
  crumbs: [
    ['Home', '/'],
    ['Become a Tutor', '/become-a-tutor/'],
  ],
  body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
    ${tutorScene}
    <h2>Why teach with us</h2>
    <ul class="ticks">
      <li>Tuition leads close to where you live</li>
      <li>Choose your own classes, subjects and timings</li>
      <li>Free registration — no joining fee</li>
      <li>Support from our team for any parent issues</li>
    </ul>
    <h2>Who can apply</h2>
    <p>Graduates, postgraduates, B.Ed / D.El.Ed holders, working teachers, engineers, doctors and subject experts living in Lucknow. College students with strong subject knowledge can apply for primary and middle classes.</p>
    <h2>How it works</h2>
    <ol>
      <li>Register using the form.</li>
      <li>Share ID, address proof and qualification documents.</li>
      <li>Short interview and subject check.</li>
      <li>Start receiving tuition leads near you.</li>
    </ol>
    <p>Already registered? See <a href="/tuition-jobs/">current tuition jobs</a>.</p>
  </article>
  <aside class="sticky">
  <form class="lead" data-tutor novalidate>
    <h2 class="lead__title">Tutor registration</h2>
    <label>Full name<input name="name" required minlength="2" autocomplete="name"></label>
    <label>Mobile number<input name="phone" type="tel" inputmode="numeric" required pattern="[6-9][0-9]{9}" maxlength="10"></label>
    <label>Qualification<input name="qualification" required placeholder="e.g. M.Sc Physics, B.Ed"></label>
    <label>Subjects you teach<input name="subjects" required placeholder="e.g. Maths, Physics"></label>
    <label>Classes you teach<input name="classes" placeholder="e.g. Class 6–12"></label>
    <label>Your area<select name="area" required><option value="">Select</option>${areaOptions()}</select></label>
    <label>Experience<select name="experience"><option>Fresher</option><option>1–3 years</option><option>3–5 years</option><option>5+ years</option></select></label>
    <p class="lead__err" role="alert" hidden></p>
    <button class="btn btn--primary btn--block" type="submit">Register on WhatsApp →</button>
  </form>
  </aside>
</div></section>`,
});

page({
  url: '/tuition-jobs/',
  current: '/tuition-jobs/',
  title: 'Home Tuition Jobs in Lucknow | Latest Tutor Vacancies | Education Hub',
  description: 'Latest home tuition jobs in Lucknow for all classes and subjects. Apply on WhatsApp and start teaching near your home.',
  h1: 'Home tuition jobs in Lucknow',
  crumbs: [
    ['Home', '/'],
    ['Tuition Jobs', '/tuition-jobs/'],
  ],
  body: `
<section class="sec"><div class="wrap">
  <div class="jobs" id="jobs" data-jobs-src="/jobs.json" aria-live="polite"></div>
  <div class="empty" id="jobs-empty" hidden>
    <h2>New tuition jobs every week</h2>
    <p>Fresh requirements come in daily. Register as a tutor and we'll send matching jobs in your area straight to WhatsApp.</p>
    <p><a class="btn btn--primary" href="/become-a-tutor/">Register as Tutor</a> <a class="btn btn--outline" href="${wa('Hi Education Hub, I am a tutor looking for tuition jobs in Lucknow. Please share jobs in my area.')}" target="_blank" rel="noopener">Get Jobs on WhatsApp</a></p>
  </div>
</div></section>`,
});

page({
  url: '/fees/',
  current: '/fees/',
  title: 'Home Tuition Fees in Lucknow 2026 | Class-wise Charges | Education Hub',
  description:
    'Transparent home tuition fees in Lucknow for Play Group to Class 12, JEE, NEET and Spoken English. Typical monthly ranges and what affects the price.',
  h1: 'Home tuition fees in Lucknow',
  crumbs: [
    ['Home', '/'],
    ['Fees', '/fees/'],
  ],
  body: `
<section class="sec"><div class="wrap">
  <div class="fees">${fees.map((f) => `<div class="fee"><h2>${esc(f.level)}</h2><p class="fee__amt">${esc(f.range)}</p><p>${esc(f.note)}</p></div>`).join('')}</div>
  <div class="prose narrow">
    <h2>What affects the fee?</h2>
    <ul class="ticks">
      <li>Class level and number of subjects</li>
      <li>Days per week and length of each session</li>
      <li>Tutor's qualification and experience</li>
      <li>Distance and travel time</li>
    </ul>
    <p>These are typical ranges, not fixed prices. We always confirm the exact fee before your free demo class — no registration fee and no hidden charges.</p>
  </div>
</div></section>
${ctaBand('Get an exact quote for your child')}`,
});

page({
  url: '/contact/',
  current: '/contact/',
  title: 'Contact Education Hub Home Tutors | Triveni Nagar, Lucknow',
  description: `Call ${SITE.phoneDisplay} or visit us at ${addressLine}. Open ${SITE.hoursDisplay}.`,
  h1: 'Contact us',
  crumbs: [
    ['Home', '/'],
    ['Contact', '/contact/'],
  ],
  schema: [{ '@context': 'https://schema.org', '@type': 'ContactPage', url: abs('/contact/'), about: { '@id': orgId } }],
  body: `
<section class="sec"><div class="wrap split">
  <div class="prose">
    <h2>Talk to us</h2>
    <ul class="contact">
      <li><span>📞</span><div><b>Phone</b><a href="${tel}">${SITE.phoneDisplay}</a></div></li>
      <li><span>💬</span><div><b>WhatsApp</b><a href="${wa('Hi Education Hub!')}" target="_blank" rel="noopener">Chat with us</a></div></li>
      <li><span>✉️</span><div><b>Email</b><a href="mailto:${SITE.email}">${SITE.email}</a></div></li>
      <li><span>📍</span><div><b>Office</b><address>${esc(addressLine)}</address></div></li>
      <li><span>🕘</span><div><b>Hours</b>${SITE.hoursDisplay}</div></li>
    </ul>
    <div class="map"><iframe title="Map to ${esc(SITE.name)}" src="https://maps.google.com/maps?q=${encodeURIComponent('Triveni Nagar 3rd, Lucknow 226020')}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div>
  <aside class="sticky">${leadForm('Contact page')}</aside>
</div></section>`,
});

// ---------- Blog ----------

page({
  url: '/blog/',
  current: '/blog/',
  title: 'Study Tips & Parenting Guides | Education Hub Blog',
  description: 'Practical study tips, board exam plans and guides for Lucknow parents choosing a home tutor.',
  h1: 'Education Hub blog',
  schema: [
    itemListSchema(
      'Blog posts',
      posts.map((p) => [p.title, `/blog/${p.slug}/`]),
    ),
  ],
  crumbs: [
    ['Home', '/'],
    ['Blog', '/blog/'],
  ],
  body: `<section class="sec"><div class="wrap"><div class="cards cards--3">${posts
    .map(
      (p) =>
        `<a class="card" href="/blog/${p.slug}/"><time datetime="${p.date}">${new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time><h2 class="h3">${esc(p.title)}</h2><p>${esc(p.description)}</p><span class="card__more">Read more →</span></a>`,
    )
    .join('')}</div></div></section>`,
});

for (const p of posts) {
  const url = `/blog/${p.slug}/`;
  page({
    url,
    current: '/blog/',
    ogType: 'article',
    lastmod: p.date,
    title: p.title,
    description: p.description,
    crumbs: [
      ['Home', '/'],
      ['Blog', '/blog/'],
      [p.title, url],
    ],
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.description,
        datePublished: p.date,
        dateModified: p.date,
        url: abs(url),
        mainEntityOfPage: abs(url),
        inLanguage: SITE.lang,
        image: abs('/assets/logo-full.jpg'),
        author: { '@id': orgId },
        publisher: { '@id': orgId },
      },
    ],
    body: `
<article class="sec"><div class="wrap narrow prose">
  <h1>${esc(p.title)}</h1>
  <p class="meta"><time datetime="${p.date}">${new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · ${esc(SITE.name)}</p>
  ${p.body.map(([tag, text]) => `<${tag}>${esc(text)}</${tag}>`).join('\n  ')}
</div></article>
${ctaBand()}`,
  });
}

// ---------- Legal ----------

const legal = {
  'privacy-policy': [
    'Privacy Policy',
    [
      [
        'What we collect',
        "When you fill a form or contact us we collect your name, phone number, area, and your child's class and subjects. Tutors also share identity, address and qualification documents.",
      ],
      ['How we use it', 'Only to match you with a tutor (or students), arrange demo classes, and contact you about your request. We do not sell your data.'],
      ['Sharing', "A parent's area and requirement are shared with shortlisted tutors. Phone numbers are shared only once a demo is agreed."],
      ['WhatsApp', "Our forms open WhatsApp with your details pre-filled. Messages are handled under WhatsApp's own privacy policy."],
      ['Your choices', `You can ask us to update or delete your information at any time by calling ${SITE.phoneDisplay} or emailing ${SITE.email}.`],
    ],
  ],
  'terms-conditions': [
    'Terms & Conditions',
    [
      ['Our role', 'Education Hub Home Tutors connects parents and students with independent tutors. Tutors are not our employees.'],
      ['Demo class', 'The first demo class is free. Regular classes begin only after both sides agree.'],
      ['Fees', 'Fees are agreed before classes begin and are paid monthly in advance unless otherwise agreed.'],
      ['Conduct', 'Parents and tutors are expected to treat each other with respect. We may remove any tutor or decline any request at our discretion.'],
      ['Changes', 'We may update these terms. The latest version is always on this page.'],
    ],
  ],
  'refund-policy': [
    'Refund Policy',
    [
      ['Demo class', 'The demo class is free, so no payment is taken before it.'],
      ['Tutor replacement', 'If you are not satisfied, we will arrange a replacement tutor at no extra cost.'],
      ['Refunds', 'If classes stop because of the tutor before the paid period ends, the unused amount is adjusted or refunded on a pro-rata basis.'],
      ['How to request', `Call ${SITE.phoneDisplay} or email ${SITE.email} with your details.`],
    ],
  ],
  disclaimer: [
    'Disclaimer',
    [
      ['General', 'Information on this website is for general guidance. Fee ranges are indicative and may change.'],
      [
        'Results',
        "Tutoring improves learning but individual results depend on many factors, including the student's effort. We do not guarantee specific marks or ranks.",
      ],
      ['Third parties', 'Board and exam names belong to their respective organisations. We are not affiliated with any board or exam body.'],
    ],
  ],
};

for (const [slug, [name, sections]] of Object.entries(legal)) {
  page({
    url: `/${slug}/`,
    title: `${name} | ${SITE.name}`,
    description: `${name} of ${SITE.name}, Lucknow — how we handle enquiries, tutors, fees and your information.`,
    h1: name,
    crumbs: [
      ['Home', '/'],
      [name, `/${slug}/`],
    ],
    body: `<section class="sec"><div class="wrap narrow prose"><p class="meta">Last updated: ${BUILD_DATE}</p>${sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join('')}</div></section>`,
  });
}

page({
  url: '/404.html',
  title: `Page not found | ${SITE.name}`,
  description: 'This page could not be found.',
  h1: 'Page not found',
  noindex: true,
  body: `<section class="sec"><div class="wrap narrow center"><p>The page you are looking for has moved or doesn't exist.</p><p><a class="btn btn--primary" href="/">Go to homepage</a> <a class="btn btn--outline" href="/get-tutor/">Book a free demo</a></p></div></section>`,
});

// ---------- Write output ----------

fs.rmSync(DIST, { recursive: true, force: true });
for (const p of pages) {
  const file = p.url.endsWith('.html') ? path.join(DIST, p.url) : path.join(DIST, p.url, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, p.html);
}

fs.cpSync(path.join(SRC, 'assets'), path.join(DIST, 'assets'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'main.js'), fs.readFileSync(path.join(SRC, 'main.js'), 'utf8').replace('__WHATSAPP__', SITE.whatsapp));
fs.copyFileSync(path.join(SRC, 'jobs.json'), path.join(DIST, 'jobs.json'));

const sitemapUrls = pages.filter((p) => !p.noindex);
fs.writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((p) => `  <url><loc>${abs(p.url)}</loc><lastmod>${p.lastmod || BUILD_DATE}</lastmod><priority>${p.url === '/' ? '1.0' : p.url.split('/').length > 3 ? '0.7' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`,
);

fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${abs('/sitemap.xml')}
`,
);

fs.writeFileSync(
  path.join(DIST, 'site.webmanifest'),
  JSON.stringify(
    {
      name: SITE.name,
      short_name: SITE.shortName,
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#0b2a6f',
      icons: [
        { src: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { src: '/assets/logo-512.jpg', sizes: '512x512', type: 'image/jpeg' },
      ],
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(DIST, 'llms.txt'),
  `# ${SITE.name}

> Verified one-to-one home tutors in Lucknow, Uttar Pradesh, India for Play Group to Class 12, CBSE, ICSE, UP Board, IB, IGCSE, NIOS, JEE, NEET, CUET and Spoken English. Free demo class.

- Phone / WhatsApp: ${SITE.phoneDisplay} (${SITE.phone})
- Address: ${addressLine}
- Hours: ${SITE.hoursDisplay}

## Key pages
- [Book a free demo](${abs('/get-tutor/')})
- [Fees](${abs('/fees/')})
- [Subjects](${abs('/subjects/')}): ${subjects.map((s) => s.name).join(', ')}
- [Classes](${abs('/classes/')})
- [Areas served](${abs('/areas/')}): ${areas.map((a) => a.name).join(', ')}
- [Become a tutor](${abs('/become-a-tutor/')})
- [Contact](${abs('/contact/')})
`,
);

console.log(`Built ${pages.length} pages → ${path.relative(process.cwd(), DIST) || DIST}`);

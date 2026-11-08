// Static site generator: `node src/build.js` writes the full site to dist/.
// No dependencies on purpose — any static host (Netlify, Vercel, Cloudflare Pages, cPanel) can serve dist/.

const fs = require('fs');
const path = require('path');
const { homeScene, tutorScene } = require('./illustrations');
const { subjectArt, classArt, boardArt, examArt, areaArt, postArt, gallery } = require('./art');
const { icons } = require('./icons');
const { SITE, subjects, classes, boards, exams, areas, faqs, fees, posts, testimonials, tutors } = require('./data');

const SRC = __dirname;
const DIST = path.join(SRC, '..', 'dist');
const BUILD_DATE = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const abs = (p) => SITE.url + p;
// Meta descriptions over ~160 chars get cut by Google; trim at a word boundary instead of mid-word.
const clip = (str, max = 160) => (str.length <= max ? str : `${str.slice(0, str.lastIndexOf(' ', max - 1)).replace(/[,.;:—-]+$/, '')}…`);
const wa = (text) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
const tel = `tel:${SITE.phone}`;
const addressLine = `${SITE.address.street}, ${SITE.address.locality}, ${SITE.address.region} ${SITE.address.postalCode}`;

const pages = [];

// Inlined into every page: one round trip to first paint on slow mobile networks.
// styles.css holds the inner-page components; theme.css (the visual theme) loads after it and wins on conflicts.
const CSS = ['styles.css', 'theme.css']
  .map((f) => fs.readFileSync(path.join(SRC, f), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim();
// The font stylesheet loads without blocking render; the system font stack covers the first paint.
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap';

// ---------- Structured data ----------

const orgId = abs('/#organization');

const businessSchema = {
  '@context': 'https://schema.org',
  '@type': ['EducationalOrganization', 'LocalBusiness'],
  '@id': orgId,
  name: SITE.name,
  alternateName: [SITE.shortName, SITE.domainName],
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
  // Google's "site name" in results reads these; the domain spelling helps people who search for it.
  alternateName: [SITE.shortName, SITE.domainName],
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
  ['About Us', '/about/'],
  ['Subjects', '/subjects/'],
  ['Classes', '/classes/'],
  ['Areas', '/areas/'],
  ['Fees', '/fees/'],
  ['Tuition Jobs', '/tuition-jobs/'],
  ['Blogs', '/blog/'],
];

// Font Awesome names for the icon slots in menus and cards; anything unmapped falls back to a book.
const subjectIcon = {
  mathematics: 'fa-calculator',
  physics: 'fa-atom',
  chemistry: 'fa-flask',
  biology: 'fa-dna',
  science: 'fa-microscope',
  english: 'fa-book-open',
  hindi: 'fa-language',
  'computer-science': 'fa-laptop-code',
  accountancy: 'fa-file-invoice-dollar',
  economics: 'fa-chart-line',
  'social-science': 'fa-earth-asia',
  'spoken-english': 'fa-comments',
};
// Icons are inline SVG (see icons.js); names keep Font Awesome's "fa-" prefix so they can be looked up on fontawesome.com.
const fa = (name) => {
  const [w, d] = icons[name.replace(/^fa-/, '')];
  return `<svg class="ic" viewBox="0 0 ${w} 512" width="1em" height="1em" aria-hidden="true" focusable="false"><path fill="currentColor" d="${d}"/></svg>`;
};
const subjectFa = (slug) => fa(subjectIcon[slug] || 'fa-book');

// Nav items that open a dropdown (desktop: hover/focus, mobile: tap to expand inside the menu panel).
const navSubs = {
  '/subjects/': [
    'Browse by Subject',
    subjects.slice(0, 6).map((s) => [subjectIcon[s.slug] || 'fa-book', s.name, `/subjects/${s.slug}/`]),
    ['Explore All Subjects →', '/subjects/'],
  ],
  '/classes/': [
    'Browse by Class',
    [
      ...classes
        .filter((c) => ['nursery', 'class-5', 'class-8', 'class-10', 'class-12'].includes(c.slug))
        .map((c) => ['fa-graduation-cap', c.name, `/classes/${c.slug}/`]),
      ...exams.slice(0, 2).map((e) => ['fa-bullseye', `${e.short} Coaching`, `/exams/${e.slug}/`]),
    ],
    ['Explore All Classes →', '/classes/'],
  ],
  '/areas/': ['Find Tutors Near You', areas.slice(0, 6).map((a) => ['fa-location-dot', a.name, `/areas/${a.slug}/`]), ['Explore All Areas →', '/areas/']],
};

const waIcon = `<svg class="wa-svg" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#25d366"/><path fill="#fff" d="M16 7a9 9 0 0 0-7.8 13.5L7 25l4.6-1.2A9 9 0 1 0 16 7zm0 16.4c-1.4 0-2.8-.4-4-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A7.4 7.4 0 1 1 16 23.4zm4.1-5.5c-.2-.1-1.3-.7-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1a6 6 0 0 1-3-2.6c-.2-.4.2-.4.7-1.2.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.3-.6 1.5-1.1.2-.5.2-.9.1-1l-.4-.3z"/></svg>`;

function header(current) {
  const links = nav
    .map(([n, u]) => {
      const active = u === current ? ' active' : '';
      const cur = u === current ? ' aria-current="page"' : '';
      const sub = navSubs[u];
      if (!sub) return `<li class="nav-item"><a class="nav-link${active}" href="${u}"${cur}>${n}</a></li>`;
      const [label, items, all] = sub;
      const id = `sub-${u.replace(/\//g, '')}`;
      return `<li class="nav-item dropdown"><a class="nav-link${active}" href="${u}"${cur}>${n}<span class="nav-caret" aria-hidden="true">▾</span></a><button class="sub-toggle" aria-expanded="false" aria-controls="${id}" aria-label="Show ${n} menu"><span aria-hidden="true">▾</span></button>
<div class="dropdown-menu mega-menu" id="${id}"><div class="mega-label">${label}</div><div class="menu-list">${items
        .map(([icon, t, h]) => `<a class="menu-card" href="${h}">${fa(icon)} ${esc(t)}</a>`)
        .join('')}</div><div class="mega-footer"><a href="${all[1]}">${all[0]}</a></div></div></li>`;
    })
    .join('');
  const social = Object.entries(SITE.social).filter(([, url]) => url);
  return `
<a class="skip" href="#main">Skip to content</a>
<div class="topbar">
  <div class="tht-container">
    <div class="tb-row">
      <div class="tb-col">
        <a href="${tel}" class="contact-link">${fa('fa-phone')} ${SITE.phoneDisplay}</a>
        <span class="tb-sep">|</span>
        <a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" class="wa-link" target="_blank" rel="noopener">${waIcon} ${SITE.phoneDisplay}</a>
      </div>
      <div class="tb-col social-links">${
        social.length
          ? social.map(([name, url]) => `<a href="${url}" title="${name}" aria-label="${name}" target="_blank" rel="noopener">${fa(name)}</a>`).join('')
          : `<span class="tb-loc">${fa('fa-location-dot')} Triveni Nagar, Lucknow · ${esc(SITE.hoursDisplay)}</span>`
      }</div>
      <div class="tb-col">
        <a href="/get-tutor/" class="tbtn tbtn-red">${fa('fa-caret-right')} Hire Tutor</a>
        <a href="/become-a-tutor/" class="tbtn">${fa('fa-caret-right')} Join as Tutor</a>
      </div>
    </div>
  </div>
</div>
<div class="gold-bar"></div>
<header class="site-hdr" id="top">
  <nav class="main-navbar" id="mainNav" aria-label="Main">
    <div class="tht-container nav-in">
      <a class="navbar-brand" href="/" title="${esc(SITE.name)} — home">
        <span class="logo-card"><img src="/assets/emblem-112.jpg" width="56" height="42" alt="${esc(SITE.name)} logo" fetchpriority="high"></span>
        <span class="brand-text"><span class="brand-name">${esc(SITE.name)}</span><span class="brand-tag">Lucknow's Trusted Tutors</span></span>
      </a>
      <a href="/get-tutor/" id="mobile-pill">Get Tutor</a>
      <button class="nav-toggler" id="burger" type="button" aria-controls="mainNavCollapse" aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>
      <div id="mainNavCollapse">
        <ul class="nav-menu">${links}<li class="nav-item"><a class="nav-link btn-contact-nav" href="/contact/">Contact Us</a></li></ul>
      </div>
    </div>
  </nav>
</header>`;
}

function footer() {
  const col = (title, items, extra = '') =>
    `<div class="ft-col"><h3>${title}</h3>${items.map(([n, u, cls]) => `<a href="${u}"${cls ? ` class="${cls}"` : ''}>${esc(n)}</a>`).join('')}${extra}</div>`;
  const classLinks = classes.map((c) => [c.name, `/classes/${c.slug}/`]);
  const half = Math.ceil(classLinks.length / 2);
  const classSub = (list) => `<div class="ft-class-sub">${list.map(([n, u]) => `<a href="${u}">${esc(n)}</a>`).join('')}</div>`;
  return `
<footer id="footer">
  <div class="ft-rule"></div>
  <div class="ft-brand">
    <div class="ft-brand-row">
      <div class="ft-logo"><a href="/"><img src="/assets/logo-240.jpg" width="70" height="70" alt="${esc(SITE.name)} logo" loading="lazy" decoding="async"></a></div>
      <div><span class="ft-brand-tagline">${esc(SITE.tagline)}</span></div>
    </div>
    <a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" class="ft-cta" target="_blank" rel="noopener">${fa('fa-whatsapp')} Get a Tutor Today</a>
  </div>
  <div class="ft-grid" style="max-width:1400px;margin:0 auto;">
    ${col('By Subject', [...subjects.slice(0, 8).map((s) => [`${s.short} Tutor`, `/subjects/${s.slug}/`]), ['All Subjects →', '/subjects/', 'ft-hl']])}
    <div class="ft-col"><h3>By Class</h3><div class="ft-class-wrap">${classSub(classLinks.slice(0, half))}${classSub(classLinks.slice(half))}</div></div>
    ${col(
      'By Board',
      boards.map((b) => [b.name.endsWith('Board') ? b.name : `${b.name} Board`, `/boards/${b.slug}/`]),
    )}
    <div class="ft-col">
      <h3>Preference</h3>
      <a href="/get-tutor/" class="ft-pref-link"><span class="ft-pref-badge male">♂</span> Male Tutor</a>
      <a href="/get-tutor/" class="ft-pref-link"><span class="ft-pref-badge female">♀</span> Female Tutor</a>
      <div class="ft-col-divider"></div>
      <h3 class="ft-sub-head">Fees</h3>
      <a href="/fees/">Fee Structure</a>
      <a href="/fees/" class="ft-hl">View Fee Chart →</a>
    </div>
    ${col('Exams', [...exams.map((e) => [`${e.short} Coaching`, `/exams/${e.slug}/`]), ['All Classes →', '/classes/', 'ft-hl']])}
    ${col('Quick Links', [
      ['Home', '/'],
      ['About Us', '/about/'],
      ['Find Tutors', '/get-tutor/'],
      ['Contact', '/contact/'],
      ['Tuition Jobs', '/tuition-jobs/'],
      ['Blog', '/blog/'],
      ['Join as Tutor', '/become-a-tutor/'],
    ])}
    ${col('Legal', [
      ['Privacy Policy', '/privacy-policy/'],
      ['Terms & Conditions', '/terms-conditions/'],
      ['Refund Policy', '/refund-policy/'],
      ['Disclaimer', '/disclaimer/'],
    ])}
    <div class="ft-col">
      <h3>Contact Us</h3>
      <p>${fa('fa-phone')} <a href="${tel}">${SITE.phoneDisplay}</a></p>
      <p>${fa('fa-whatsapp')} <a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" target="_blank" rel="noopener">${SITE.phoneDisplay}</a></p>
      <p>${fa('fa-location-dot')} <span>${esc(SITE.address.street)}, ${esc(SITE.address.locality)}, ${esc(SITE.address.region)} – ${SITE.address.postalCode}</span></p>
      <p>${fa('fa-envelope')} <a href="mailto:${SITE.email}">${SITE.email}</a></p>
      <p class="ft-hours">${fa('fa-clock')} ${esc(SITE.hoursDisplay)}</p>
    </div>
  </div>
  <div class="ft-bottom" style="max-width:1400px;margin:0 auto;">
    <span>© ${new Date().getFullYear()} <span class="ft-brand-name">${esc(SITE.name)}</span> · All Rights Reserved</span>
    <span class="ft-dev">Created with <span aria-label="love">❤️</span> by <a href="https://www.linkedin.com/in/thakursatyam9415" target="_blank" rel="noopener">Satyam Singh</a> &amp; <a href="https://www.neosharks.in/" target="_blank" rel="noopener">Neosharks</a></span>
    <ul class="ft-legal">
      <li><a href="/privacy-policy/">Privacy Policy</a></li>
      <li><a href="/terms-conditions/">Terms</a></li>
      <li><a href="/refund-policy/">Refund Policy</a></li>
      <li><a href="/disclaimer/">Disclaimer</a></li>
    </ul>
  </div>
</footer>
<div class="gotopbtn"><a href="${wa('Hi Education Hub, I need a home tutor in Lucknow.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><path fill="#fff" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.1l-1 1.2c-.2.2-.4.3-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 2.1.9 3 1 4 .8.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5l-.6-.4z"/></svg></a></div>
<div class="gotopbtn-2" id="gotopbtn-2"><a href="${tel}" aria-label="Call ${SITE.phoneDisplay}"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#fff" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg></a></div>`;
}

const areaOptions = () => areas.map((a) => `<option>${esc(a.name)}</option>`).join('') + '<option>Other area in Lucknow</option>';

const classOptions = () => classes.map((c) => `<option>${esc(c.name)}</option>`).join('');

const field = (label, control) => `<label class="tht-field"><span class="tht-label">${label}</span>${control}</label>`;

function formCard(title, sub, inner, footerNote = 'Average response time: <strong>under 30 minutes</strong>') {
  return `
<div class="tht-form-card">
  <div class="tht-form-card__bar" aria-hidden="true"></div>
  <div class="tht-form-card__body">
    <h2 class="tht-form-card__title">${title}</h2>
    <div class="tht-form-card__sub">${fa('fa-bolt')} ${sub}</div>
    ${inner}
  </div>
  <div class="tht-form-card__footer">${fa('fa-clock')} ${footerNote}</div>
</div>`;
}

function leadForm(context = '', id = 'lead') {
  return formCard(
    'Book a Free Demo Class',
    'We call back within 30 minutes',
    `<form class="tht-form" id="${id}" data-lead novalidate>
  <input type="hidden" name="context" value="${esc(context)}">
  ${field('Your Name', '<input class="tht-input" name="name" autocomplete="name" required minlength="2" placeholder="Enter your full name">')}
  ${field('Mobile Number', '<input class="tht-input" name="phone" type="tel" inputmode="numeric" autocomplete="tel" required pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile number">')}
  ${field('Class', `<select class="tht-select" name="class" required><option value="">Choose class</option>${classOptions()}</select>`)}
  ${field('Your Area in Lucknow', `<select class="tht-select" name="area" required><option value="">Choose your locality</option>${areaOptions()}</select>`)}
  ${field('Subjects (optional)', '<input class="tht-input" name="subjects" placeholder="e.g. Maths, Science">')}
  ${field('Tutor Preference', '<select class="tht-select" name="gender"><option>Any</option><option>Female</option><option>Male</option></select>')}
  <p class="lead__err" role="alert" hidden></p>
  <button class="tht-submit" type="submit">${fa('fa-paper-plane')} Get Free Demo Now</button>
  <div class="tht-form-trust">${fa('fa-shield-halved')} <span>100% Free Demo &bull; No Advance Payment &bull; Verified Tutors Only</span></div>
</form>`,
  );
}

const breadcrumbs = (crumbs) =>
  `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol>${crumbs
    .map(([n, u], i) => (i === crumbs.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`))
    .join('')}</ol></nav>`;

// Section heading in the reference style: pill, h2 with one highlighted phrase, optional intro line.
const secHead = (id, pill, title, hl, desc = '') => `
<div class="tht-section__head tht-reveal">
  <div class="tht-pill">${pill}</div>
  <h2 class="tht-h2" id="${id}">${title} <span class="hl">${hl}</span></h2>
  ${desc ? `<p class="tht-section-desc">${desc}</p>` : ''}
</div>`;

const faqBlock = (list, title = 'Frequently Asked') => `
<section class="tht-section" aria-labelledby="faq-h">
  <div class="tht-container">
    ${secHead('faq-h', 'FAQ', esc(title), 'Questions')}
    <div class="tht-faq-wrap tht-reveal">${list
      .map(
        (f, i) =>
          `<div class="tht-faq-item${i === 0 ? ' is-open' : ''}"><button class="tht-faq-q" type="button" aria-expanded="${i === 0}">${esc(f.q)}<span class="tht-faq-icon">${fa('fa-plus')}</span></button><div class="tht-faq-a"><div class="tht-faq-a__inner">${esc(f.a)}</div></div></div>`,
      )
      .join('')}</div>
  </div>
</section>`;

const finalCta = `
<section class="tht-cta" aria-labelledby="cta-h">
  <div class="tht-container">
    <div class="tht-cta__inner">
      <div class="tht-cta__card">
        <div class="tht-cta__badge"><span class="tht-live-dot" aria-hidden="true"></span> Book Today — Free Demo in 24 Hours</div>
        <h2 class="tht-cta__h2" id="cta-h">Start Your Child's<span class="cta-hl"> Learning Journey</span><br> with<span class="cta-hl-gold"> ${esc(SITE.shortName)}</span></h2>
        <p class="tht-cta__desc">Verified, experienced home tutors across Lucknow. No upfront payment, no risk — just a free demo class at your home.</p>
        <div class="tht-cta__stats">
          <div class="tht-cta__stat-item"><div class="tht-cta__stat-num">${subjects.length}+</div><div class="tht-cta__stat-lbl">Subjects</div></div>
          <div class="tht-cta__stat-item"><div class="tht-cta__stat-num">${classes.length}</div><div class="tht-cta__stat-lbl">Class Levels</div></div>
          <div class="tht-cta__stat-item"><div class="tht-cta__stat-num">${boards.length}</div><div class="tht-cta__stat-lbl">Boards</div></div>
          <div class="tht-cta__stat-item"><div class="tht-cta__stat-num">24hr</div><div class="tht-cta__stat-lbl">Tutor Match</div></div>
        </div>
        <div class="tht-cta__btns" style="margin-top:2rem;">
          <a href="${wa('Hi Education Hub 👋 I would like to book a free demo class.')}" target="_blank" rel="noopener" class="tht-cta-btn-primary">${fa('fa-whatsapp')} Book Free Demo Now</a>
          <a href="${tel}" class="tht-cta-btn-secondary">${fa('fa-phone')} Call: ${SITE.phoneDisplay}</a>
        </div>
        <div class="tht-cta__trust">
          <div class="tht-cta__trust-item">✔ 100% Free Demo</div>
          <div class="tht-cta__trust-item">✔ No Advance Payment</div>
          <div class="tht-cta__trust-item">✔ Replace Tutor Anytime</div>
          <div class="tht-cta__trust-item">✔ Verified &amp; Safe</div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const marqueeItems = [
  ['fa-shield-halved', '100% Verified Tutors'],
  ['fa-gift', 'Free Demo Class'],
  ['fa-bolt', '24-Hour Tutor Match'],
  ['fa-school', 'CBSE, ICSE, UP Board, IB'],
  ['fa-bullseye', 'JEE &amp; NEET Specialists'],
  ['fa-person-chalkboard', 'Female &amp; Male Tutors'],
  ['fa-rotate', 'Free Tutor Replacement'],
  ['fa-location-dot', 'Tutors Across Lucknow'],
];
// The list is rendered twice so the CSS loop is seamless; the whole strip is decorative.
const marquee = `
<div class="tht-marquee-wrap" aria-hidden="true">
  <div class="tht-marquee-track">${[...marqueeItems, ...marqueeItems]
    .map(([icon, t]) => `<div class="tht-marquee-item">${fa(icon)} ${t}</div><span class="tht-marquee-dot">·</span>`)
    .join('')}</div>
</div>`;

// Renders nothing until real parent reviews are added to data.js.
const testimonialsBlock = () =>
  testimonials.length
    ? `
<section class="tht-section tht-section--alt" aria-labelledby="testi-h">
  <div class="tht-container">
    ${secHead('testi-h', 'Testimonials', 'What Parents', 'Say About Us', 'Real results, real families — across Lucknow.')}
    <div class="tht-testimonials-grid" id="testi">${testimonials
      .map(
        (t, i) =>
          `<figure class="tht-testi${i === 1 ? ' tht-testi--featured' : ''} tht-reveal"><div class="tht-testi__stars" aria-label="${t.rating} out of 5">${'★'.repeat(t.rating)}</div><blockquote class="tht-testi__text">${esc(t.text)}</blockquote><figcaption class="tht-testi__author"><div class="tht-testi__ava">${esc(initials(t.name))}</div><div><div class="tht-testi__name">${esc(t.name)}</div><div class="tht-testi__role">${esc(t.detail)}</div></div></figcaption></figure>`,
      )
      .join('')}</div>
  </div>
</section>`
    : '';

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// Renders nothing until real tutor profiles are added to data.js.
const tutorsBlock = () =>
  tutors.length
    ? `
<section class="tht-tutors-new" aria-labelledby="tutors-h">
  <div class="tht-container">
    <div class="tht-tutors-new__head">
      <div class="tht-tutors-new__pill">${fa('fa-person-chalkboard')} Tutors</div>
      <h2 class="tht-tutors-new__title" id="tutors-h">Meet Our <span>Top Experts</span></h2>
      <p class="tht-tutors-new__sub">Verified home tutors at your doorstep in Lucknow.</p>
    </div>
    <div class="tht-tutors-new__scroll-wrapper"><div class="tht-tutors-new__scroll" id="tutor-scroll"><div class="tht-tutors-new__track">${tutors
      .map(
        (t) => `<article class="tnt-card">
  <div class="tnt-card__header">
    <div class="tnt-card__avatar">${t.photo ? `<img src="/assets/photos/tutors/${esc(t.photo)}" alt="${esc(t.name)}, home tutor in Lucknow" width="72" height="72" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : esc(initials(t.name))}</div>
    <div class="tnt-card__info">
      <h3 class="tnt-card__name">${esc(t.name)}</h3>
      ${t.subjects ? `<div class="tnt-card__subjects">${esc(t.subjects)}</div>` : ''}
      <div class="tnt-card__verified">${fa('fa-circle-check')} Verified Tutor</div>
    </div>
  </div>
  <div class="tnt-card__body">${[
    t.specialty && `<div class="tnt-card__row exp">${fa('fa-bullseye')} ${esc(t.specialty)}</div>`,
    t.qualification && `<div class="tnt-card__row qual">${fa('fa-graduation-cap')} ${esc(t.qualification)}</div>`,
    t.area && `<div class="tnt-card__row area">${fa('fa-location-dot')} ${esc(t.area)}, Lucknow</div>`,
    t.experience && `<div class="tnt-card__row exp">${fa('fa-medal')} ${esc(t.experience)} experience</div>`,
    (t.mode || t.fee) &&
      `<div class="tnt-card__row" style="background:#eff6ff;color:#1e40af">${fa('fa-house-laptop')} ${[t.mode && esc(t.mode), t.fee && `<strong>${esc(t.fee)}</strong>`].filter(Boolean).join(' · ')}</div>`,
    t.classes && `<div class="tnt-card__row" style="background:#fefce8;color:#713f12">${fa('fa-book-open')} Teaches: ${esc(t.classes)}</div>`,
  ]
    .filter(Boolean)
    .join('')}</div>
  <div class="tnt-card__footer"><a class="tnt-card__btn" href="${wa(`Hi Education Hub 👋 I'd like a free demo with ${t.name}${t.subjects ? ` (${t.subjects})` : ''}.`)}" target="_blank" rel="noopener">Book Free Demo ${fa('fa-arrow-right')}</a></div>
</article>`,
      )
      .join('')}</div></div></div>
    ${
      tutors.length > 1
        ? `    <div class="tht-tutors-nav" data-tutor-nav>
      <button class="tht-tutors-nav__arrow" type="button" data-dir="-1" aria-label="Previous tutor">${fa('fa-arrow-right')}</button>
      <div class="tht-tutors-nav__dots">${tutors.map((t, i) => `<button class="tht-tutors-nav__dot${i ? '' : ' active'}" type="button" data-i="${i}" aria-label="Show ${esc(t.name)}"></button>`).join('')}</div>
      <button class="tht-tutors-nav__arrow" type="button" data-dir="1" aria-label="Next tutor">${fa('fa-arrow-right')}</button>
    </div>`
        : ''
    }
  </div>
</section>`
    : '';

// Shown once per visit on desktop only — Google penalises pop-ups that cover content on mobile.
const welcome = `
<dialog class="welcome" id="welcome" aria-labelledby="welcome-h">
  <button class="welcome__x" type="button" data-close aria-label="Close">✕</button>
  <div class="welcome__head">
    <div class="welcome__hi"><span>✦</span> Welcome to <span>✦</span></div>
    <h2 class="welcome__name" id="welcome-h">Education <span>Hub</span></h2>
    <p class="welcome__sub">Whether you're looking for the right tutor<br>or want to start teaching, choose your path below.</p>
  </div>
  <div class="welcome__grid">
    <div class="welcome__opt welcome__opt--hire"><div class="welcome__ic" aria-hidden="true">👨‍👩‍👧</div><div class="welcome__t">Hire a Tutor</div><div class="welcome__bar"></div><p class="welcome__d">Find verified and experienced tutors for home tuition, online classes and exam preparation.</p><a class="welcome__btn" href="/get-tutor/">Find My Tutor &nbsp;→</a></div>
    <div class="welcome__opt welcome__opt--join"><div class="welcome__ic" aria-hidden="true">🧑‍🏫</div><div class="welcome__t">Join as a Tutor</div><div class="welcome__bar"></div><p class="welcome__d">Start teaching students near you, earn flexible income and grow your tutoring career.</p><a class="welcome__btn" href="/become-a-tutor/">Start Teaching &nbsp;→</a></div>
  </div>
  <div class="welcome__foot"><span>${fa('fa-shield-halved')} Verified &amp; Trusted</span><span>${fa('fa-medal')} Quality Learning</span><span>${fa('fa-lock')} Safe &amp; Secure</span></div>
</dialog>`;

const steps = `
<section class="tht-section tht-section--alt" aria-labelledby="how-h">
  <div class="tht-container">
    ${secHead('how-h', `${fa('fa-gears')} How It Works`, 'Simple, Fast &amp;', 'Effective', 'Four simple steps to get a verified home tutor at your doorstep in Lucknow.')}
    <div class="tht-steps">${[
      ['fa-file-pen', 'Submit Enquiry', 'Share class, subjects, board and your area in Lucknow by form, call or WhatsApp.'],
      ['fa-chalkboard-user', 'Attend Free Demo', 'Meet your matched tutor and attend a free trial session — no commitment required.'],
      ['fa-indian-rupee-sign', 'Confirm the Plan', 'Choose a plan that suits you — transparent fees, zero hidden charges.'],
      ['fa-rocket', 'Start Learning', "Begin regular sessions with monthly feedback on your child's progress."],
    ]
      .map(
        ([icon, t, d], i) =>
          `<div class="tht-step tht-reveal${i ? ` tht-reveal-d${i}` : ''}"><div class="tht-step__num">${i + 1}</div><div class="tht-step__icon">${fa(icon)}</div><h3 class="tht-step__title">${t}</h3><p class="tht-step__desc">${d}</p></div>`,
      )
      .join('')}</div>
  </div>
</section>`;

const trustStrip = `
<section class="tht-trust-strip">
  <div class="tht-container">
    <div class="trust-strip-grid">${[
      ['fa-user-check', 'Verified Tutors', 'ID, address &amp; interview'],
      ['fa-gift', 'Free Demo', 'No commitment'],
      ['fa-bolt', 'Quick Matching', 'Usually within 24 hours'],
      ['fa-rotate', 'Free Replacement', 'Anytime you need'],
      ['fa-headset', 'All 7 Days', '8 AM – 9 PM support'],
    ]
      .map(
        ([icon, t, s]) =>
          `<div class="trust-item"><div class="trust-icon">${fa(icon)}</div><div><div class="trust-title">${t}</div><div class="trust-sub">${s}</div></div></div>`,
      )
      .join('')}</div>
  </div>
</section>`;

const subjectCards = (list = subjects) => `
<div class="tht-subject-grid">${list
  .map(
    (s, i) =>
      `<a href="/subjects/${s.slug}/" class="tht-subject-card tht-reveal${i % 3 ? ` tht-reveal-d${i % 3}` : ''}"><div class="tht-subject-card__icon">${subjectFa(s.slug)}</div><div class="tht-subject-card__name">${s.name}</div><div class="tht-subject-card__desc">${esc(clip(s.blurb, 70))}</div><div class="tht-subject-card__arrow">View ${s.short} Tutors ${fa('fa-arrow-right')}</div></a>`,
  )
  .join('')}</div>`;

// Card colours follow the reference: green for pre-primary, blue/purple through school, gold/red for board years.
const classColour = (c) => {
  if (c.group === 'pre') return 'green';
  if (c.group === 'higher') return c.slug === 'jee-neet' ? 'purple' : 'blue';
  if (c.group === 'board') return ['class-9', 'class-10'].includes(c.slug) ? 'gold' : 'red';
  return ['class-7', 'class-8'].includes(c.slug) ? 'purple' : 'blue';
};
const classBadge = (c) => {
  const n = c.name.match(/\d+/);
  if (n) return `${n[0]}${['th', 'st', 'nd', 'rd'][n[0] % 10 > 3 || Math.floor(n[0] / 10) === 1 ? 0 : n[0] % 10]}`;
  return { 'play-group': 'Play', nursery: 'Nur', 'jee-neet': 'C', diploma: 'Dip', undergraduate: 'UG', postgraduate: 'PG' }[c.slug] || c.name;
};
const classCard = (c) =>
  `<a href="/classes/${c.slug}/" class="class-card ${classColour(c)}">${c.group === 'board' ? '<span class="top-tag">BOARD</span>' : ''}<div class="class-badge">${classBadge(c)}</div><div class="class-title">${c.name}</div><div class="class-sub">${esc(c.age)}</div></a>`;

const classGrid = () => {
  const pick = (groups) => classes.filter((c) => groups.includes(c.group));
  const school = pick(['primary', 'middle', 'board']);
  return [
    ['Pre-Primary', 'class-grid-5', [pick(['pre'])]],
    ['School Classes — 1st to 12th', 'class-grid-6', [school.slice(0, 6), school.slice(6)]],
    ['Higher Education Programs', 'class-grid-4', [pick(['higher'])]],
  ]
    .map(
      ([label, grid, rows]) =>
        `<div class="class-category tht-reveal"><div class="class-cat-head"><div class="class-section-pill">${label}</div></div>${rows
          .map((r) => `<div class="${grid}">${r.map(classCard).join('')}</div>`)
          .join('')}</div>`,
    )
    .join('');
};

const boardIcon = {
  cbse: 'fa-building-columns',
  icse: 'fa-book',
  'up-board': 'fa-landmark',
  ib: 'fa-earth-americas',
  igcse: 'fa-globe',
  nios: 'fa-house-laptop',
};
const boardCards = () => `
<div class="tht-boards-grid">${boards
  .map(
    (b, i) =>
      `<a class="tht-board-card tht-reveal${i % 4 ? ` tht-reveal-d${i % 4}` : ''}" href="/boards/${b.slug}/"><div class="tht-board-logo">${photo(`board-${b.slug}.png`, `${b.name} board logo`, fa(boardIcon[b.slug] || 'fa-school'))}</div><div class="tht-board-name">${b.name}</div><div class="tht-board-full">${esc(b.full)}</div><div class="tht-board-badge">${b.badge}</div></a>`,
  )
  .join('')}</div>`;

const areaChips = (list = areas) => `
<div class="tht-locations-grid tht-reveal">${list
  .map(
    (a) =>
      `<a href="/areas/${a.slug}/" class="tht-loc-card"><div class="tht-loc-card__icon">${fa('fa-location-dot')}</div><span class="tht-loc-card__name">${a.name}</span><span class="tht-loc-card__sub">${a.zone}</span></a>`,
  )
  .join('')}</div>`;

// Photo slots: drop a file into src/assets/photos/ with the given name and it replaces the illustration on the next build.
const PHOTOS = path.join(SRC, 'assets', 'photos');
// If <name>-480.webp and <name>-900.webp sit next to the JPG, phones get the small WebP and the JPG stays as fallback.
// Pass eager for a photo that is the first thing on screen, so it isn't lazy-loaded.
const photo = (file, alt, fallback, eager = false, sizes = '(max-width: 640px) 92vw, 420px') => {
  if (!fs.existsSync(path.join(PHOTOS, file))) return fallback;
  const img = `<img class="photo" src="/assets/photos/${file}" alt="${esc(alt)}" width="900" height="675" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  const base = file.replace(/\.\w+$/, '');
  const webp = [480, 900].filter((w) => fs.existsSync(path.join(PHOTOS, `${base}-${w}.webp`)));
  if (webp.length < 2) return img;
  return `<picture class="photo"><source type="image/webp" srcset="${webp.map((w) => `/assets/photos/${base}-${w}.webp ${w}w`).join(', ')}" sizes="${sizes}">${img}</picture>`;
};

// Dark inner-page hero: copy and contact buttons on the left; on the right the booking form for `form`,
// any other markup passed as `side`, or nothing. `accent` tints the glow, like the reference site's per-page colour.
// Pass forTutors on pages aimed at tutors: the button and fact strip then talk about registering instead of hiring.
function heroBlock(h1, description, { badge, accent, checks, form, side, sub, forTutors = false }) {
  const right = side || (form ? leadForm(form) : '');
  const facts = forTutors
    ? [
        ['💸 Joining fee', 'None'],
        ['📍 Tuition jobs', 'Near your home'],
        ['📲 New jobs', 'On WhatsApp'],
      ]
    : [
        ['⚡ Matched within', '24 hours'],
        ['🎁 First class', 'Free demo'],
        ['🛡️ Every tutor', 'ID-verified'],
      ];
  const waText = forTutors
    ? 'Hi Education Hub 👋 I want to register as a home tutor.'
    : form
      ? `Hi Education Hub 👋 I need a tutor (${form}).`
      : 'Hi Education Hub 👋 I need a home tutor in Lucknow.';
  return `
<section class="ip-hero${right ? '' : ' ip-hero--solo'}" style="--t:${accent}">
  <div class="tht-container ip-hero__grid">
    <div class="ip-hero__copy">
      <div class="ip-badge">${fa('fa-graduation-cap')} ${badge}</div>
      <h1>${h1}</h1>
      <p class="ip-sub">${esc(sub || description)}</p>
      <div class="ip-checks">${checks.map((c) => `<span class="ip-check">${fa('fa-circle-check')} ${c}</span>`).join('')}</div>
      <div class="ip-btns">
        <a href="${wa(waText)}" class="ip-btn-wa" target="_blank" rel="noopener">${fa('fa-whatsapp')} ${forTutors ? 'Register on WhatsApp' : 'Request a Tutor on WhatsApp'}</a>
        <a href="${tel}" class="ip-btn-call">${fa('fa-phone')} Call Now</a>
      </div>
      <div class="ip-proof">${facts.map(([b, t]) => `<div class="ip-proof__item"><b>${b}</b><span>${t}</span></div>`).join('<div class="ip-proof__div"></div>')}</div>
    </div>
    ${right ? `<div class="ip-hero__form">${right}</div>` : ''}
  </div>
</section>`;
}

// Side column on detail pages, now that the form lives in the hero.
const sideCard = (art, name, message = `Hi Education Hub 👋 I need a ${name} tutor.`) => `
<aside class="sticky ip-side">
  <div class="ip-side__art">${art}</div>
  <ul class="ip-side__list">
    <li>${fa('fa-gift')} Free demo class at home</li>
    <li>${fa('fa-user-check')} ID &amp; address-verified tutors</li>
    <li>${fa('fa-rotate')} Free tutor replacement</li>
    <li>${fa('fa-indian-rupee-sign')} Clear monthly fees</li>
  </ul>
  <a class="ip-btn-wa" href="${wa(message)}" target="_blank" rel="noopener">${fa('fa-whatsapp')} WhatsApp Us</a>
  <a class="ip-side__call" href="${tel}">${fa('fa-phone')} ${SITE.phoneDisplay}</a>
</aside>`;

const tutorForm = formCard(
  'Tutor Registration',
  'Get tuition jobs near your home',
  `<form class="tht-form" data-tutor novalidate>
    ${field('Full Name', '<input class="tht-input" name="name" required minlength="2" autocomplete="name" placeholder="Enter your full name">')}
    ${field('Mobile Number', '<input class="tht-input" name="phone" type="tel" inputmode="numeric" required pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit mobile number">')}
    ${field('Qualification', '<input class="tht-input" name="qualification" required placeholder="e.g. M.Sc Physics, B.Ed">')}
    ${field('Subjects You Teach', '<input class="tht-input" name="subjects" required placeholder="e.g. Maths, Physics">')}
    ${field('Classes You Teach', '<input class="tht-input" name="classes" placeholder="e.g. Class 6–12">')}
    ${field('Your Area', `<select class="tht-select" name="area" required><option value="">Choose your locality</option>${areaOptions()}</select>`)}
    ${field('Experience', '<select class="tht-select" name="experience"><option>Fresher</option><option>1–3 years</option><option>3–5 years</option><option>5+ years</option></select>')}
    <p class="lead__err" role="alert" hidden></p>
    <button class="tht-submit" type="submit">${fa('fa-whatsapp')} Register on WhatsApp</button>
  </form>`,
  'Free registration for tutors across Lucknow',
);

// ---------- Page shell ----------

function page({ url, title, description, h1, body, crumbs, schema = [], current, ogType = 'website', noindex = false, lastmod, art, hero, image }) {
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
<meta name="theme-color" content="#0b2c6b">
<meta name="geo.region" content="IN-UP">
<meta name="geo.placename" content="Lucknow">
<meta name="geo.position" content="${SITE.geo.lat};${SITE.geo.lng}">
<meta name="ICBM" content="${SITE.geo.lat}, ${SITE.geo.lng}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(url)}">
<meta property="og:image" content="${abs(image ? image.src : '/assets/og-1200x630.jpg')}">
<meta property="og:image:width" content="${image ? 900 : 1200}">
<meta property="og:image:height" content="${image ? 675 : 630}">
<meta property="og:image:alt" content="${esc(image ? image.alt : `${SITE.name} logo`)}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${abs(image ? image.src : '/assets/og-1200x630.jpg')}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="${FONT_URL}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONT_URL}"></noscript>
<script>document.documentElement.classList.add('js')</script>
<style>${CSS}</style>
${schemas.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
${header(current)}
<main id="main">
${crumbs ? breadcrumbs(crumbs) : ''}
${hero ? heroBlock(h1, description, hero) : h1 ? `<section class="phero${art ? ' phero--art' : ''}"><div class="wrap"><div class="phero__copy"><h1>${h1}</h1>${description ? `<p>${esc(description)}</p>` : ''}</div>${art ? `<div class="phero__art">${art}</div>` : ''}</div></section>` : ''}
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

const rotateWords = [
  'CBSE Students',
  'ICSE Students',
  'UP Board Exams',
  'JEE Aspirants',
  'NEET Aspirants',
  'IB &amp; IGCSE',
  'Class 1 to 12',
  'Spoken English',
];

// Mixed list of real pages for the "popular searches" grid; the badge colour marks the page type.
const popularLinks = [
  ...subjects.slice(0, 6).map((s) => [`${s.name} Home Tutor in Lucknow`, `/subjects/${s.slug}/`, 'p2', 'Subject']),
  ...areas.slice(0, 6).map((a) => [`Home Tutor in ${a.name}`, `/areas/${a.slug}/`, 'p3', 'Area']),
  ...classes.filter((c) => c.group === 'board').map((c) => [`${c.name} Home Tutor`, `/classes/${c.slug}/`, 'p4', 'Class']),
  ...boards.slice(0, 4).map((b) => [`${b.name} Tutor in Lucknow`, `/boards/${b.slug}/`, 'p5', 'Board']),
];

page({
  url: '/',
  current: '/',
  title: 'Home Tutors in Lucknow | Free Demo Class | Education Hub Home Tutors',
  description:
    'Find verified home tutors in Lucknow for Class 1–12, CBSE, ICSE, UP Board, IB, JEE & NEET. Free demo class at your home within 24 hours. Call 63866 05007.',
  schema: [faqSchema(faqs), serviceSchema('Home Tuition in Lucknow', 'One-to-one home tuition for all classes, boards and subjects across Lucknow.', '/')],
  body: `
<div class="tht-page">
<div class="tht-jobs-top-strip" id="jobs-strip" aria-label="Live tuition job openings in Lucknow" hidden>
  <div class="tht-container">
    <div class="tht-jobs-top-strip__inner">
      <div class="tht-jobs-top-strip__label"><span class="tht-jobs-top-strip__label-dot" aria-hidden="true"></span><span>Live Jobs</span></div>
      <div class="tht-jobs-top-scroll"><div class="tht-jobs-top-track" id="jobs-strip-track"></div></div>
      <a href="/tuition-jobs/" class="tht-jobs-top-strip__cta">${fa('fa-briefcase')} <span>View All Jobs</span> ${fa('fa-arrow-right')}</a>
    </div>
  </div>
</div>

<section class="tht-hero" aria-label="Hero">
  <div class="hero-blob-1" aria-hidden="true"></div>
  <div class="hero-blob-2" aria-hidden="true"></div>
  <div class="hero-blob-3" aria-hidden="true"></div>
  <div class="hero-dots" aria-hidden="true"></div>
  <div class="tht-container">
    <div class="tht-hero__grid">
      <div class="tht-hero__content">
        <div class="tht-live-badge"><span class="tht-live-dot" aria-hidden="true"></span><span>Tutors available across <strong>Lucknow</strong> today</span></div>
        <h1 class="tht-hero__h1">
          <span class="static-line">Best Home Tutors for</span>
          <span class="visually-hidden">${rotateWords.join(', ')}</span>
          <span class="tht-rotate-outer" aria-hidden="true">
            <span class="tht-rotate-box" id="rotateBox">
              <span class="tht-rotate-sizer" id="rotateSizer" aria-hidden="true">${rotateWords[0]}</span>
              <span class="tht-rotate-stage" id="rotateStage" aria-hidden="true">${rotateWords.map((w, i) => `<span class="tht-rotate-item${i ? '' : ' is-active'}">${w}</span>`).join('')}</span>
            </span>
          </span>
          <span class="brand-line">in Lucknow &mdash; ${esc(SITE.shortName)}</span>
        </h1>
        <p class="tht-hero__desc">Find the <strong>best home tutors in Lucknow</strong> for one-to-one learning from <strong>Play Group to Class 12</strong>. We arrange <strong>home tuition</strong> for CBSE, ICSE, UP Board, IB &amp; IGCSE with verified teachers — plus <strong>JEE &amp; NEET</strong> and Spoken English. Get a <strong>free demo class</strong> at your home within 24 hours.</p>
        <div class="tht-hero__proof">
          <div class="proof-chip">${fa('fa-circle-check')} Free Demo Class</div>
          <div class="proof-chip">${fa('fa-circle-check')} Verified Tutors</div>
          <div class="proof-chip">${fa('fa-circle-check')} No Hidden Fees</div>
          <div class="proof-chip">${fa('fa-circle-check')} 24-hr Response</div>
        </div>
        <div class="tht-hero__stats" aria-label="Key numbers">
          <div class="tht-stat"><div class="tht-stat__val"><span data-count="${subjects.length}">${subjects.length}</span><span class="suf">+</span></div><div class="tht-stat__label">Subjects Covered</div></div>
          <div class="tht-stat"><div class="tht-stat__val"><span data-count="${classes.length}">${classes.length}</span></div><div class="tht-stat__label">Class Levels</div></div>
          <div class="tht-stat"><div class="tht-stat__val"><span data-count="${boards.length}">${boards.length}</span></div><div class="tht-stat__label">Boards</div></div>
          <div class="tht-stat"><div class="tht-stat__val"><span data-count="24">24</span><span class="suf">hr</span></div><div class="tht-stat__label">Demo Arranged</div></div>
        </div>
        <div class="tht-hero__cta-row">
          <a href="/subjects/" class="tht-btn--explore">${fa('fa-magnifying-glass')} Explore Tutors by Subject &rarr;</a>
        </div>
      </div>
      <div class="tht-hero__form-wrap">${leadForm('Homepage hero')}</div>
    </div>
  </div>
</section>
${marquee}
${trustStrip}

<section class="ns" aria-labelledby="who-h">
  <div class="ns-bg" aria-hidden="true"></div>
  <div class="tht-container">
    <div class="ns-inner">
      <div class="ns-head">
        <div class="ns-pill"><span class="ns-pill-dot"></span> Choose Your Journey</div>
        <h2 class="ns-h2" id="who-h">Who Are You <mark>Looking For?</mark></h2>
        <p class="ns-sub">Select your role and discover tailored solutions designed for your needs.</p>
      </div>
      <div class="ns-cards">${[
        [
          '/get-tutor/',
          photo('parents.jpg', 'Parent and child with a home tutor in Lucknow', gallery[0].svg),
          'nb1',
          'fa-people-roof',
          'Parents',
          'Find trusted tutors for personalised learning, better grades and academic confidence.',
          'Find a Tutor',
        ],
        [
          '/become-a-tutor/',
          photo('tutors.jpg', 'Home tutor teaching a student in Lucknow', gallery[2].svg),
          'nb2',
          'fa-person-chalkboard',
          'Tutors',
          'Connect with students near you, teach flexible hours and grow your teaching career.',
          'Become a Tutor',
        ],
        [
          '/contact/',
          photo('institutes.jpg', 'Classroom at a partner school in Lucknow', gallery[5].svg),
          'nb3',
          'fa-school',
          'Institutes',
          'Need subject teachers, substitute faculty or exam-prep support? Partner with us.',
          'Partner With Us',
        ],
      ]
        .map(
          ([href, art, nb, icon, title, desc, cta]) =>
            `<a href="${href}" class="ns-card"><div class="ns-card-img"><div class="ns-card-img-inner">${art}</div><div class="ns-icon-badge ${nb}-bg">${fa(icon)}</div></div><div class="ns-card-body"><div class="ns-title">${title}</div><p class="ns-desc">${desc}</p><span class="ns-btn ${nb}">${cta} <span class="ns-btn-arrow">→</span></span></div></a>`,
        )
        .join('')}</div>
      <div class="ns-footer">
        <div class="ns-footer-left">
          <div class="ns-footer-badge"><span class="ns-footer-badge-dot"></span> Live &amp; active</div>
          <div class="ns-footer-text">Based in Triveni Nagar, Lucknow &nbsp;·&nbsp; No hidden fees &nbsp;·&nbsp; 100% verified</div>
        </div>
        <div class="ns-footer-stats">
          <div class="ns-stat"><div class="ns-stat-val">${subjects.length}+</div><div class="ns-stat-lbl">Subjects</div></div>
          <div class="ns-stat"><div class="ns-stat-val">${classes.length}</div><div class="ns-stat-lbl">Classes</div></div>
          <div class="ns-stat"><div class="ns-stat-val">${areas.length}+</div><div class="ns-stat-lbl">Areas</div></div>
          <div class="ns-stat"><div class="ns-stat-val">7 days</div><div class="ns-stat-lbl">Open</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="tfs-wrap" aria-labelledby="finder-h">
  <div class="tfs-inner">
    <span class="tfs-label">🎯 Smart Tutor Finder</span>
    <h2 class="tfs-title" id="finder-h">Find the <em>perfect tutor</em> for your child</h2>
    <p class="tfs-sub">Choose as many filters as you like — the more you pick, the better the match. We'll reply on WhatsApp with a suitable tutor.</p>
    <form class="tfs-card" data-finder>
      <div class="tfs-grid">
        <div class="tfs-field"><label for="tfs-area">📍 Location</label><select class="tfs-select" id="tfs-area" name="area"><option value="">Any Area</option>${areaOptions()}</select></div>
        <div class="tfs-field"><label for="tfs-subject">✏️ Subject</label><select class="tfs-select" id="tfs-subject" name="subject"><option value="">Any Subject</option>${subjects.map((s) => `<option>${s.name}</option>`).join('')}</select></div>
        <div class="tfs-field"><label for="tfs-board">🏫 Board</label><select class="tfs-select" id="tfs-board" name="board"><option value="">Any Board</option>${boards.map((b) => `<option>${b.name}</option>`).join('')}</select></div>
        <div class="tfs-field"><label for="tfs-class">📚 Class</label><select class="tfs-select" id="tfs-class" name="class"><option value="">Any Class</option>${classOptions()}</select></div>
        <div class="tfs-field"><label for="tfs-gender">👤 Gender</label><select class="tfs-select" id="tfs-gender" name="gender"><option value="">Any</option><option>Female</option><option>Male</option></select></div>
      </div>
      <div class="tfs-btn-row"><button class="tfs-btn" type="submit">${fa('fa-magnifying-glass')} Find My Tutor</button></div>
    </form>
    <div class="tfs-divider"><span class="tfs-divider-text">${fa('fa-link')} Top Searchable Links</span></div>
    <div class="tfs-links-head">
      <span class="tfs-links-title">🔥 Popular Tutor Searches in Lucknow</span>
      <button class="tfs-refresh-btn" id="tfs-refresh-btn" type="button" hidden>${fa('fa-rotate')} Refresh</button>
    </div>
    <div class="tfs-links-grid" id="tfs-links-grid">${popularLinks
      .map(
        ([label, href, cls, kind], i) =>
          `<a class="tfs-link-item" href="${href}"${i >= 12 ? ' hidden' : ''}><span class="tfs-link-arrow">→</span><span style="flex:1;">${esc(label)}</span><span class="tfs-param-badge ${cls}">${kind}</span></a>`,
      )
      .join('')}</div>
  </div>
</section>

${tutorsBlock()}

<section class="tht-live-jobs-early tht-jobs-section" aria-labelledby="jobs-h">
  <div class="tht-container">
    <div class="tht-live-jobs-early__head">
      <div class="tht-live-jobs-early__head-left">
        <div class="tht-live-jobs-early__pill">${fa('fa-briefcase')} Live Jobs</div>
        <h2 class="tht-live-jobs-early__title" id="jobs-h">Latest Home Tuition <span>Jobs</span></h2>
      </div>
      <a href="/tuition-jobs/" class="tht-live-jobs-early__head-cta">Explore All Jobs →</a>
    </div>
    <div class="jobs-carousel-wrap tht-reveal">
      <div class="jobs-track" id="home-jobs" data-jobs-src="/jobs.json" data-limit="9" aria-live="polite"></div>
      <p class="jobs-empty" id="home-jobs-empty" hidden>New tuition jobs are posted here as soon as parents enquire — register as a tutor to get them on WhatsApp first.</p>
    </div>
    <div class="jobs-nav" data-carousel-nav="home-jobs" hidden>
      <button class="jobs-nav-btn" type="button" data-dir="-1" aria-label="Previous jobs">←</button>
      <div class="jobs-dots" id="home-jobs-dots"></div>
      <button class="jobs-nav-btn" type="button" data-dir="1" aria-label="Next jobs">→</button>
    </div>
    <div class="jobs-cta-row tht-reveal">
      <div class="jobs-cta-left">
        <div class="jobs-cta-live-badge"><span class="jobs-cta-live-badge-dot"></span> Actively Hiring</div>
        <span class="jobs-cta-label">Home Tuition Jobs in Lucknow</span>
      </div>
      <div class="jobs-cta-btns">
        <a href="/become-a-tutor/" class="jobs-cta-primary">${fa('fa-user-plus')} Register as Tutor →</a>
        <a href="${wa('Hi Education Hub 👋 I am looking for tuition jobs in Lucknow. Please share available jobs in my area.')}" target="_blank" rel="noopener" class="jobs-cta-wa">${fa('fa-whatsapp')} Get Jobs on WhatsApp</a>
      </div>
    </div>
  </div>
</section>

<section class="tht-about" aria-labelledby="about-h">
  <div class="tht-container">
    <div class="tht-about__grid">
      <div class="tht-about__visual">
        <div class="tht-about__img">${photo('about.jpg', `${SITE.name} — home tuition in Lucknow`, homeScene, false, '(max-width: 1024px) 92vw, 560px')}</div>
        <div class="tht-about__badge"><div class="badge-num">24h</div><div class="badge-text">Tutor Match</div></div>
      </div>
      <div class="tht-about__content">
        <div class="tht-about__pill">ABOUT US</div>
        <h2 class="tht-about__h2 falling-text" id="about-h">${[
          'Why&nbsp;',
          `<span>${esc(SITE.shortName)}</span>&nbsp;`,
          'is&nbsp;',
          'Learning&nbsp;',
          'That&nbsp;',
          'Fits&nbsp;',
          'Your&nbsp;',
          'Child',
        ]
          .map((w) => `<span class="fall-word">${w}</span>`)
          .join('')}</h2>
        <p class="tht-about__desc">Every child learns differently. Some need patience, some need a push, some need someone to finally explain fractions in a way that makes sense. Based in <strong>Triveni Nagar, Lucknow</strong>, we take the time to understand your child — their pace, their goals and your family's schedule — before we suggest a verified tutor close to your home.</p>
        <div class="tht-about__stats">
          <div class="tht-about__stat"><div class="tht-about__stat-val">${subjects.length}+</div><div class="tht-about__stat-label">Subjects Covered</div></div>
          <div class="tht-about__stat"><div class="tht-about__stat-val">${classes.length}</div><div class="tht-about__stat-label">Class Levels</div></div>
          <div class="tht-about__stat"><div class="tht-about__stat-val">${boards.length}</div><div class="tht-about__stat-label">Boards</div></div>
          <div class="tht-about__stat"><div class="tht-about__stat-val">${areas.length}+</div><div class="tht-about__stat-label">Areas Served</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

${steps}

<section class="tht-classes" aria-labelledby="cls-h">
  <div class="tht-container">
    <div class="tht-classes__head tht-reveal">
      <div class="class-section-pill">Classes We Teach</div>
      <h2 class="tht-h2" id="cls-h">Home Tutors for <span class="hl">Every Class</span> &amp; Level</h2>
      <p class="tht-section-desc">From play group to postgraduate — find the right tutor for every stage of learning in Lucknow.</p>
    </div>
    ${classGrid()}
  </div>
</section>

<section class="tht-boards-section" aria-labelledby="brd-h">
  <div class="tht-container">
    ${secHead('brd-h', 'Curriculum', 'All Major', 'Boards Covered', 'Our tutors know every curriculum followed in Lucknow schools.')}
    ${boardCards()}
  </div>
</section>

<section class="tht-subjects-sec" aria-labelledby="sub-h">
  <div class="tht-container">
    <div class="tht-section__head tht-reveal">
      <div class="tht-pill">Subjects</div>
      <h2 class="tht-h2" id="sub-h">Expert Tutors for <span class="hl typewriter-wrap" id="subjectTypewriter" data-type="${subjects
        .slice(0, 8)
        .map((s) => s.name)
        .join('|')}">${subjects[0].name}</span><span class="typewriter-cursor" aria-hidden="true"></span></h2>
      <p class="tht-section-desc">From core academics to competitive exam prep — we have a specialist for every need.</p>
    </div>
    ${subjectCards(subjects.slice(0, 6))}
    <div class="tht-subject-footer tht-reveal"><a href="/subjects/" class="tht-btn--subjects">${fa('fa-book-open')} Explore All Subjects</a></div>
  </div>
</section>

<section class="tht-section" aria-labelledby="area-h">
  <div class="tht-container">
    ${secHead('area-h', 'Service Areas', 'Home Tutors Available', 'Across Lucknow', 'Most localities in Lucknow covered — find a tutor right in your neighbourhood.')}
    ${areaChips(areas.slice(0, 12))}
    <div class="tht-locations-footer tht-reveal"><a href="/areas/" class="tht-btn--locations">${fa('fa-map-location-dot')} Explore All Locations</a></div>
  </div>
</section>

<section class="tht-section tht-section--alt" aria-labelledby="exam-h">
  <div class="tht-container">
    ${secHead('exam-h', 'Competitive Exams', 'JEE, NEET, CUET &amp;', 'Olympiad Coaching', 'One-to-one home coaching for entrance and olympiad exams.')}
    <div class="tht-subject-grid">${exams
      .map(
        (e, i) =>
          `<a href="/exams/${e.slug}/" class="tht-subject-card tht-reveal${i % 3 ? ` tht-reveal-d${i % 3}` : ''}"><div class="tht-subject-card__icon">${fa('fa-bullseye')}</div><div class="tht-subject-card__name">${e.name}</div><div class="tht-subject-card__desc">${esc(e.subjects)}</div><div class="tht-subject-card__arrow">View ${e.short} Tutors ${fa('fa-arrow-right')}</div></a>`,
      )
      .join('')}</div>
  </div>
</section>

<section class="tht-section" aria-labelledby="seo-h">
  <div class="tht-container prose seo-copy">
    <h2 class="tht-h2" id="seo-h">Home tuition in Lucknow — <span class="hl">how ${esc(SITE.shortName)} helps</span></h2>
    <p>Searching for a <strong>home tutor near me in Lucknow</strong> usually means calling a dozen numbers and hoping someone reliable turns up. ${esc(SITE.name)} makes it simple: one call or WhatsApp message to <a href="${tel}">${SITE.phoneDisplay}</a>, and we shortlist a verified tutor who suits your child's class, board, subjects and timing.</p>
    <p>We arrange <a href="/classes/">home tuition for every class</a> — from <a href="/classes/nursery/">nursery</a> and <a href="/classes/ukg/">UKG</a> to <a href="/classes/class-10/">Class 10</a> and <a href="/classes/class-12/">Class 12</a> — across <a href="/boards/cbse/">CBSE</a>, <a href="/boards/icse/">ICSE</a>, <a href="/boards/up-board/">UP Board</a>, <a href="/boards/ib/">IB</a> and <a href="/boards/igcse/">IGCSE</a>. Senior students get dedicated <a href="/exams/jee/">JEE</a>, <a href="/exams/neet/">NEET</a> and <a href="/exams/cuet/">CUET</a> tutors, and adults can join one-to-one <a href="/subjects/spoken-english/">spoken English</a> classes.</p>
    <p>Our office is at ${esc(addressLine)}, close to Sitapur Road, Aliganj and Kapoorthala, and our tutors travel across the city — <a href="/areas/gomti-nagar/">Gomti Nagar</a>, <a href="/areas/indira-nagar/">Indira Nagar</a>, <a href="/areas/jankipuram/">Jankipuram</a>, <a href="/areas/mahanagar/">Mahanagar</a>, <a href="/areas/alambagh/">Alambagh</a>, <a href="/areas/ashiyana/">Ashiyana</a> and <a href="/areas/">many more areas</a>.</p>
    <p lang="hi"><strong>लखनऊ में होम ट्यूटर चाहिए?</strong> Education Hub आपके घर पर अनुभवी और वेरिफाइड ट्यूटर भेजता है — कक्षा 1 से 12, CBSE, ICSE, UP Board, JEE और NEET के लिए। पहली डेमो क्लास बिल्कुल फ्री है। कॉल या WhatsApp करें: ${SITE.phoneDisplay}।</p>
  </div>
</section>

${testimonialsBlock()}
${faqBlock(faqs)}
${finalCta}
</div>
`,
});

// ---------- Subjects ----------

page({
  url: '/subjects/',
  current: '/subjects/',
  title: 'Subject-wise Home Tutors in Lucknow | Maths, Science, English',
  description:
    'Hire expert home tutors in Lucknow for Maths, Physics, Chemistry, Biology, English, Hindi, Computer Science, Accounts and more. Free demo class.',
  h1: 'Explore all <span class="h1-hl">subjects</span> in Lucknow',
  hero: {
    badge: `${subjects.length}+ subjects · Home tuition`,
    accent: '#1546a0',
    checks: ['Maths &amp; Science', 'Languages', 'Commerce', 'Spoken English'],
  },
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
  body: `<section class="tht-subjects-sec" aria-labelledby="all-sub-h"><div class="tht-container">${secHead('all-sub-h', 'All Subjects', 'Choose a subject to', 'find your tutor')}${subjectCards()}</div></section>${steps}${tutorsBlock()}${testimonialsBlock()}${finalCta}`,
});

for (const [i, s] of subjects.entries()) {
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
    description: clip(`Verified ${s.name} home tutors in Lucknow for all classes and boards. ${s.blurb} Book a free demo class today.`),
    h1: `<span class="h1-hl">${s.name}</span> home tutor in Lucknow`,
    hero: {
      badge: `${s.short} · Home tuition · Lucknow`,
      accent: '#1546a0',
      checks: ['All classes &amp; boards', `Verified ${esc(s.short)} tutors`, 'Home visits &amp; online', 'Free demo session'],
      form: `${s.name} tutor`,
      sub: `Verified ${s.name} home tutors in Lucknow for all classes and boards. ${s.blurb}`,
    },
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
  ${sideCard(subjectArt(s, i), s.name)}
</div></section>
<section class="tht-subjects-sec" aria-labelledby="more-sub-h"><div class="tht-container">${secHead('more-sub-h', 'Subjects', 'Other subjects', 'we teach')}${subjectCards(subjects.filter((x) => x.slug !== s.slug).slice(0, 6))}</div></section>
${steps}
${tutorsBlock()}
${testimonialsBlock()}
${faqBlock(sFaqs, `${s.name} tuition — FAQs`)}
${finalCta}`,
  });
}

// ---------- Classes ----------

page({
  url: '/classes/',
  current: '/classes/',
  title: 'Class-wise Home Tutors in Lucknow | Nursery to Class 12, JEE, NEET',
  description: 'Home tutors in Lucknow for Play Group, Nursery, LKG, UKG, Class 1 to 12, JEE, NEET, diploma and college subjects. Book a free demo class.',
  h1: 'Home tutors for <span class="h1-hl">every class</span> in Lucknow',
  hero: {
    badge: 'Play group to postgraduate',
    accent: '#c62828',
    checks: ['Pre-primary', 'Class 1–12', 'Board years', 'JEE / NEET &amp; college'],
  },
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
  body: `<section class="tht-classes" aria-labelledby="all-cls-h"><div class="tht-container">${secHead('all-cls-h', 'Classes We Teach', "Pick your child's", 'class')}${classGrid()}</div></section>${steps}${tutorsBlock()}${testimonialsBlock()}${finalCta}`,
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

for (const [i, c] of classes.entries()) {
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
    description: clip(`Experienced ${c.name} home tutors in Lucknow. ${c.focus} Free demo class at home.`),
    h1: `<span class="h1-hl">${c.name}</span> home tutor in Lucknow`,
    hero: {
      badge: `${esc(c.age)} · Home tuition · Lucknow`,
      accent: '#c62828',
      checks: ['CBSE, ICSE &amp; UP Board', `Verified ${c.name} tutors`, 'Home visits &amp; online', 'Free demo session'],
      form: `${c.name} tutor`,
    },
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
  ${sideCard(classArt(c, i), c.name)}
</div></section>
${steps}
${tutorsBlock()}
${testimonialsBlock()}
${faqBlock(cFaqs, `${c.name} tuition — FAQs`)}
${finalCta}`,
  });
}

// ---------- Boards ----------

for (const [i, b] of boards.entries()) {
  const url = `/boards/${b.slug}/`;
  page({
    url,
    current: '/classes/',
    title: `${b.name} Home Tutors in Lucknow | ${b.full} | Education Hub`.slice(0, 70),
    description: `Experienced ${b.name} home tutors in Lucknow for all classes and subjects. Board-focused teaching, regular tests and a free demo class.`,
    h1: `<span class="h1-hl">${b.name}</span> home tutors in Lucknow`,
    hero: {
      badge: `${esc(b.badge)} · ${b.name} board`,
      accent: '#6d28d9',
      checks: ['Play group to Class 12', `${b.name} syllabus experts`, 'Home visits &amp; online', 'Free demo session'],
      form: `${b.name} tutor`,
    },
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
  ${sideCard(boardArt(b, i), b.name)}
</div></section>
<section class="tht-boards-section" aria-labelledby="more-brd-h"><div class="tht-container">${secHead('more-brd-h', 'Curriculum', 'All major', 'boards covered')}${boardCards()}</div></section>
${steps}
${tutorsBlock()}
${testimonialsBlock()}
${finalCta}`,
  });
}

// ---------- Exams ----------

for (const [i, e] of exams.entries()) {
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
    h1: `<span class="h1-hl">${e.name}</span> home tutors in Lucknow`,
    hero: {
      badge: `${e.short} coaching · One-to-one · Lucknow`,
      accent: '#c2410c',
      checks: [esc(e.subjects), 'Previous-year papers', 'Mock tests &amp; analysis', 'Free demo session'],
      form: `${e.short} tutor`,
    },
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
  ${sideCard(examArt(e, i), e.short)}
</div></section>
${steps}
${tutorsBlock()}
${testimonialsBlock()}
${faqBlock(eFaqs, `${e.short} coaching — FAQs`)}
${finalCta}`,
  });
}

// ---------- Areas ----------

page({
  url: '/areas/',
  current: '/areas/',
  title: 'Home Tutors Near Me in Lucknow | All Areas Covered | Education Hub',
  description: 'Find a home tutor near you in Lucknow — Triveni Nagar, Aliganj, Gomti Nagar, Indira Nagar, Jankipuram, Mahanagar, Alambagh and more.',
  h1: 'Find tutors in your <span class="h1-hl">exact locality</span>',
  hero: {
    badge: `${areas.length}+ areas · Lucknow`,
    accent: '#0f766e',
    checks: ['North &amp; South Lucknow', 'East &amp; West Lucknow', 'Male &amp; female tutors', 'Free demo at home'],
  },
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
  body: `<section class="tht-section" aria-labelledby="all-area-h"><div class="tht-container">${secHead('all-area-h', 'Service Areas', 'Home tutors available', 'across Lucknow', 'Don\'t see your area? We cover most of Lucknow — <a href="/contact/">just ask</a>.')}${areaChips()}</div></section>${steps}${finalCta}`,
});

for (const [i, a] of areas.entries()) {
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
    h1: `Home tutor in <span class="h1-hl">${a.name}</span>, Lucknow`,
    hero: {
      badge: `${esc(a.zone)} · Home tuition`,
      accent: '#0f766e',
      checks: ['All classes &amp; boards', `Tutors near ${a.name}`, 'Male &amp; female tutors', 'Free demo session'],
      form: `Tutor in ${a.name}`,
    },
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
  ${sideCard(areaArt(a, i), `home`)}
</div></section>
${steps}
${tutorsBlock()}
${testimonialsBlock()}
${faqBlock(aFaqs, `Home tuition in ${a.name} — FAQs`)}
${finalCta}`,
  });
}

// ---------- Core pages ----------

page({
  url: '/about/',
  current: '/about/',
  title: 'About Us | Education Hub Home Tutors, Lucknow',
  description:
    'Education Hub Home Tutors connects Lucknow families with verified, experienced home tutors. Learn about our story, values and how we choose tutors.',
  h1: 'We connect students with the <span class="h1-hl">right tutor</span>',
  hero: {
    badge: 'About us · Triveni Nagar, Lucknow',
    accent: '#1546a0',
    checks: ['Verified home tutors', 'Every class &amp; board', 'Free demo class', 'Free tutor replacement'],
    form: 'About page',
  },
  crumbs: [
    ['Home', '/'],
    ['About', '/about/'],
  ],
  schema: [{ '@context': 'https://schema.org', '@type': 'AboutPage', url: abs('/about/'), about: { '@id': orgId } }],
  body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
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
  ${sideCard(photo('about.jpg', `${SITE.name} — home tuition in Lucknow`, homeScene, false, '(max-width: 1024px) 92vw, 380px'), 'home')}
</div></section>
${steps}${finalCta}`,
});

page({
  url: '/get-tutor/',
  current: '/get-tutor/',
  title: 'Book a Free Demo Class | Get a Home Tutor in Lucknow | Education Hub',
  description:
    'Request a verified home tutor in Lucknow in under a minute. Free demo class, no advance payment, male & female tutors for all classes and boards.',
  h1: 'Find your perfect <span class="h1-hl">home tutor</span> in Lucknow',
  hero: {
    badge: 'Free demo · No advance payment',
    accent: '#1546a0',
    checks: ['Play group to Class 12', 'CBSE, ICSE, UP Board, IB', 'Male &amp; female tutors', 'Free tutor replacement'],
    form: 'Get tutor page',
  },
  crumbs: [
    ['Home', '/'],
    ['Get a Tutor', '/get-tutor/'],
  ],
  body: `${trustStrip}${steps}
<section class="tht-classes" aria-labelledby="cls-h">
  <div class="tht-container">
    ${secHead('cls-h', 'Classes We Teach', 'Grades &amp;', 'Programmes')}
    ${classGrid()}
  </div>
</section>
${tutorsBlock()}
${testimonialsBlock()}
${faqBlock(faqs)}`,
});

page({
  url: '/become-a-tutor/',
  current: '/become-a-tutor/',
  title: 'Become a Home Tutor in Lucknow | Tuition Jobs | Education Hub',
  description:
    'Join Education Hub as a home tutor in Lucknow. Get tuition leads near your home, flexible timings and timely payments. Register free on WhatsApp.',
  h1: 'Become a <span class="h1-hl">home tutor</span> in Lucknow',
  hero: {
    badge: 'Free registration · Tutors wanted',
    accent: '#15803d',
    checks: ['Tuition leads near your home', 'Choose your own timings', 'No joining fee', 'All subjects &amp; classes'],
    side: tutorForm,
    forTutors: true,
  },
  crumbs: [
    ['Home', '/'],
    ['Become a Tutor', '/become-a-tutor/'],
  ],
  body: `
<section class="sec"><div class="wrap split">
  <article class="prose">
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
  ${sideCard(tutorScene, 'tutoring job', 'Hi Education Hub 👋 I want to register as a home tutor.')}
</div></section>`,
});

page({
  url: '/tuition-jobs/',
  current: '/tuition-jobs/',
  title: 'Home Tuition Jobs in Lucknow | Latest Tutor Vacancies | Education Hub',
  description: 'Latest home tuition jobs in Lucknow for all classes and subjects. Apply on WhatsApp and start teaching near your home.',
  h1: 'Home <span class="h1-hl">tuition jobs</span> in Lucknow',
  hero: {
    badge: 'Live jobs · Apply on WhatsApp',
    accent: '#0891b2',
    checks: ['New jobs every week', 'Near your home', 'All classes &amp; subjects', 'Free registration'],
    side: tutorForm,
    forTutors: true,
  },
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
  h1: 'Transparent <span class="h1-hl">home tuition fees</span> in Lucknow',
  hero: {
    badge: 'Fees · No hidden charges',
    accent: '#c2410c',
    checks: ['Clear monthly ranges', 'Fee confirmed before demo', 'No advance payment', 'Free demo class'],
    form: 'Fees page',
  },
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
${finalCta}`,
});

page({
  url: '/contact/',
  current: '/contact/',
  title: 'Contact Education Hub Home Tutors | Triveni Nagar, Lucknow',
  description: `Call ${SITE.phoneDisplay} or visit us at ${addressLine}. Open ${SITE.hoursDisplay}.`,
  h1: 'Let\'s <span class="h1-hl">connect</span>',
  hero: {
    badge: `Open ${esc(SITE.hoursDisplay)}`,
    accent: '#0f766e',
    checks: [`Call ${SITE.phoneDisplay}`, 'WhatsApp replies fast', 'Office in Triveni Nagar', 'Callback in 30 minutes'],
    form: 'Contact page',
  },
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
  ${sideCard(homeScene, 'home')}
</div></section>`,
});

// ---------- Blog ----------

page({
  url: '/blog/',
  current: '/blog/',
  title: 'Study Tips & Parenting Guides | Education Hub Blog',
  description: 'Practical study tips, board exam plans and guides for Lucknow parents choosing a home tutor.',
  h1: 'Home tuition <span class="h1-hl">guides</span> for Lucknow families',
  hero: {
    badge: 'Blog · Study tips &amp; guides',
    accent: '#7c3aed',
    checks: ['Board exam plans', 'Choosing a tutor', 'Study habits', 'Parent checklists'],
  },
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
      (p, i) =>
        `<a class="card card--post" href="/blog/${p.slug}/"><div class="card__art">${photo(`blog-${p.slug}.jpg`, p.title, postArt(p, i))}</div><time datetime="${p.date}">${new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time><h2 class="h3">${esc(p.title)}</h2><p>${esc(p.description)}</p><span class="card__more">Read more →</span></a>`,
    )
    .join('')}</div></div></section>`,
});

for (const [i, p] of posts.entries()) {
  const url = `/blog/${p.slug}/`;
  // A post with a cover photo uses it for link previews and the article's structured data.
  const cover = fs.existsSync(path.join(PHOTOS, `blog-${p.slug}.jpg`)) ? { src: `/assets/photos/blog-${p.slug}.jpg`, alt: p.title } : null;
  page({
    url,
    current: '/blog/',
    ogType: 'article',
    lastmod: p.date,
    title: p.title,
    description: p.description,
    image: cover,
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
        image: abs(cover ? cover.src : '/assets/logo-full.jpg'),
        author: { '@id': orgId },
        publisher: { '@id': orgId },
      },
    ],
    body: `
<article class="sec"><div class="wrap narrow prose">
  <h1>${esc(p.title)}</h1>
  <div class="cover">${photo(`blog-${p.slug}.jpg`, p.title, postArt(p, i), true, '(max-width: 800px) 100vw, 760px')}</div>
  <p class="meta"><time datetime="${p.date}">${new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · ${esc(SITE.name)}</p>
  ${p.body.map(([tag, text]) => `<${tag}>${esc(text)}</${tag}>`).join('\n  ')}
</div></article>
${finalCta}`,
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
// main.js builds job cards in the browser, so it gets the same inline icons as the templates.
fs.writeFileSync(
  path.join(DIST, 'main.js'),
  fs
    .readFileSync(path.join(SRC, 'main.js'), 'utf8')
    .replace('__WHATSAPP__', SITE.whatsapp)
    .replace('__ICON_LOCATION__', fa('fa-location-dot'))
    .replace('__ICON_WHATSAPP__', fa('fa-whatsapp')),
);
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

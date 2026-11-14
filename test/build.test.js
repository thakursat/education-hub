const { test, before } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { SITE, subjects, classes, areas, tutors } = require('../src/data');

const DIST = path.join(__dirname, '..', 'dist');
let pages = [];

before(() => {
  execFileSync(process.execPath, [path.join(__dirname, '..', 'src', 'build.js')]);
  const walk = (dir) =>
    fs.readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
    });
  pages = walk(DIST).map((file) => ({ file, html: fs.readFileSync(file, 'utf8') }));
});

test('generates a page for every subject, class and area', () => {
  for (const s of subjects) assert.ok(fs.existsSync(path.join(DIST, 'subjects', s.slug, 'index.html')), s.slug);
  for (const c of classes) assert.ok(fs.existsSync(path.join(DIST, 'classes', c.slug, 'index.html')), c.slug);
  for (const a of areas) assert.ok(fs.existsSync(path.join(DIST, 'areas', a.slug, 'index.html')), a.slug);
});

test('every page has exactly one h1, a canonical and a description', () => {
  for (const { file, html } of pages) {
    assert.strictEqual((html.match(/<h1[\s>]/g) || []).length, 1, `h1 count in ${file}`);
    assert.match(html, /<link rel="canonical" href="https:\/\//, file);
    assert.match(html, /<meta name="description" content=".{20,}">/, file);
  }
});

test('titles are unique and at most 60 characters', () => {
  const seen = new Map();
  for (const { file, html } of pages) {
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.replace(/&amp;/g, '&').length <= 60, `${title.length} chars: ${file}`);
    assert.ok(!seen.has(title), `duplicate title "${title}" in ${file} and ${seen.get(title)}`);
    seen.set(title, file);
  }
});

test('all JSON-LD blocks are valid JSON', () => {
  for (const { file, html } of pages) {
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(m[1]), file);
    }
  }
});

test('business phone, address and credit appear in the footer of every page', () => {
  for (const { file, html } of pages) {
    assert.ok(html.includes(SITE.phoneDisplay), file);
    assert.ok(html.includes(SITE.address.postalCode), file);
    assert.ok(html.includes('https://www.neosharks.in/') && html.includes('linkedin.com/in/thakursatyam9415'), file);
  }
});

test('sitemap lists every indexable page and excludes the 404', () => {
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  const indexable = pages.filter((p) => !p.file.endsWith('404.html')).length;
  assert.strictEqual((sitemap.match(/<url>/g) || []).length, indexable);
  assert.ok(!sitemap.includes('404'));
  assert.match(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'), /Sitemap: https:\/\//);
});

test('publishes the IndexNow key file at the site root', () => {
  assert.match(SITE.indexNowKey, /^[a-f0-9]{32}$/);
  assert.strictEqual(fs.readFileSync(path.join(DIST, `${SITE.indexNowKey}.txt`), 'utf8'), SITE.indexNowKey);
});

test('home page has the interactive sections and hides empty testimonials', () => {
  const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  for (const marker of [
    'class="tht-marquee-wrap"',
    'id="rotateStage"',
    'data-count=',
    'data-type=',
    'id="home-jobs"',
    'id="jobs-strip"',
    'id="tfs-links-grid"',
    'id="welcome"',
    'class="tht-cta"',
  ]) {
    assert.ok(home.includes(marker), marker);
  }
  assert.ok(!home.includes('id="testi"'), 'testimonials section should not render without real reviews');
  assert.strictEqual(home.includes('id="tutors-h"'), tutors.length > 0, 'tutor profiles render only when data.js has tutors');
  for (const t of tutors) assert.ok(home.includes(`>${t.name}</h3>`), `tutor card for ${t.name}`);
});

test('every page uses the shared header, footer and floating contact buttons', () => {
  for (const { file, html } of pages) {
    for (const marker of ['class="main-navbar"', 'id="mainNavCollapse"', 'id="footer"', 'class="gotopbtn"', 'id="gotopbtn-2"']) {
      assert.ok(html.includes(marker), `${marker} in ${file}`);
    }
  }
});

test('lead forms keep the field names main.js sends to WhatsApp', () => {
  const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const form = home.match(/<form class="tht-form" id="lead" data-lead[\s\S]*?<\/form>/)[0];
  for (const name of ['name', 'phone', 'class', 'area', 'subjects', 'gender', 'context']) {
    assert.match(form, new RegExp(`name="${name}"`), name);
  }
});

test('no page loads assets from the reference site', () => {
  for (const { file, html } of pages) assert.ok(!html.includes('thehometuitions'), file);
});

test('pages are self-contained for fast mobile loads: inline icons, no icon font, mobile viewport', () => {
  for (const { file, html } of pages) {
    assert.ok(!/font-awesome|class="fa-/.test(html), `icon font reference in ${file}`);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/, file);
  }
  const js = fs.readFileSync(path.join(DIST, 'main.js'), 'utf8');
  assert.ok(!js.includes('__ICON_') && !js.includes('__WHATSAPP__'), 'main.js placeholders replaced');
});

test('detail pages open with the dark hero and its booking form', () => {
  const pick = [`subjects/${subjects[0].slug}`, `classes/${classes[0].slug}`, `areas/${areas[0].slug}`, 'boards/cbse', 'exams/jee', 'get-tutor'];
  for (const p of pick) {
    const html = fs.readFileSync(path.join(DIST, p, 'index.html'), 'utf8');
    assert.match(html, /<section class="ip-hero"[\s\S]*?<h1>[\s\S]*?<form class="tht-form" id="lead" data-lead/, p);
    assert.strictEqual((html.match(/data-lead/g) || []).length, 1, `one booking form on ${p}`);
  }
});

test('photo slots fall back to illustrations until a photo file is added', () => {
  const home = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  for (const f of ['parents.jpg', 'tutors.jpg', 'institutes.jpg', 'about.jpg']) {
    const exists = fs.existsSync(path.join(__dirname, '..', 'src', 'assets', 'photos', f));
    assert.strictEqual(home.includes(`/assets/photos/${f}`), exists, f);
  }
});

test('every internal link and asset points to a file that exists', () => {
  const missing = new Set();
  for (const { file, html } of pages) {
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      const target = path.join(DIST, decodeURIComponent(url));
      const ok = url.endsWith('/') ? fs.existsSync(path.join(target, 'index.html')) : fs.existsSync(target);
      if (!ok) missing.add(`${url} (in ${path.relative(DIST, file)})`);
    }
    for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const part of set.split(',')) {
        const url = part.trim().split(' ')[0];
        if (url.startsWith('/') && !fs.existsSync(path.join(DIST, url))) missing.add(`${url} (in ${path.relative(DIST, file)})`);
      }
    }
  }
  assert.deepStrictEqual([...missing], []);
});

test('the tutor registration form appears where tutors sign up', () => {
  for (const p of ['become-a-tutor', 'tuition-jobs']) {
    const html = fs.readFileSync(path.join(DIST, p, 'index.html'), 'utf8');
    assert.match(html, /<section class="ip-hero[\s\S]*?<form class="tht-form" data-tutor/, p);
  }
});

test('every page points at the live domain', () => {
  assert.strictEqual(SITE.url, 'https://eduhometutor.in');
  for (const { file, html } of pages) {
    assert.ok(!/educationhubhometutors|www\.eduhometutor/.test(html), `old or www domain in ${file}`);
    if (!file.endsWith('404.html')) assert.match(html, /<link rel="canonical" href="https:\/\/eduhometutor\.in\//, file);
  }
  assert.match(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/eduhometutor\.in\/sitemap\.xml/);
});

test('the brand name matches the domain on every page', () => {
  assert.strictEqual(SITE.name, 'EduHomeTutor');
  for (const { file, html } of pages) assert.ok(!/Education Hub/i.test(html), `old brand name in ${file}`);
  for (const f of ['llms.txt', 'site.webmanifest']) assert.ok(!/Education Hub/i.test(fs.readFileSync(path.join(DIST, f), 'utf8')), f);
});

test('the areas page lists every locality A to Z, each linking to its own page', () => {
  const html = fs.readFileSync(path.join(DIST, 'areas', 'index.html'), 'utf8');
  const names = [...html.matchAll(/class="loc-dir__item[^"]*"[^>]*>.*?<span>(.*?)<\/span>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  assert.strictEqual(names.length, areas.length);
  assert.deepStrictEqual(
    names,
    [...names].sort((x, y) => x.localeCompare(y)),
  );
  for (const a of areas) assert.match(html, new RegExp(`class="loc-dir__item" href="/areas/${a.slug}/"><svg[^]*?<span>${a.name}</span>`), a.slug);
});

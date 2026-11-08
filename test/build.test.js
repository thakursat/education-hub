const { test, before } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { SITE, subjects, classes, areas } = require('../src/data');

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

test('titles are unique and at most 70 characters', () => {
  const seen = new Map();
  for (const { file, html } of pages) {
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.length <= 70, `${title.length} chars: ${file}`);
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

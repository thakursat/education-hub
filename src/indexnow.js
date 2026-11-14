// Submits every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver…) so new and changed pages get crawled within hours.
// Run after a deploy is live: `npm run indexnow`. The key file must already be reachable on the live site.

const fs = require('fs');
const path = require('path');
const { SITE } = require('./data');

const sitemap = fs.readFileSync(path.join(__dirname, '..', 'dist', 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(SITE.url).host,
    key: SITE.indexNowKey,
    keyLocation: `${SITE.url}/${SITE.indexNowKey}.txt`,
    urlList,
  }),
}).then(async (res) => {
  // 200 = accepted, 202 = accepted while the key is being validated; anything else is a failure.
  console.log(`IndexNow: ${res.status} for ${urlList.length} URLs ${await res.text()}`);
  if (res.status !== 200 && res.status !== 202) process.exitCode = 1;
});

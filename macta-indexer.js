// macta-indexer.js
const fs = require('fs');
const fetch = require('node-fetch');

const CATEGORY_URL = 'https://www.mactabeauty.com/naohooldus/naokreemid';
const OUT_FILE = 'macta-products.json';

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+|\/+$/g, '');
    const parts = path.split('/');
    const last = parts[parts.length - 1] || parts[parts.length - 2] || path;
    return last.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  } catch (e) {
    return url.toLowerCase().replace(/https?:\/\//, '').replace(/[^a-z0-9]+/g, '-');
  }
}

(async () => {
  console.log('→ Laen kategooria HTML...');
  const resp = await fetch(CATEGORY_URL);
  const html = await resp.text();

  console.log('→ Otsin kategooriast tootelehti...');

  // Võtab kõik <a ... class="product-item-link"... href="..."> lingid
  const productMatches = [...html.matchAll(
    /<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"[^>]*>/gi
  )];

  // Unikaalsed URL-id
  const urls = [...new Set(productMatches.map(m => m[1]))];

  console.log('→ Leidsin URL-id:', urls.length);

  const products = urls.map(url => ({
    id: slugFromUrl(url),
    shop: 'mactabeauty',
    url
  }));

  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2));
  console.log('→ Salvestan', OUT_FILE);
  console.log('→ Valmis.');
})().catch(err => {
  console.error('Indexer error:', err);
  process.exit(1);
});

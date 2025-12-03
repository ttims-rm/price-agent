const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

function decodeHtml(str = '') {
  return (str || '')
    // &#xE4; stiilis HTML
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    // \u00e4 stiilis JSON unicode
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// ─────────────────────────────
// Macta – üksiku tootelehe adapter
// ─────────────────────────────
async function fetchMactaProduct(url) {
  if (!url.startsWith('https://www.mactabeauty.com/')) {
    return { products: [], _debug: { url, error: 'invalid-url' } };
  }

  const html = await fetch(url).then(r => r.text());

  // TITLE
  let title = '';
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  if (ogTitleMatch) {
    title = decodeHtml(ogTitleMatch[1]);
  } else {
    const titleMatch = html.match(/"name"\s*:\s*"([^"]+)"/i);
    if (titleMatch) title = decodeHtml(titleMatch[1]);
  }

  // BRAND
  let brand = '';
  const brandMatch = html.match(
    /"brand"\s*:\s*{\s*"@type":"Brand","name":"([^"]+)"/i
  );
  if (brandMatch) brand = decodeHtml(brandMatch[1]);

  // PRICE – meta product:price:amount (kehtiv hind – soodukas või tava)
  let price = 0;
  const metaPriceMatch = html.match(
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i
  );
  if (metaPriceMatch) {
    price = parseFloat(metaPriceMatch[1].replace(',', '.'));
  }

  // IMAGE
  let image_url = '';
  const imgJsonMatch = html.match(/"image"\s*:\s*"([^"]+)"/i);
  const imgOgMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  if (imgJsonMatch) image_url = imgJsonMatch[1];
  else if (imgOgMatch) image_url = imgOgMatch[1];
  image_url = image_url.replace(/\\\//g, '/');

  const product = {
    title,
    brand,
    price,
    url,
    image_url,
    shop: 'mactabeauty'
  };

  return {
    products: price > 0 ? [product] : [],
    _debug: { url, title, brand, price, image_url }
  };
}

// ─────────────────────────────
// Health
// ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// ─────────────────────────────
// 1) Tootelehe põhine: /price/macta?url=...
// ─────────────────────────────
app.get('/price/macta', async (req, res) => {
  const url = (req.query.url || '').trim();
  try {
    const result = await fetchMactaProduct(url);
    res.json(result);
  } catch (err) {
    res.json({ products: [] });
  }
});

// ─────────────────────────────
// 2) Nimeotsing: /price/search?query=...&shop=mactabeauty
//    (praegu: lihtne mapping 3 testtootele)
// ─────────────────────────────
app.get('/price/search', async (req, res) => {
  const query = (req.query.query || '').toLowerCase();
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();

  // praegu ainult Macta
  if (shop !== 'mactabeauty' || !query) {
    return res.json({ products: [] });
  }

  // Väga lihtne MVP-mapping – ainult testimiseks.
  const candidates = [];

  if (query.includes('luvum')) {
    candidates.push('https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml');
  }
  if (query.includes('friendly') || query.includes('plekieemaldaja')) {
    candidates.push('https://www.mactabeauty.com/friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml');
  }
  if (query.includes('krauterhof') || query.includes('hyaluron')) {
    candidates.push('https://www.mactabeauty.com/krauterhof-night-cream-hyaluron-50ml');
  }

  const products = [];
  for (const url of candidates) {
    try {
      const result = await fetchMactaProduct(url);
      if (result.products && result.products[0]) {
        products.push(result.products[0]);
      }
    } catch (e) {
      // ignore ühe toote viga
    }
  }

  res.json({ products, _debug: { query, shop, count: products.length } });
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

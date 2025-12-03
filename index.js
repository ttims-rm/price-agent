const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- 1) Laeme Macta indeksifaili (URL-list) ---

let mactaUrls = [];
try {
  const raw = fs.readFileSync('./macta-products.json', 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    mactaUrls = parsed;
  } else if (Array.isArray(parsed.urls)) {
    mactaUrls = parsed.urls;
  }
} catch (e) {
  console.error('Ei saanud macta-products.json laadida', e.message);
  mactaUrls = [];
}

// Loome slug’i põhise indeksi (talub nii stringe kui objekte)
const mactaIndex = mactaUrls
  .map((item) => {
    const url = typeof item === 'string' ? item : item.url;
    if (!url) return null;

    const clean = url
      .replace('https://www.mactabeauty.com/', '')
      .replace(/\.html?$/i, '')
      .replace(/\/$/, '');

    return {
      url,
      slug: clean.toLowerCase(),
    };
  })
  .filter(Boolean);

// Ajutine manuaalne lisandus: Friendly plekieemaldaja (mitte näokreemide kategoorias)
mactaIndex.push({
  url: 'https://www.mactabeauty.com/friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml',
  slug: 'friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml'
});


// Lisasõnad 3 testtootele (aidab fuzzy’t)
const MANUAL_ALIASES = {
  'https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml': [
    'luvum kollageen kreem 50ml',
    'luvum slow aging phyto collagen',
  ],
  'https://www.mactabeauty.com/friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml': [
    'friendly organic plekieemaldaja 250ml',
  ],
  'https://www.mactabeauty.com/krauterhof-night-cream-hyaluron-50ml': [
    'krauterhof hyaluron öökreem 50ml',
  ],
};

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9äöõü]+/g, ' ')
    .trim();
}

function scoreProduct(entry, queryTokens) {
  let haystack = entry.slug.replace(/[-_]+/g, ' ');

  const aliases = MANUAL_ALIASES[entry.url];
  if (aliases) {
    haystack += ' ' + aliases.map(normalize).join(' ');
  }

  let score = 0;
  for (const token of queryTokens) {
    if (!token) continue;
    if (haystack.includes(token)) score++;
  }
  return score;
}

// --- 2) Macta live-toote lugemine (hind + pilt) ---

async function fetchMactaProduct(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PriceAgent/1.0; +https://smitt.ee/hinnad)',
    },
  });

  const html = await res.text();

  let title = '';
  let brand = '';
  let price = 0;
  let imageUrl = '';

  // JSON-LD <script type="application/ld+json">, @type: "Product"
  const ldMatches = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const m of ldMatches) {
    try {
      const jsonText = m[1].trim();
      if (!jsonText) continue;

      const data = JSON.parse(jsonText);
      const node = Array.isArray(data)
        ? data.find((x) => x && x['@type'] === 'Product')
        : data && data['@type'] === 'Product'
        ? data
        : null;

      if (!node) continue;

      if (!title && node.name) title = node.name;
      if (!brand && node.brand) {
        brand =
          typeof node.brand === 'string'
            ? node.brand
            : node.brand.name || '';
      }

      const offers = node.offers || node.offers?.[0];
      if (offers && !price) {
        const p = parseFloat(
          offers.price || (offers[0] && offers[0].price) || 0
        );
        if (!Number.isNaN(p) && p > 0) price = p;
      }

      if (!imageUrl && node.image) {
        imageUrl = Array.isArray(node.image) ? node.image[0] : node.image;
      }

      if (title && price) break;
    } catch (_) {
      // ignore üksikuid parse erroreid
    }
  }

  // Fallback: meta price
  if (!price) {
    const metaPriceMatch = html.match(
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i
    );
    if (metaPriceMatch) {
      const p = parseFloat(metaPriceMatch[1].replace(',', '.'));
      if (!Number.isNaN(p) && p > 0) price = p;
    }
  }

  // Fallback: title tag
  if (!title) {
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (t) title = t[1].trim();
  }

  // Fallback: og:image
  if (!imageUrl) {
    const imgMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (imgMatch) imageUrl = imgMatch[1];
  }

  return {
    title,
    brand,
    price,
    image_url: imageUrl,
  };
}

// --- 3) Endpointid ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// Otsi + loe live hind Mactast
app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (!query) return res.json({ products: [] });

  if (shop !== 'mactabeauty') {
    return res.json({ products: [] });
  }

  const qNorm = normalize(query);
  const tokens = qNorm.split(/\s+/).filter(Boolean);

  let best = null;
  for (const entry of mactaIndex) {
    const score = scoreProduct(entry, tokens);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { ...entry, score };
    }
  }

  if (!best) {
    return res.json({
      products: [],
      _debug: { query, match_score: 0, match_id: null },
    });
  }

  try {
    const live = await fetchMactaProduct(best.url);

    const product = {
      title: live.title || best.slug,
      brand: live.brand || '',
      price: live.price || 0,
      url: best.url,
      image_url: live.image_url || '',
      shop: 'mactabeauty',
    };

    return res.json({
      products: [product],
      _debug: {
        query,
        match_score: best.score,
        match_id: best.slug,
        live,
      },
    });
  } catch (e) {
    return res.json({
      products: [],
      _debug: { query, error: e.message || 'fetch-fail' },
    });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

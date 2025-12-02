const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const { generateSlugs } = require('./utils');
const { fetchProductData } = require('./fetchProduct');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health-check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// Põhi-endpoint: slug + fuzzy + scrape
app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (shop !== 'mactabeauty' || !query) {
    return res.json({ products: [] });
  }

  const slugs = generateSlugs(query);
  const base = 'https://www.mactabeauty.com/';

  const candidates = [];

  for (const slug of slugs) {
    const url = base + slug;

    try {
      const resp = await fetch(url, { method: 'GET' });

      // Kui lehte pole või redirectib otsingule/kategooriale, jäta vahele
      if (resp.status !== 200) continue;
      if (resp.url.includes('/catalogsearch') || resp.url.includes('/catalog/')) continue;

      // Võtame päris andmed HTML-ist
      const data = await fetchProductData(resp.url);
      if (!data || !data.price || !data.title) continue;

      candidates.push(data);
    } catch (e) {
      continue;
    }
  }

  if (!candidates.length) {
    return res.json({
      products: [],
      _debug: {
        query,
        slugs,
        found: 0
      }
    });
  }

  // Lihtne "fuzzy": loe, mitu otsingu sõna esineb pealkirjas
  const qWords = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = candidates.map(p => {
    const t = (p.title || '').toLowerCase();
    let score = 0;
    qWords.forEach(w => {
      if (t.includes(w)) score++;
    });
    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].product;

  return res.json({
    products: [
      {
        title: best.title,
        brand: best.brand,
        price: best.price,
        url: best.url,
        image_url: best.image_url,
        shop: 'mactabeauty'
      }
    ],
    _debug: {
      query,
      slugs,
      tried: candidates.length,
      chosenTitle: best.title
    }
  });
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

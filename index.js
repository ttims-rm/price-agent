const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (!query || shop !== "mactabeauty") {
    return res.json({ products: [] });
  }

  const brandSlug = query.toLowerCase().replace(/\s+/g, '-');
  const brandUrl = `https://www.mactabeauty.com/${brandSlug}`;

  try {
    const html = await fetch(brandUrl).then(r => r.text());

    const matches = [...html.matchAll(
      /<a[^>]+class="product-item-link"[^>]+href="([^"]+)"[^>]*>\s*([^<]+)\s*<\/a>/gi
    )];

    const products = matches.map(m => ({
      url: m[1],
      title: m[2].trim()
    }));

    res.json({
      products,
      _debug: { query, brandUrl }
    });

  } catch (e) {
    res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

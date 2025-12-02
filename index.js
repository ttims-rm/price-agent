const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// Põhi-endpoint – + otsingu-fetch (ainult search parsing, ilma hinnaosata)
app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (shop !== 'mactabeauty' || !query) {
    return res.json({ products: [] });
  }

  const searchUrl =
    'https://www.mactabeauty.com/catalogsearch/result/?q=' +
    encodeURIComponent(query);

  try {
    // 1) FETCIME SEARCH HTML-i
    const responseSearch = await fetch(searchUrl);
    const searchHtml = await responseSearch.text();

// 2) Ekstraktime tootekardid server-side HTML-ist (Macta)
const productMatches = [...searchHtml.matchAll(
  /<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"[^>]*>/gi
)];

const searchResults = productMatches.map(m => ({
  url: m[1],
  title: m[2].trim()
}));

    // Päris hinnaloogika jääb ootama next step
    return res.json({
      products: [],
      _debug: {
        query,
        searchUrl,
        searchResults
      }
    });

  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

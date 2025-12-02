const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health-check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// MactaBeauty otsing – hetkel ainult search-result parser + debug
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
    const responseSearch = await fetch(searchUrl);
    const searchHtml = await responseSearch.text();

    // Leia kõik <a ... href="..." title="..."> lingid
    const productMatches = [...searchHtml.matchAll(
      /<a[^>]+href="([^"]+)"[^>]+title="([^"]+)"[^>]*>/gi
    )];

    const rawResults = productMatches.map(m => ({
      url: m[1],
      title: m[2].trim()
    }));

    // Filtreerime välja ainult toote-URLid (üks slug, ilma kategooriata)
    const searchResults = rawResults.filter(p => {
      if (!p.url.startsWith('https://www.mactabeauty.com/')) return false;

      const path = p.url.replace('https://www.mactabeauty.com/', '');

      if (!path) return false;
      if (path.includes('/')) return false; // alamteed → kategooriad

      const banned = [
        'customer', 'wishlist', 'joulud', 'eripakkumised', 'meik', 'korea',
        'nagu', 'parfuumid', 'juuksed', 'keha', 'kuuned', 'meestele',
        'toidulisandid', 'tervisetooted', 'tarvikud', 'kodu', 'brandid'
      ];

      return !banned.some(b => path.toLowerCase().startsWith(b));
    });

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

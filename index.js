const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// MactaBeauty search – AJAX API
app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (shop !== "mactabeauty" || !query) {
    return res.json({ products: [] });
  }

  const apiUrl = "https://www.mactabeauty.com/search/ajax/suggest/?q=" + encodeURIComponent(query);

  try {
    const json = await fetch(apiUrl).then(r => r.json());

    const products = (json.products || []).map(p => ({
      title: p.name,
      brand: p.brand || "",
      price: parseFloat((p.price || "0").replace(",", ".")),
      url: p.url,
      image_url: p.image,
      shop: "mactabeauty"
    }));

    return res.json({
      products,
      _debug: {
        query,
        apiUrl,
        count: products.length
      }
    });

  } catch (e) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

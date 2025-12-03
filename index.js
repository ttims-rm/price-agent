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

// MactaBeauty tootelehe adapter
app.get('/price/macta', async (req, res) => {
  const url = (req.query.url || '').trim();
  if (!url.startsWith("https://www.mactabeauty.com/")) {
    return res.json({ products: [] });
  }

  try {
    const html = await fetch(url).then(r => r.text());

    // --- TITLE (product.name schema.org meta) ---
    let title = "";
    const titleMatch = html.match(/"name"\s*:\s*"([^"]+)"/i);
    if (titleMatch) title = titleMatch[1];

    // --- BRAND (schema.org brand) ---
    let brand = "";
    const brandMatch = html.match(/"brand"\s*:\s*{\s*"@type":"Brand","name":"([^"]+)"/i);
    if (brandMatch) brand = brandMatch[1];

    // --- PRICE (schema.org price) ---
    let price = 0;
    const priceMatch = html.match(/"price"\s*:\s*"([\d.]+)"/i);
    if (priceMatch) price = parseFloat(priceMatch[1]);

    // --- IMAGE (schema.org image) ---
    let image_url = "";
    const imgMatch = html.match(/"image"\s*:\s*"([^"]+)"/i);
    if (imgMatch) image_url = imgMatch[1];

    return res.json({
      products: price > 0 ? [{
        title,
        brand,
        price,
        url,
        image_url,
        shop: "mactabeauty"
      }] : [],
      _debug: { url, title, brand, price, image_url }
    });

  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

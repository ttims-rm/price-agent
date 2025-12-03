const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health-check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// MactaBeauty – tootelehe hinna adapter
app.get('/price/macta', async (req, res) => {
  const url = (req.query.url || '').trim();

  if (!url || !url.startsWith('https://www.mactabeauty.com/')) {
    return res.json({ products: [] });
  }

  try {
    const html = await fetch(url).then(r => r.text());

    // --- Pealkiri ---
    let title = '';
    const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1) title = h1[1].replace(/<[^>]*>/g, '').trim();

    // --- Pilt ---
    let image_url = '';
    const img = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    if (img) image_url = img[1];

    // --- Bränd ---
    let brand = '';
    const brandMeta = html.match(/"brand"\s*:\s*{\s*"@type":"Brand","name":"([^"]+)"/i);
    if (brandMeta) brand = brandMeta[1].trim();

    // --- Hind (võtan ainult “product-info-main” blokist) ---
    let price = 0;
    const mainIndex = html.indexOf('product-info-main');
    if (mainIndex !== -1) {
      const slice = html.slice(mainIndex, mainIndex + 8000);
      const matches = [...slice.matchAll(/data-price-amount="([\d.,]+)"/gi)];

      const nums = matches
        .map(m => parseFloat(m[1].replace(',', '.')))
        .filter(n => !isNaN(n) && n > 0);

      if (nums.length) price = Math.min(...nums);
    }

    const product = {
      title,
      brand,
      price,
      url,
      image_url,
      shop: 'mactabeauty'
    };

    return res.json({
      products: price > 0 ? [product] : [],
      _debug: {
        url,
        title,
        brand,
        price
      }
    });

  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

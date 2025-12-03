const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Väike HTML-dekooder (&#x20; jne)
function decodeHtml(str = '') {
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// MactaBeauty tootelehe adapter
app.get('/price/macta', async (req, res) => {
  const url = (req.query.url || '').trim();
  if (!url.startsWith('https://www.mactabeauty.com/')) {
    return res.json({ products: [] });
  }

  try {
    const html = await fetch(url).then(r => r.text());

    // --- TITLE: esmalt og:title, siis schema.org name ---
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

    // --- BRAND (schema.org brand) ---
    let brand = '';
    const brandMatch = html.match(
      /"brand"\s*:\s*{\s*"@type":"Brand","name":"([^"]+)"/i
    );
    if (brandMatch) brand = decodeHtml(brandMatch[1]);

    // --- PRICE ---
    // 1) eelistame meta property="product:price:amount"  (promo / kehtiv hind)
    // 2) fallback: schema.org "price"
    let price = 0;

    const metaPriceMatch = html.match(
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i
    );
    if (metaPriceMatch) {
      price = parseFloat(metaPriceMatch[1].replace(',', '.'));
    } else {
      const schemaPriceMatch = html.match(/"price"\s*:\s*"([\d.]+)"/i);
      if (schemaPriceMatch) price = parseFloat(schemaPriceMatch[1]);
    }

    // --- IMAGE (schema.org image või og:image) ---
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

    return res.json({
      products: price > 0 ? [product] : [],
      _debug: { url, title, brand, price, image_url }
    });
  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

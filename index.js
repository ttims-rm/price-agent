const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

function decodeHtml(str = '') {
  return (str || '')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// ───────────────────────────────
// MAC TA BEAUTY – FIKSEERITUD HINNA PARSER
// ───────────────────────────────
app.get('/price/macta', async (req, res) => {
  const url = (req.query.url || '').trim();
  if (!url.startsWith('https://www.mactabeauty.com/')) {
    return res.json({ products: [] });
  }

  try {
    const html = await fetch(url).then(r => r.text());

    // TITLE (og:title)
    let title = '';
    const t = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    if (t) title = decodeHtml(t[1]);

    // BRAND (schema.org)
    let brand = '';
    const b = html.match(/"brand":\{"@type":"Brand","name":"([^"]+)"/i);
    if (b) brand = decodeHtml(b[1]);

    // PRICE (AINULT product:price:amount → stabiilne)
    let price = 0;
    const pm = html.match(
      /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i
    );
    if (pm) price = parseFloat(pm[1].replace(',', '.'));

    // IMAGE
    let image = '';
    const im = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (im) image = im[1].replace(/\\\//g, '/');

    const product = {
      title,
      brand,
      price,
      url,
      image_url: image,
      shop: 'mactabeauty'
    };

    return res.json({
      products: price > 0 ? [product] : [],
      _debug: { url, title, brand, price, image }
    });
  } catch (e) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent on port ${PORT}`);
});

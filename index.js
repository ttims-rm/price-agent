const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health-check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// Macta debug endpoint – näeme, mida server tegelikult HTML-ist leiab
app.get('/macta-debug', async (req, res) => {
  const PRODUCT_URL = 'https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml';

  try {
    const response = await fetch(PRODUCT_URL);
    const html = await response.text();

    const htmlLength = html.length;

    const prices = [];
    const regex = /€\s*([0-9]+,[0-9]{2})/gu;
    let match;
    while ((match = regex.exec(html)) !== null) {
      prices.push(match[1]);
    }

    res.json({
      htmlLength,
      prices
    });
  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message
    });
  }
});

// Põhi-endpoint: võtab HTML-ist selle toote kõik hinnavariandid ja valib neist madalaima
app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();

  if (shop !== 'mactabeauty') {
    return res.json({ products: [] });
  }

  const PRODUCT_URL = 'https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml';
  const PRODUCT_NAME = 'Luvum Slow Aging Phyto Collagen Cream fütokollageeni kreem 50ml';

  try {
    const response = await fetch(PRODUCT_URL);
    const html = await response.text();

    // TITLE – og:title
    let title = PRODUCT_NAME;
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // IMAGE – og:image
    let imageUrl = null;
    const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (imgMatch) {
      imageUrl = imgMatch[1].trim();
    }

    // PRICE – KÕIK samanimelised plokid + hind
    const escapedName = PRODUCT_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pairRegex = new RegExp(
      escapedName + '[^€]*€\\s*([0-9]+,[0-9]{2})',
      'gu'
    );

    const candidatePrices = [];
    let m;
    while ((m = pairRegex.exec(html)) !== null) {
      const num = parseFloat(m[1].replace(',', '.'));
      if (!Number.isNaN(num)) {
        candidatePrices.push(num);
      }
    }

    let price = null;
    if (candidatePrices.length) {
      price = Math.min(...candidatePrices);
    }

    if (!title || !imageUrl || price === null) {
      return res.json({ products: [] });
    }

    return res.json({
      products: [
        {
          title,
          brand: 'Luvum',
          price,
          url: PRODUCT_URL,
          image_url: imageUrl,
          shop: 'mactabeauty'
        }
      ]
    });
  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

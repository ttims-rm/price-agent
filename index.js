const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Väike abifunktsioon hindade leidmiseks HTML-ist
function extractPricesFromBlock(html) {
  const matches = [...html.matchAll(/(?:€\s*|)(\d+,\d{2})/g)];
  return matches.map(m => parseFloat(m[1].replace(',', '.')));
}

// Health-check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

// Otsime konkreetse Macta tootelehelt hinna (praegu 1 URL, 1 toode)
app.get('/price/macta-product', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const url = (req.query.url || '').trim();

  if (shop !== 'mactabeauty' || !url.startsWith('https://www.mactabeauty.com/')) {
    return res.json({ products: [] });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    // Pealkiri meta og:title põhjal
    const titleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );
    let title = titleMatch ? titleMatch[1] : '';

    // HTML entiteetidest puhastamine
    title = title
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/&amp;/g, '&');

    // Pilt meta og:image põhjal
    const imageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    const image_url = imageMatch ? imageMatch[1] : '';

    // Hinnad – esmalt ainult product-info-main blokist (tootelehe "hero" ala)
    const priceCandidatesAll = extractPricesFromBlock(html);
    let productBlockPrices = [];
    let price = null;

    const mainIdx = html.indexOf('product-info-main');
    if (mainIdx !== -1) {
      const slice = html.slice(mainIdx, mainIdx + 8000);
      productBlockPrices = extractPricesFromBlock(slice);

      if (productBlockPrices.length) {
        // võtame minimaalse hinna selles blokis – promo hind, kui olemas
        price = Math.min(...productBlockPrices);
      }
    }

    // Fallback, kui mingil põhjusel product-info-main ei leitud
    if (price === null && priceCandidatesAll.length) {
      const above10 = priceCandidatesAll.filter(p => p >= 10);
      price = above10.length
        ? Math.min(...above10)
        : Math.min(...priceCandidatesAll);
    }

    const products = [
      {
        title,
        brand: 'Luvum', // praegu kõva väärtus, hiljem teeme üldiseks
        price: price || 0,
        url,
        image_url,
        shop: 'mactabeauty'
      }
    ];

    return res.json({
      products,
      _debug: {
        shop,
        url,
        title,
        priceCandidatesAll,
        productBlockPrices
      }
    });
  } catch (err) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

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

/**
 * Universaalne hinna-adapter:
 * GET /price/fetch?shop=mactabeauty&url=...
 *
 * Praegu toetab ainult MactaBeauty toodetelehti.
 */
app.get('/price/fetch', async (req, res) => {
  const shop = (req.query.shop || '').toLowerCase();
  const url = (req.query.url || '').trim();

  if (!shop || !url) {
    return res.json({ products: [] });
  }

  if (shop !== 'mactabeauty') {
    return res.json({ products: [] });
  }

  try {
    const html = await fetch(url).then(r => r.text());

    // Toote nimi (H1)
    let title = '';
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
      title = h1Match[1].replace(/<[^>]*>/g, '').trim();
    }

    // Hinnad – korjame kõik data-price-amount väärtused ja võtame väikseima (>0)
    const priceMatches = [...html.matchAll(/data-price-amount="([\d.,]+)"/gi)];
    const priceCandidates = priceMatches
      .map(m => parseFloat(m[1].replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0);

    const price =
      priceCandidates.length > 0
        ? Math.min(...priceCandidates)
        : 0;

    // Pilt – proovime esmalt product-galerii pilti
    let image_url = '';
    const imgMatch =
      html.match(/<img[^>]+class="gallery-placeholder__image"[^>]+src="([^"]+)"/i) ||
      html.match(/<img[^>]+class="fotorama__img"[^>]+src="([^"]+)"/i) ||
      html.match(/<img[^>]+src="([^"]+)"[^>]+class="product-image-photo"/i);
    if (imgMatch) {
      image_url = imgMatch[1];
    }

    // Bränd – kui leiame breadcrumbis või meta väljal
    let brand = '';
    const brandMatch =
      html.match(/"brand"\s*:\s*{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/i) ||
      html.match(/itemprop="brand"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
    if (brandMatch) {
      brand = brandMatch[1].trim();
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
        shop,
        url,
        title,
        priceCandidates,
        priceChosen: price
      }
    });
  } catch (e) {
    return res.json({ products: [] });
  }
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

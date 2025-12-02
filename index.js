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

// Main price search endpoint (dummy for now)
app.get('/price/search', (req, res) => {
  const query = req.query.query || '';
  const shop = req.query.shop || 'mactabeauty';

  res.json({
    products: [
      {
        title: 'Luvum Slow Aging Phyto Collagen Cream fütokollageeni kreem 50ml',
        brand: 'Luvum',
        price: 29.95,
        url: 'https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml',
        image_url: 'https://www.mactabeauty.com/media/catalog/product/cache/2ca48355efdb0980405b1b94c9713b2e/l/u/luvum_slow_aging_phyto_collagen_cream_50ml_1_.png',
        shop
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`price-agent listening on port ${PORT}`);
});

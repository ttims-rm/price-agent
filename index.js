const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// -------------------
// LOAD OFFLINE INDEX
// -------------------
let PRODUCTS = JSON.parse(fs.readFileSync('./macta-products.json', 'utf8'));
let EMBED = JSON.parse(fs.readFileSync('./macta-embed.json', 'utf8'));

// -------------------
// EMBEDDING HELPERS
// -------------------
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embedText(q) {
  const r = await fetch(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: q
      })
    }
  );
  const j = await r.json();
  return j.data[0].embedding;
}

// -------------------
// LIVE PRICE PARSER
// -------------------
async function fetchLiveMacta(url) {
  try {
    const html = await (await fetch(url)).text();

    const title = (html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || '').trim();

    const priceMatch =
      html.match(/"price":"([\d.]+)"/) ||
      html.match(/<span[^>]*price[^>]*>([\d.,]+)<\/span>/i);

    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

    const img =
      html.match(/<img[^>]+class="fotorama__img"[^>]+src="([^"]+)"/i)?.[1] ||
      '';

    const brand =
      html.match(/"brand":"([^"]+)"/)?.[1] ||
      '';

    return { title, price, image_url: img, brand };
  } catch (e) {
    return { title: '', price: 0, image_url: '', brand: '' };
  }
}

// -------------------
// SEARCH ENDPOINT
// -------------------
app.get('/price/search', async (req, res) => {
  const query = (req.query.query || '').trim();
  const shop = (req.query.shop || '').trim();

  if (!query || shop !== 'mactabeauty') {
    return res.json({ products: [] });
  }

  // 1) Embed user search
  const qEmbed = await embedText(query);

  // 2) Find best product by cosine similarity
  let best = null;
  let bestScore = -1;

  for (let i = 0; i < EMBED.length; i++) {
    const sim = cosine(qEmbed, EMBED[i].vector);
    if (sim > bestScore) {
      bestScore = sim;
      best = EMBED[i];
    }
  }

  if (!best || bestScore < 0.25) {
    return res.json({
      products: [],
      _debug: { query, match_score: bestScore, match_id: null }
    });
  }

  const product = PRODUCTS.find(p => p.url === best.url);

  if (!product) {
    return res.json({
      products: [],
      _debug: { query, match_score: bestScore, match_id: best?.url || null }
    });
  }

  // 3) Fetch live price
  const live = await fetchLiveMacta(product.url);

  return res.json({
    products: [
      {
        title: live.title || product.title,
        brand: live.brand || product.brand || '',
        price: live.price || 0,
        url: product.url,
        image_url: live.image_url || '',
        shop: 'mactabeauty'
      }
    ],
    _debug: {
      query,
      match_score: bestScore,
      match_id: product.url.replace('https://www.mactabeauty.com/', ''),
      live
    }
  });
});

// -------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'price-agent' });
});

app.listen(PORT, () => {
  console.log(`price-agent running on port ${PORT}`);
});

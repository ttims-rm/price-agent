const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- Laeme Macta tooteindeksi ----
const mactaIndex = JSON.parse(
  fs.readFileSync("macta-products.json", "utf8")
);

// ---- Abifunktsioon: normaliseeri tekst ----
function norm(str) {
  return str
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// ---- Sarnasusskoor (lihtne ja kiire) ----
function score(query, product) {
  const q = norm(query);
  const text = norm(
    product.title + " " + product.brand + " " + product.keywords.join(" ")
  );

  let hits = 0;
  for (let word of q.split(" ")) {
    if (word.length < 2) continue;
    if (text.includes(word)) hits++;
  }
  return hits;
}

// ---- Hinna + pildi lugemine tootelehelt ----
async function fetchLiveData(url) {
  try {
    const resp = await fetch(url);
    const html = await resp.text();
    const clean = html.replace(/\s+/g, " ");

    // HIND – võtame schema.org JSON-ist: "price": 29.95
    const priceMatch = clean.match(/"price"\s*:\s*([0-9][0-9\.,]*)/);
    const price = priceMatch
      ? parseFloat(priceMatch[1].replace(",", "."))
      : 0;

    // TITLE – og:title meta
    const titleMatch = clean.match(
      /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i
    );
    let rawTitle = titleMatch ? titleMatch[1] : "";

    // Väike HTML entity “puhastus”
    const title = rawTitle
      .replace(/&#x20;/gi, " ")
      .replace(/&#xF6;/gi, "ö")
      .replace(/&#xE4;/gi, "ä")
      .replace(/&#xFC;/gi, "ü")
      .replace(/&amp;/gi, "&")
      .trim();

    // PILT – og:image meta
    const imgMatch = clean.match(
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i
    );
    const image_url = imgMatch ? imgMatch[1] : "";

    return { title, price, image_url };
  } catch (e) {
    return { title: "", price: 0, image_url: "" };
  }
}

// ---- Otsing + live hind ----
app.get("/price/search", async (req, res) => {
  const shop = (req.query.shop || "mactabeauty").toLowerCase();
  const query = (req.query.query || "").trim();

  if (!query || shop !== "mactabeauty") {
    return res.json({ products: [] });
  }

  // 1) Leia parim vaste indeksist
  const scored = mactaIndex
    .map((p) => ({
      product: p,
      score: score(query, p),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score === 0) {
    return res.json({ products: [], _debug: { query, match: "none" } });
  }

  // 2) Küsi live hind/pilt otse URL-ilt
  const live = await fetchLiveData(best.product.url);

  const result = {
    title: live.title || best.product.title,
    brand: best.product.brand,
    price: live.price,
    url: best.product.url,
    image_url: live.image_url,
    shop: "mactabeauty",
  };

  return res.json({
    products: [result],
    _debug: {
      query,
      match_score: best.score,
      match_id: best.product.id,
      live,
    },
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "price-agent" });
});

app.listen(PORT, () => {
  console.log("price-agent listening " + PORT);
});

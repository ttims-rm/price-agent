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

// ---- Sarnasusskoor (väike ja kiire) ----
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

// ---- Hind + info tootelehelt ----
async function fetchLiveData(url) {
  try {
    const html = await (await fetch(url)).text();

    const clean = html.replace(/\s+/g, " ");

    // HIND – võta viimane number (soodushind)
    const priceMatch = clean.match(/"price"\s*:\s*"(\d+[,\.]\d+)"/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;

    // PEALKIRI
    const titleMatch = clean.match(/<title>(.*?)<\/title>/i);
    const title =
      titleMatch?.[1]
        ?.replace("Macta Beauty", "")
        ?.replace("- Macta Beauty", "")
        ?.trim() || "";

    // PILT
    const imgMatch = clean.match(
      /<img[^>]+class="fotorama__img"[^>]+src="([^"]+)"/i
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

  // 2) Küsi live hind
  const live = await fetchLiveData(best.product.url);

  const result = {
    title: best.product.title,
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

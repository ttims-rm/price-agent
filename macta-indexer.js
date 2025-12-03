const fs = require("fs");
const fetch = require("node-fetch");

// Macta kategooria – testime ainult ühte kategooriat: näokreemid
const CATEGORY_URL = "https://www.mactabeauty.com/naohooldus/naokreemid";

// Lihtne utiliit
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log("→ Laen kategooria HTML...");

  const html = await (await fetch(CATEGORY_URL)).text();
  const clean = html.replace(/\s+/g, " ");

  console.log("→ Otsin kategooriast tootelehti...");

  // Võtab kõik toote-URLid kategooriast
  const matches = [...clean.matchAll(/<a[^>]+class="product-item-link"[^>]+href="([^"]+)"/gi)];

  const urls = [...new Set(matches.map((m) => m[1]))];

  console.log("→ Leidsin URL-id:", urls.length);

  const products = [];

  for (let url of urls) {
    console.log("→ Laen tootelehte:", url);

    const html2 = await (await fetch(url)).text();
    const c2 = html2.replace(/\s+/g, " ");

    // bränd
    const brandMatch = c2.match(/"brand"\s*:\s*"([^"]+)"/);
    const brand = brandMatch ? brandMatch[1] : "";

    // nimi
    const titleMatch = c2.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    const title = titleMatch ? titleMatch[1] : "";

    // pilt
    const imgMatch = c2.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const image_url = imgMatch ? imgMatch[1] : "";

    // väärtused indeksiks
    products.push({
      id: url.split("/").pop().replace(".html", ""),
      shop: "mactabeauty",
      url,
      title,
      brand,
      keywords: [
        ...title.toLowerCase().split(" ").filter(w => w.length > 2),
        brand.toLowerCase()
      ]
    });

    await sleep(300); // õrn paus (vältida 429 rate limiting)
  }

  console.log("→ Salvestan macta-products.json");
  fs.writeFileSync("macta-products.json", JSON.stringify(products, null, 2));

  console.log("→ Valmis.");
}

run();

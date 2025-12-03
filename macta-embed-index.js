// macta-embed-index.js
// Loob embeddingud kõigile Macta tootelehtedele ja salvestab macta-embed.json

import fs from "fs";
import path from "path";
import OpenAI from "openai";

console.log("→ Alustan embeddingute loomist...");

// Loe tooteindeks
const productsPath = path.join(process.cwd(), "macta-products.json");

if (!fs.existsSync(productsPath)) {
  console.error("❌ macta-products.json puudub!");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(productsPath, "utf8"));
const products = Array.isArray(raw)
  ? raw
  : (Array.isArray(raw.products) ? raw.products : []);

console.log("→ Tooteid:", products.length);

if (!products.length) {
  console.error("❌ macta-products.json on tühi või vales formaadis.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function embedBatch(batch) {
  const texts = batch.map(p => {
    const parts = [];
    if (p.title) parts.push(p.title);
    if (p.brand) parts.push(p.brand);
    parts.push(p.url);
    return parts.join(" | ");
  });

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts
  });

  return response.data.map((item, i) => ({
    ...batch[i],
    embedding: item.embedding
  }));
}

async function run() {
  const BATCH = 50;
  const output = [];

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    console.log(`→ Embedding ${i + 1}–${Math.min(i + BATCH, products.length)} / ${products.length}`);

    const enriched = await embedBatch(batch);
    output.push(...enriched);

    // väike paus
    await new Promise(r => setTimeout(r, 300));
  }

  const outPath = path.join(process.cwd(), "macta-embed.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log("✔ Embeddingud valmis ja salvestatud → macta-embed.json");
}

run().catch(err => {
  console.error("❌ Embeddingute jooks ebaõnnestus:", err.message);
  process.exit(1);
});

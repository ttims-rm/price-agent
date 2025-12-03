// macta-embed-index.js
// Loob embeddingud kõigile Macta tootelehtedele ja salvestab macta-embed.json

import fs from "fs";
import OpenAI from "openai";
import path from "path";

console.log("→ Aloitan embeddingute loomist...");

// Loe tooteindeks (7498 URL-i)
const productsPath = path.join(process.cwd(), "macta-products.json");
if (!fs.existsSync(productsPath)) {
  console.error("❌ macta-products.json puudub!");
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, "utf8"));
console.log("→ Tooteid:", products.length);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Abifunktsioon, et teha embeddinguid väikeste portsudena
async function embedBatch(batch) {
  const texts = batch.map(p => `${p.title} | ${p.brand} | ${p.url}`);

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
    console.log(`→ Embedding ${i + 1} – ${Math.min(i + BATCH, products.length)} / ${products.length}`);

    const enriched = await embedBatch(batch);
    output.push(...enriched);

    // Väike paus serveri stressi vähendamiseks
    await new Promise(r => setTimeout(r, 300));
  }

  fs.writeFileSync(
    path.join(process.cwd(), "macta-embed.json"),
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log("✔ Embeddingud valmis ja salvestatud → macta-embed.json");
}

run();

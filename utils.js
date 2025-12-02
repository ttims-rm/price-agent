// Loob kuni 25 slug variatsiooni tootenimest
function generateSlugs(query) {
  const base = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const words = base.split(" ");

  const slugs = new Set();

  // 1 sõna
  words.forEach(w => slugs.add(w));

  // 2 sõna
  for (let i = 0; i < words.length - 1; i++) {
    slugs.add(`${words[i]}-${words[i+1]}`);
  }

  // 3 sõna
  for (let i = 0; i < words.length - 2; i++) {
    slugs.add(`${words[i]}-${words[i+1]}-${words[i+2]}`);
  }

  // kõik sõnad koos
  slugs.add(words.join("-"));

  return Array.from(slugs).slice(0, 25);
}

module.exports = { generateSlugs };

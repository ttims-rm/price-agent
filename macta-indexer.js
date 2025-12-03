const fetch = require('node-fetch');
const fs = require('fs');

const CATEGORIES = [
  'https://www.mactabeauty.com/naohooldus/naokreemid',
  'https://www.mactabeauty.com/naohooldus/naoseerumid-ja-olid',
  'https://www.mactabeauty.com/naohooldus/maskid',
];

async function fetchCategory(url) {
  console.log('→ Laen kategooria HTML:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PriceAgent/1.0; +https://smitt.ee/hinnad)',
    },
  });

  const html = await res.text();

const matches = [...html.matchAll(
  /<a[^>]+href=["']([^"']+)["'][^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*>/gi
)];

  const urls = matches
    .map((m) => m[1])
    .filter(Boolean)
    .map((href) => {
      if (href.startsWith('http')) return href;
      return 'https://www.mactabeauty.com' + href;
    });

  console.log('→ Kategoorias leidsin URL-e:', urls.length);
  return urls;
}

(async () => {
  try {
    let all = [];

    for (const catUrl of CATEGORIES) {
      const urls = await fetchCategory(catUrl);
      all = all.concat(urls);
    }

    // dedupe
    const unique = Array.from(new Set(all));

    console.log('→ Kokku unikaalseid URL-e:', unique.length);
    fs.writeFileSync(
      'macta-products.json',
      JSON.stringify({ urls: unique }, null, 2),
      'utf8'
    );
    console.log('→ Salvestasin macta-products.json');
    console.log('→ Valmis.');
  } catch (e) {
    console.error('Indexer ERROR:', e.message);
    process.exit(1);
  }
})();

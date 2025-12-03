// macta-indexer.js
// Loeb Macta sitemap_001.xml + sitemap_002.xml, tõmbab kõik tooted
// ja salvestab need macta-products.json faili.

const fs = require('fs');
const fetch = require('node-fetch');

const PRODUCT_SITEMAPS = [
  'https://www.mactabeauty.com/pub/media/sitemap_001.xml',
  'https://www.mactabeauty.com/pub/media/sitemap_002.xml'
];

function decodeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, num) =>
      String.fromCharCode(parseInt(num, 10))
    )
    .trim();
}

async function fetchText(url) {
  const res = await fetch(url, { timeout: 20000 });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return await res.text();
}

async function fetchSitemapUrls(url) {
  console.log('→ Laen sitemap:', url);
  const xml = await fetchText(url);

  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const loc = m[1].trim();
    urls.push(loc);
  }
  console.log('→ Sitemapis leidsin URL-e:', urls.length);
  return urls;
}

(async () => {
  try {
    const allUrls = new Set();

    // 1) Kogu URL-id sitemapidest
    for (const sm of PRODUCT_SITEMAPS) {
      const urls = await fetchSitemapUrls(sm);
      urls.forEach(u => allUrls.add(u));
    }

    // 2) Filtreeri ainult Macta päris tootelehed
const productUrls = [...allUrls].filter(u => {
  if (!u.startsWith('https://www.mactabeauty.com/')) return false;
  if (u.endsWith('.xml')) return false;
  if (u.includes('/media/')) return false;
  if (u.includes('/pub/')) return false;

  const path = u
    .replace('https://www.mactabeauty.com/', '')
    .replace(/\/+$/, '');

  // välista tühjad ja kõik, millel on alamteed (brand/, kategooriad jne)
  if (!path) return false;
  if (path.includes('/')) return false;

  const banned = [
    'customer',
    'wishlist',
    'joulud',
    'eripakkumised',
    'meik',
    'korea',
    'nagu',
    'parfuumid',
    'juuksed',
    'keha',
    'kuuned',
    'meestele',
    'toidulisandid',
    'tervisetooted',
    'tarvikud',
    'kodu',
    'brandid'
  ];

  return !banned.some(b => path.toLowerCase().startsWith(b));
});

    console.log('→ Kokku unikaalseid tootelehti pärast filtrit:', productUrls.length);

    const products = [];

    // 3) Käime iga tootelehe läbi ja võtame minimaalse meta (title, brand)
    for (const url of productUrls) {
      try {
        console.log('→ Toode:', url);
        const html = await fetchText(url);

        // <title> … | Macta Beauty
        let title = '';
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = decodeHtml(
            titleMatch[1].replace(/\s*\|\s*Macta\s*Beauty\s*$/i, '')
          );
        }

        // brand JSON-LD-st
        let brand = '';
        const brandMatch = html.match(
          /"brand"\s*:\s*{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/i
        );
        if (brandMatch) {
          brand = decodeHtml(brandMatch[1]);
        }

        const id = url
          .replace('https://www.mactabeauty.com/', '')
          .replace(/\/+$/, '');

        products.push({
          id,
          url,
          title,
          brand
        });
      } catch (e) {
        console.log('× Toote viga:', url, e.message);
      }
    }

    console.log('→ Lõplik toodete arv:', products.length);
    fs.writeFileSync(
      'macta-products.json',
      JSON.stringify({ products }, null, 2),
      'utf8'
    );
    console.log('→ Salvestasin macta-products.json');
    console.log('→ Valmis.');
    process.exit(0);
  } catch (e) {
    console.error('Fataalne viga indexeriga:', e);
    process.exit(1);
  }
})();

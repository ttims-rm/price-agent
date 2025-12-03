// macta-indexer.js
// Tõmbab Macta sitemapid, leiab tootelehed ja teeb macta-products.json

const fs = require('fs');
const fetch = require('node-fetch');

const SITEMAP_URL = 'https://www.mactabeauty.com/sitemap.xml';

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

function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  return matches.map(m => m[1].trim());
}

function looksLikeProductUrl(url) {
  if (!url.startsWith('https://www.mactabeauty.com/')) return false;
  if (url.endsWith('.xml')) return false;

  // võta ainult “slugid” (mitte kategooria alamteed)
  const path = url.replace('https://www.mactabeauty.com/', '').replace(/\/+$/, '');
  if (!path) return false;
  if (path.includes('/')) return false; // alamteed = suure tõenäosusega kategooria

  // filtreeri ilmsed üldlehed välja
  const banned = [
    'joulud', 'eripakkumised', 'meik', 'korea', 'nagu', 'parfuumid', 'juuksed',
    'keha', 'kuuned', 'meestele', 'toidulisandid', 'tervisetooted',
    'tarvikud', 'kodu', 'brandid', 'customer', 'wishlist'
  ];
  const lower = path.toLowerCase();
  if (banned.some(b => lower.startsWith(b))) return false;

  // tõenäoline tooteleht
  return true;
}

async function fetchText(url) {
  const res = await fetch(url, { timeout: 20000 });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
  return await res.text();
}

(async () => {
  try {
    console.log('→ Laen peamise sitemapi:', SITEMAP_URL);
    const sitemapXml = await fetchText(SITEMAP_URL);
    const sitemapUrls = extractLocs(sitemapXml);

    // Võta kõik alam-sitemapid (product/category jne)
    const childSitemaps = sitemapUrls.filter(u => u.endsWith('.xml'));
    console.log('→ Leidsin alam-sitemape:', childSitemaps.length);

    let allUrls = [];

    for (const sm of childSitemaps) {
      try {
        console.log('→ Laen alam-sitemapi:', sm);
        const xml = await fetchText(sm);
        const locs = extractLocs(xml);
        allUrls.push(...locs);
      } catch (e) {
        console.log('× Ei õnnestunud sitemap:', sm, e.message);
      }
    }

    // Kui mingil põhjusel alam-sitemappe ei tule, kasuta ka peamist
    if (allUrls.length === 0) {
      allUrls = extractLocs(sitemapXml);
    }

    // Filtreeri välja tootelehtede URL-id
    const productUrls = [...new Set(allUrls.filter(looksLikeProductUrl))];

    console.log('→ Tõenäolisi tootelehti:', productUrls.length);

    const products = [];

    // Vajadusel võid ajutiselt piirata, nt:
    // const toProcess = productUrls.slice(0, 300);
    const toProcess = productUrls;

    for (const url of toProcess) {
      try {
        console.log('→ Toode:', url);
        const html = await fetchText(url);

        // Pealkiri – võtame <title> ja eemaldame " | Macta Beauty"
        let title = '';
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = decodeHtml(
            titleMatch[1].replace(/\s*\|\s*Macta\s*Beauty\s*$/i, '')
          );
        }

        // Bränd – schema.org JSON-LD "brand" väli
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

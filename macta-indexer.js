// macta-indexer.js
// Loeb Macta sitemap_001.xml + sitemap_002.xml, leiab toote-URLid
// ja salvestab need macta-products.json faili (ilma HTML-i tõmbamata).

const fs = require('fs');
const fetch = require('node-fetch');

const PRODUCT_SITEMAPS = [
  'https://www.mactabeauty.com/pub/media/sitemap_001.xml',
  'https://www.mactabeauty.com/pub/media/sitemap_002.xml'
];

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

// Väike abifunktsioon slugi "inimsõbralikuks" pealkirjaks
function titleFromSlug(id) {
  if (!id) return '';
  const base = id.replace(/[-_]+/g, ' ');
  return base
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Bränd = esimene sõna pealkirjast (heuristika)
function brandFromTitle(title) {
  if (!title) return '';
  const first = title.split(' ')[0];
  return first;
}

(async () => {
  try {
    const allUrls = new Set();

    // 1) korja kõik URL-id kahest sitemapist
    for (const sm of PRODUCT_SITEMAPS) {
      const urls = await fetchSitemapUrls(sm);
      urls.forEach(u => allUrls.add(u));
    }

    // 2) filtreeri välja ainult "päris" tootelehed
    const productUrls = [...allUrls].filter(u => {
      if (!u.startsWith('https://www.mactabeauty.com/')) return false;
      if (u.endsWith('.xml')) return false;
      if (u.includes('/media/')) return false;
      if (u.includes('/pub/')) return false;

      const path = u
        .replace('https://www.mactabeauty.com/', '')
        .replace(/\/+$/, '');

      if (!path) return false;
      if (path.includes('/')) return false; // välista kategooriad, brand/, jne

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

    // 3) tee neist "kerge" products-indeks
    const products = productUrls.map(url => {
      const id = url
        .replace('https://www.mactabeauty.com/', '')
        .replace(/\/+$/, '');

      const title = titleFromSlug(id);
      const brand = brandFromTitle(title);

      return {
        id,
        url,
        title,
        brand
      };
    });

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

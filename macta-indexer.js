const fs = require('fs');

const URLS = [
  // Luvum
  'https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml',

  // Friendly Organic
  'https://www.mactabeauty.com/friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml',

  // Kräuterhof
  'https://www.mactabeauty.com/krauterhof-night-cream-hyaluron-50ml',
];

(function main() {
  console.log('→ Kirjutan Macta tooteindeksi (statiiline URL-list)...');
  const unique = Array.from(new Set(URLS));
  console.log('→ Kokku unikaalseid URL-e:', unique.length);

  fs.writeFileSync(
    'macta-products.json',
    JSON.stringify({ urls: unique }, null, 2),
    'utf8'
  );

  console.log('→ Salvestasin macta-products.json');
  console.log('→ Valmis.');
})();

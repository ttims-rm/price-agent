const fs = require('fs');

const URLS = [
  "https://www.mactabeauty.com/luvum-slow-aging-phyto-collagen-cream-50ml",
  "https://www.mactabeauty.com/friendly-organic-stain-remover-orgaaniline-plekieemaldaja-250ml",
  "https://www.mactabeauty.com/krauterhof-night-cream-hyaluron-50ml",
  "https://www.mactabeauty.com/olaplex-volumizing-blow-dry-mist-150ml",
  "https://www.mactabeauty.com/hh-simonsen-styling-oil",
  "https://www.mactabeauty.com/mood-03-heat-defender-200ml",
  "https://www.mactabeauty.com/schwarzkopf-professional-osis-smooth-shine-flatliner-200ml",
  "https://www.mactabeauty.com/schwarzkopf-professional-osis-thrill-elastic-fiber-gum-100ml",
  "https://www.mactabeauty.com/schwarzkopf-professional-osis-curl-jam-defining-gel-300ml",
  "https://www.mactabeauty.com/loving-tan-deluxe-gradual-tan-niisutav-ja-tooniv-kehakreem-150ml",
  "https://www.mactabeauty.com/loving-tan-easy-to-reach-back-applicator",
  "https://www.mactabeauty.com/loving-tan-deluxe-bronzing-mousse-isepruunistav-vaht-120ml",
  "https://www.mactabeauty.com/sister-s-aroma-perfume-s-4-pur-pur",
  "https://www.mactabeauty.com/andreia-hybrid-gel-fusion-shine",
  "https://www.mactabeauty.com/ivybears-juuksekasvu-kiirendavad-ja-valjalangemist-vahendavad-kummikarud",
  "https://www.mactabeauty.com/ivybears-men-s-hair-vitamins",
  "https://www.mactabeauty.com/ivybears-boost-immune-kummikarud",
  "https://www.mactabeauty.com/andreia-lab-gel-effect-top-coat-10-5ml",
  "https://www.mactabeauty.com/superdren-tselluliiti-vahendav-ja-vett-valjutav-jaaefektiga-kruogeel",
  "https://www.mactabeauty.com/superdren-depura-pineapple-drink-bottle-500ml"
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

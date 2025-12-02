const fetch = require('node-fetch');

// Tootelehe HTML-ist hinna ja pildi väljavõtmine
async function fetchProductData(url) {
  try {
    const html = await fetch(url).then(r => r.text());

    // H1 → toote nimi
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // hind (punane soodushind)
    const priceMatch = html.match(/price-final[^>]*>(?:\s*<[^>]+>)*\s*([\d.,]+)</i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;

    // pilt (product image)
    const imgMatch = html.match(/<img[^>]+class="gallery-placeholder__image"[^>]+src="([^"]+)"/i);
    const image_url = imgMatch ? imgMatch[1] : "";

    // bränd (breadcrumbist)
    const brandMatch = html.match(/brand[^>]*>\s*([^<]+)\s*</i);
    const brand = brandMatch ? brandMatch[1].trim() : "";

    return {
      title,
      brand,
      price,
      image_url,
      url
    };

  } catch (e) {
    return null;
  }
}

module.exports = { fetchProductData };

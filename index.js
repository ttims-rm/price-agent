app.get('/price/search', async (req, res) => {
  const shop = (req.query.shop || 'mactabeauty').toLowerCase();
  const query = (req.query.query || '').trim();

  if (!query || shop !== "mactabeauty") {
    return res.json({ products: [] });
  }

  const apiUrl = "https://www.mactabeauty.com/search/ajax/suggest/?q=" + encodeURIComponent(query);

  try {
    const json = await fetch(apiUrl).then(r => r.json());

    const products = (json.products || []).map(p => ({
      title: p.name,
      price: parseFloat((p.price || "0").replace(",", ".")),
      url: p.url,
      image_url: p.image,
      brand: p.brand || "",
      shop: "mactabeauty"
    }));

    return res.json({
      products,
      _debug: {
        query,
        apiUrl,
        rawCount: json.products?.length || 0
      }
    });

  } catch (e) {
    return res.json({ products: [] });
  }
});

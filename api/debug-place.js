export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing q" });
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress"
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: "fr"
      })
    });

    const data = await response.json();

    return res.status(response.status).json({
      status: response.status,
      ok: response.ok,
      query: q,
      googleResponse: data
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}

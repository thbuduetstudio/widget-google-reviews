export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q, location } = req.query;

  if (!q) return res.status(400).json({ error: "Missing query" });

  try {
    const textQuery = location ? `${q} ${location}` : q;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri"
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "fr",
        regionCode: "FR",
        maxResultCount: 10
      })
    });

    const data = await response.json();

    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data.places || []);
  } catch (error) {
    return res.status(500).json({ error: "Unable to search place" });
  }
}

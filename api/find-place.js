export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount"
      },
      body: JSON.stringify({
        textQuery: q,
        languageCode: "fr",
        maxResultCount: 5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data.places || []);
  } catch (error) {
    return res.status(500).json({ error: "Unable to search place" });
  }
}

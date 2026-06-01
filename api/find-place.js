export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q, location, maps_url } = req.query;

  let finalQuery = q || "";

  if (maps_url) {
    finalQuery = extractQueryFromMapsUrl(maps_url) || finalQuery;
  }

  if (!finalQuery) {
    return res.status(400).json({ error: "Missing query or maps_url" });
  }

  try {
    const textQuery = location ? `${finalQuery} ${location}` : finalQuery;

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,businessStatus"
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

    return res.status(200).json({
      extractedQuery: finalQuery,
      places: data.places || []
    });
  } catch (error) {
    return res.status(500).json({ error: "Unable to search place" });
  }
}

function extractQueryFromMapsUrl(rawUrl) {
  try {
    const decoded = decodeURIComponent(rawUrl);

    const placeMatch = decoded.match(/\/place\/([^/@?]+)/);
    if (placeMatch?.[1]) {
      return placeMatch[1].replaceAll("+", " ").trim();
    }

    const searchMatch = decoded.match(/\/search\/([^/@?]+)/);
    if (searchMatch?.[1]) {
      return searchMatch[1]
        .replaceAll("+", " ")
        .replace(/\bAvis\b/gi, "")
        .trim();
    }

    const queryParam = decoded.match(/[?&]q=([^&]+)/);
    if (queryParam?.[1]) {
      return queryParam[1].replaceAll("+", " ").trim();
    }

    return "";
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { place_id, place } = req.query;

  if (!place_id && !place) {
    return res.status(400).json({
      error: "Missing place_id or place"
    });
  }

  try {
    let finalPlaceId = place_id;

    if (!finalPlaceId && place) {
      const searchResponse = await fetch(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress"
          },
          body: JSON.stringify({
            textQuery: place,
            languageCode: "fr",
            maxResultCount: 1
          })
        }
      );

      const searchData = await searchResponse.json();

      if (!searchResponse.ok) {
        return res.status(searchResponse.status).json(searchData);
      }

      if (!searchData.places || !searchData.places.length) {
        return res.status(404).json({
          error: "No place found"
        });
      }

      finalPlaceId = searchData.places[0].id;
    }

    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(finalPlaceId)}?languageCode=fr`,
      {
        headers: {
          "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "id,displayName,rating,userRatingCount,reviews,googleMapsUri"
        }
      }
    );

    const data = await detailsResponse.json();

    if (!detailsResponse.ok) {
      return res.status(detailsResponse.status).json(data);
    }

    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=604800"
    );

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Unable to fetch Google reviews"
    });
  }
}

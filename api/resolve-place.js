export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { maps_url } = req.query;

  if (!maps_url) {
    return res.status(400).json({ error: "Missing maps_url" });
  }

  try {
    const resolvedUrl = await resolveUrl(maps_url);
    const extracted = extractFromMapsUrl(resolvedUrl);

    let candidates = [];

    if (extracted.placeId) {
      const place = await getPlaceDetails(extracted.placeId);
      candidates = [place];
    } else if (extracted.query) {
      candidates = await searchPlaces(extracted.query);
    }

    return res.status(200).json({
      resolvedUrl,
      extracted,
      places: candidates.filter(Boolean)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to resolve Google Maps URL",
      details: error.message
    });
  }
}

async function resolveUrl(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 TrustKitBot"
    }
  });

  return response.url || url;
}

function extractFromMapsUrl(url) {
  const decoded = decodeURIComponent(url);

  const placeIdMatch = decoded.match(/ChI[a-zA-Z0-9_-]+/);

  const placeMatch = decoded.match(/\/place\/([^/@?]+)/);
  const searchMatch = decoded.match(/\/search\/([^/@?]+)/);

  let query = "";

  if (placeMatch?.[1]) {
    query = placeMatch[1].replaceAll("+", " ").trim();
  } else if (searchMatch?.[1]) {
    query = searchMatch[1]
      .replaceAll("+", " ")
      .replace(/\bAvis\b/gi, "")
      .trim();
  }

  return {
    placeId: placeIdMatch?.[0] || "",
    query
  };
}

async function getPlaceDetails(placeId) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri"
      }
    }
  );

  if (!response.ok) return null;
  return await response.json();
}

async function searchPlaces(query) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri"
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      regionCode: "FR",
      maxResultCount: 10
    })
  });

  const data = await response.json();
  return data.places || [];
}

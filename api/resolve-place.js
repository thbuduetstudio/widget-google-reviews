export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { maps_url } = req.query;

  if (!maps_url) {
    return res.status(400).json({ error: "Missing maps_url" });
  }

  try {
    const decoded = decodeURIComponent(maps_url);
    const extracted = extractGoogleMapsData(decoded);

    let places = [];

    if (extracted.placeId) {
      const place = await getPlaceDetails(extracted.placeId);
      if (place) places.push(place);
    }

    if (!places.length && extracted.name) {
      places = await searchPlacesNew(extracted.name);
    }

    if (!places.length && extracted.name) {
      places = await searchPlacesLegacy(extracted.name);
    }

    return res.status(200).json({
      extracted,
      places
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to resolve Google Maps URL",
      details: error.message
    });
  }
}

function extractGoogleMapsData(raw) {
  const decoded = decodeURIComponent(raw);

  const placeIdMatch = decoded.match(/ChI[a-zA-Z0-9_-]+/);

  const embedNameMatch = decoded.match(/!2s([^!]+)/);
  const placeUrlMatch = decoded.match(/\/place\/([^/@?]+)/);
  const searchUrlMatch = decoded.match(/\/search\/([^/@?]+)/);

  const googleIdMatch = decoded.match(/0x[a-fA-F0-9]+:0x[a-fA-F0-9]+/);

  let name = "";

  if (embedNameMatch?.[1]) {
    name = embedNameMatch[1].replaceAll("+", " ").trim();
  } else if (placeUrlMatch?.[1]) {
    name = placeUrlMatch[1].replaceAll("+", " ").trim();
  } else if (searchUrlMatch?.[1]) {
    name = searchUrlMatch[1]
      .replaceAll("+", " ")
      .replace(/\bAvis\b/gi, "")
      .trim();
  }

  return {
    placeId: placeIdMatch?.[0] || "",
    googleInternalId: googleIdMatch?.[0] || "",
    name
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

async function searchPlacesNew(query) {
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

async function searchPlacesLegacy(query) {
  const url =
    "https://maps.googleapis.com/maps/api/place/findplacefromtext/json" +
    `?input=${encodeURIComponent(query)}` +
    "&inputtype=textquery" +
    "&fields=place_id,name,formatted_address,rating,user_ratings_total" +
    "&language=fr" +
    `&key=${process.env.GOOGLE_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.candidates) return [];

  return data.candidates.map((place) => ({
    id: place.place_id,
    displayName: {
      text: place.name
    },
    formattedAddress: place.formatted_address || "Adresse non publique",
    rating: place.rating,
    userRatingCount: place.user_ratings_total
  }));
}

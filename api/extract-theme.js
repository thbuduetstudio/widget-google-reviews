export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url } = req.query;

  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 TrustKitThemeBot"
      }
    });

    const html = await response.text();

    const colors = Array.from(
      html.matchAll(/#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\)/g)
    ).map(match => match[0]);

    const cleanColors = [...new Set(colors)]
      .filter(c => !["#fff", "#ffffff", "#000", "#000000"].includes(c.toLowerCase()))
      .slice(0, 8);

    return res.status(200).json({
      url: targetUrl,
      colors: cleanColors,
      suggested: {
        accentColor: cleanColors[0] || "#717254",
        bgColor: "#ffffff",
        textColor: "#222222",
        radius: 24
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to extract theme"
    });
  }
}

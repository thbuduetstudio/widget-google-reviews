export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 TrustKitThemeBot" }
    });

    const html = await response.text();

    const colorMatches = [
      ...html.matchAll(/#[0-9a-fA-F]{3,6}/g)
    ].map(m => normalizeHex(m[0])).filter(Boolean);

    const themeColor =
      html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i)?.[1];

    const cssVarColors = [
      ...html.matchAll(/--[^:]+:\s*(#[0-9a-fA-F]{3,6})/g)
    ].map(m => normalizeHex(m[1])).filter(Boolean);

    const ranked = rankColors([
      themeColor,
      ...cssVarColors,
      ...colorMatches
    ]);

    const accent = ranked[0] || "#2563eb";
    const text = isDarkColor(accent) ? "#222222" : "#1f1f1f";
    const bg = "#ffffff";

    return res.status(200).json({
      url: targetUrl,
      colors: ranked.slice(0, 10),
      suggested: {
        accentColor: accent,
        bgColor: bg,
        textColor: text,
        radius: 24
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to extract theme"
    });
  }
}

function normalizeHex(color) {
  if (!color || !color.startsWith("#")) return null;

  let hex = color.toLowerCase();

  if (hex.length === 4) {
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;

  return hex;
}

function rankColors(colors) {
  const counts = {};

  colors
    .map(normalizeHex)
    .filter(Boolean)
    .filter(color => !isNeutral(color))
    .forEach(color => {
      counts[color] = (counts[color] || 0) + 1;
    });

  return Object.entries(counts)
    .sort((a, b) => {
      const scoreA = scoreColor(a[0], a[1]);
      const scoreB = scoreColor(b[0], b[1]);
      return scoreB - scoreA;
    })
    .map(([color]) => color);
}

function scoreColor(hex, count) {
  const { r, g, b } = hexToRgb(hex);
  const saturation = getSaturation(r, g, b);
  const brightness = (r + g + b) / 3;

  let score = count * 10;
  score += saturation * 80;

  if (brightness > 40 && brightness < 220) score += 20;
  if (brightness < 25 || brightness > 235) score -= 50;

  return score;
}

function isNeutral(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;

  if (brightness > 235 || brightness < 20) return true;
  if (max - min < 18) return true;

  return false;
}

function isDarkColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 120;
}

function getSaturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  return (max - min) / max;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

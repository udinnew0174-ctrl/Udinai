import axios from "axios";
import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  // RATE LIMIT CHECK
  const limit = rateLimit(req, {
    cooldownMs: 30 * 1000, // proxy lebih ringan, cooldown 30 detik aja
    maxPerDay: 200,        // limit proxy lebih tinggi
  });

  if (!limit.allowed) {
    return res.status(limit.status).json({
      error: limit.message,
      remaining: limit.remaining,
      waitSeconds: limit.waitSeconds,
    });
  }

  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("URL kosong");

    const response = await axios.get(url, {
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Referer: "https://downr.org/",
      },
      maxRedirects: 10,
    });

    const contentType =
      response.headers["content-type"] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="download-${Date.now()}"`
    );

    response.data.pipe(res);
  } catch (err) {
    console.error("PROXY ERROR:", err.message);
    res.status(500).send("Gagal download media");
  }
}

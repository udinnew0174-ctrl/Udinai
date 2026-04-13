import DownrScraper from "../../lib/downr";
import { rateLimit } from "../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // RATE LIMIT CHECK
  const limit = rateLimit(req, {
    cooldownMs: 2 * 60 * 1000,
    maxPerDay: 25,
  });

  if (!limit.allowed) {
    return res.status(limit.status).json({
      error: limit.message,
      remaining: limit.remaining,
      waitSeconds: limit.waitSeconds,
    });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL kosong" });
    }

    const downr = new DownrScraper();
    const data = await downr.fetch(url);

    if (!data || !data.medias || !data.medias.length) {
      return res.status(404).json({ error: "Media tidak ditemukan" });
    }

    const medias = data.medias.map((m) => ({
      type: m.type,
      url: m.url,
      quality: m.quality || null,
    }));

    return res.status(200).json({
      title: data.title || null,
      source: url,
      medias,
      remaining: limit.remaining, // info buat frontend
    });
  } catch (err) {
    console.error("DOWNLOAD API ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

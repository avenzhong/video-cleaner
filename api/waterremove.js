// api/waterremove.js
export default async function handler(req, res) {
  try {
    const { link } = req.query;
    if (!link) return res.status(400).json({ error: "missing link" });

    const ak = process.env.API_KEY;
    if (!ak) return res.status(500).json({ error: "server missing API_KEY" });

    const upstream = `https://api.guijianpan.com/waterRemoveDetail/xxmQsyByAk?ak=${encodeURIComponent(ak)}&link=${encodeURIComponent(link)}`;

    const r = await fetch(upstream, { headers: { accept: "application/json" } });
    const body = await r.text(); // 直接透传文本，避免多次序列化
    // 关键：禁止缓存，防 304
    res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(r.status).send(body);
  } catch (e) {
    res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
    return res.status(500).json({ error: e.message });
  }
}
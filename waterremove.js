// api/waterremove.js
export default async function handler(req, res) {
  try {
    const { link } = req.query;
    if (!link) return res.status(400).json({ error: "missing link" });

    const ak = process.env.API_KEY; // 秘钥放在 Vercel 环境变量
    if (!ak) return res.status(500).json({ error: "server missing API_KEY" });

    const upstream = `https://api.guijianpan.com/waterRemoveDetail/xxmQsyByAk?ak=${encodeURIComponent(ak)}&link=${encodeURIComponent(link)}`;

    const r = await fetch(upstream, { headers: { accept: "application/json" } });
    if (!r.ok) return res.status(r.status).json({ error: `upstream ${r.status}` });

    const data = await r.json();

    // 可选：做字段白名单过滤，这里直接透传
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
// api/waterremove.js
export const config = { runtime: "edge" };

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const link = url.searchParams.get("link");
    if (!link) {
      return new Response(JSON.stringify({ error: "missing link" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const ak = process.env.API_KEY;
    if (!ak) {
      return new Response(JSON.stringify({ error: "server missing API_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const upstream = `https://api.guijianpan.com/waterRemoveDetail/xxmQsyByAk?ak=${encodeURIComponent(ak)}&link=${encodeURIComponent(link)}`;

    const r = await fetch(upstream, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    return new Response(r.body, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
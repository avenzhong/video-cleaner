// api/download.js
export const config = { runtime: "edge" };

const ALLOW_HOSTS = [
  /(^|.)365yg\.com$/i,
  /(^|.)douyinpic\.com$/i,
  /(^|.)douyin\.com$/i,
  /(^|.)ixigua\.com$/i,
  /(^|.)byteimg\.com$/i,
];

function isAllowed(u) {
  const h = u.hostname;
  return ALLOW_HOSTS.some(re => re.test(h));
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const src = url.searchParams.get("url");
    const filename = (url.searchParams.get("filename") || "download").replace(/[^\w.\-]/g, "_");

    if (!src) {
      return new Response(JSON.stringify({ error: "missing url" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const target = new URL(src);

    // 避免变成开放代理：只允许白名单域名
    if (!isAllowed(target)) {
      return new Response(JSON.stringify({ error: "host not allowed" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const baseHeaders = {
      "accept": "*/*",
      // 伪装常见浏览器 UA，避免某些 CDN 基于 UA 拦截
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    };

    // 尝试 1：带 Douyin Referer（多数字节系直链需要）
    let r = await fetch(target.toString(), {
      headers: { ...baseHeaders, "referer": "https://www.douyin.com/" },
      redirect: "follow",
      cache: "no-store",
    });

    // 若仍 403，再尝试 2：去掉 referer
    if (r.status === 403) {
      r = await fetch(target.toString(), {
        headers: baseHeaders,
        redirect: "follow",
        cache: "no-store",
      });
    }

    if (!r.ok) {
      return new Response(JSON.stringify({ error: `upstream ${r.status}` }), {
        status: r.status,
        headers: { "content-type": "application/json" }
      });
    }

    const headers = new Headers();
    headers.set("content-type", r.headers.get("content-type") || "application/octet-stream");
    headers.set("content-disposition", `attachment; filename="${filename}"`);
    headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
    // 一些 CDN 会带压缩头，转发下载时去掉以防某些浏览器边下边播异常
    headers.delete("content-encoding");

    return new Response(r.body, { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
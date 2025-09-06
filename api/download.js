// api/download.js
export const config = { runtime: "edge" };

// 只允许这些域名，防止成开放代理
const ALLOW_HOSTS = [
  /(^|.)365yg\.com$/i,
  /(^|.)douyinpic\.com$/i,
  /(^|.)douyin\.com$/i,
  /(^|.)byteimg\.com$/i,
  /(^|.)ixigua\.com$/i,
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36";

function isAllowed(u) {
  return ALLOW_HOSTS.some((re) => re.test(u.hostname));
}

async function fetchOnce(target, headers) {
  return fetch(target.toString(), {
    headers,
    cache: "no-store",
    redirect: "follow",
    // 关键：不带浏览器端的 referrer
    referrerPolicy: "no-referrer",
  });
}

export default async function handler(request) {
  try {
    const url = new URL(request.url);
    const src = url.searchParams.get("url");
    const filename = (url.searchParams.get("filename") || "download").replace(/[^\w.\-]/g, "_");

    if (!src) {
      return new Response(JSON.stringify({ error: "missing url" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const target = new URL(src);
    if (!isAllowed(target)) {
      return new Response(JSON.stringify({ error: "host not allowed" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // 一些字节系 CDN 对请求头比较敏感：UA / Accept / Range / (可选)Referer
    const baseHeaders = {
      "user-agent": UA,
      "accept": "*/*",
      // 许多视频源要求 Range，否则可能 403/416；用 0- 让其返回 206 或 200
      "range": "bytes=0-",
      // 可选：有些服务会基于语言策略限流
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    };

    // 第一枪：不带 referer（很多直链允许无 Referer）
    let r = await fetchOnce(target, baseHeaders);

    // 若被 403，再试带 Douyin Referer / Origin
    if (r.status === 403) {
      const withRef = {
        ...baseHeaders,
        "referer": "https://www.douyin.com/",
        "origin":  "https://www.douyin.com",
      };
      r = await fetchOnce(target, withRef);
    }

    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: `upstream ${r.status}`, url: target.toString() }),
        { status: r.status, headers: { "content-type": "application/json" } }
      );
    }

    const headers = new Headers();
    headers.set("content-type", r.headers.get("content-type") || "application/octet-stream");
    headers.set("content-disposition", `attachment; filename="${filename}"`);
    headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");

    // 透传长度（如果上游给了）
    const len = r.headers.get("content-length");
    if (len) headers.set("content-length", len);

    // 避免边下边播：去掉压缩标记
    headers.delete("content-encoding");

    return new Response(r.body, { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
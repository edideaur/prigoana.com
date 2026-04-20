export async function onRequest(context) {
  const origin = context.request.headers.get("Origin") || "";
  const allowedOrigin = /^https:\/\/([\w-]+\.)?prigoana\.com$/.test(origin)
    ? origin
    : "https://prigoana.com";

  const { searchParams } = new URL(context.request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "missing slug" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin },
    });
  }

  const pageUrl = `https://craigndave.org/videos/${slug}/`;
  const res = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "failed to fetch page" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin },
    });
  }

  const html = await res.text();
  const match = html.match(/youtube\.com\/embed\/([\w-]+)/);

  if (!match) {
    return new Response(JSON.stringify({ error: "no youtube embed found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin },
    });
  }

  return new Response(JSON.stringify({ id: match[1] }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin },
  });
}

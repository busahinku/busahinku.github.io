// The only public door to the R2 bucket, at https://files.busahin.com.
//
// It exists to make the bill impossible to run up. Responses are cached at the
// edge, query strings other than ?v= (the content hash scripts/r2.mjs puts in
// links) are ignored so they cannot be used to dodge the cache, and the Workers
// free plan stops at 100,000 requests a day with an error instead of a charge.
// That caps reads from R2 at about 3 million a month, under the 10 million free.
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const v = url.searchParams.get("v");
    const cacheKey = new Request(`${url.origin}${url.pathname}${v ? `?v=${encodeURIComponent(v)}` : ""}`);
    const cache = caches.default;

    let response = await cache.match(cacheKey);
    if (!response) {
      const object = await env.FILES.get(decodeURIComponent(url.pathname.slice(1)));
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      response = new Response(object.body, { headers });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return request.method === "HEAD" ? new Response(null, response) : response;
  },
};

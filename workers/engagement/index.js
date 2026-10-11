// Views, likes and comments for posts, projects and course notes, at
// https://busahin.com/api/page. It replaced Firebase: a page loads a few hundred
// bytes for this instead of ~420 KB, and nobody has to sign in with Google.
// Everything lives in D1 on the Workers free plan, where running out of the
// daily allowance ends in an error, never a charge.
// Comments wait until Burak approves them (`npm run comments`), so spam never
// reaches a page, and once QUEUE are waiting new ones are refused until he looks.
const SITE = "https://busahin.com";
const ORIGINS = new Set([SITE, "http://localhost:4321"]);
const QUEUE = 100;

const KEY = /^(blog|projects|courses)\/[a-z0-9][a-z0-9-]{0,80}$/;
const VISITOR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

// A comment as stored, whitespace tidied and lengths bounded; null if it is not one.
// Control characters go too: comments are read in a terminal (`npm run comments`),
// where an escape sequence could rewrite what is shown.
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g;
function cleanComment(input) {
  const name = typeof input.name === "string" ? input.name.replace(/\s+/g, " ").replace(CONTROL, "").trim().slice(0, 60) : "";
  const body =
    typeof input.body === "string"
      ? input.body
          .replace(/\r\n?/g, "\n")
          .replace(/[^\S\n]+/g, " ")
          .replace(CONTROL, "")
          .replace(/ *\n */g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
      : "";
  return body.length >= 2 && body.length <= 2000 ? { name, body } : null;
}

// Only real pages get a row: a key seen for the first time is checked against the site.
async function known(env, key) {
  if (await env.DB.prepare("SELECT 1 FROM pages WHERE key = ?").bind(key).first()) return true;
  return (await fetch(`${SITE}/${key}/`, { method: "HEAD", cf: { cacheTtl: 3600 } })).ok;
}

// Counts, whether this visitor liked the page, and its approved comments.
// `view: true` counts the visit first (the page sends it once per session).
async function page(env, { key, visitor, view }, cors) {
  if (view) {
    if (!(await known(env, key))) return json({ error: "page" }, 404, cors);
    await env.DB.prepare("INSERT INTO pages (key, views) VALUES (?, 1) ON CONFLICT (key) DO UPDATE SET views = views + 1").bind(key).run();
  }
  const [counts, liked, comments] = await env.DB.batch([
    env.DB.prepare("SELECT views, likes FROM pages WHERE key = ?").bind(key),
    env.DB.prepare("SELECT 1 FROM likes WHERE key = ? AND visitor = ?").bind(key, VISITOR.test(visitor) ? visitor : ""),
    env.DB.prepare("SELECT name, body, created FROM comments WHERE key = ? AND approved = 1 ORDER BY id LIMIT 500").bind(key),
  ]);
  const { views = 0, likes = 0 } = counts.results[0] ?? {};
  return json({ views, likes, liked: liked.results.length > 0, comments: comments.results }, 200, cors);
}

// Sets (not toggles) this visitor's like, then recounts, so a double click or a
// retry can never push the number off.
async function like(env, { key, visitor, liked }, cors) {
  if (!VISITOR.test(visitor) || !(await known(env, key))) return json({ error: "bad" }, 400, cors);
  const change = liked
    ? env.DB.prepare("INSERT OR IGNORE INTO likes (key, visitor) VALUES (?, ?)").bind(key, visitor)
    : env.DB.prepare("DELETE FROM likes WHERE key = ? AND visitor = ?").bind(key, visitor);
  const [, counted] = await env.DB.batch([
    change,
    env.DB.prepare(
      "INSERT INTO pages (key, likes) VALUES (?1, (SELECT COUNT(*) FROM likes WHERE key = ?1)) ON CONFLICT (key) DO UPDATE SET likes = excluded.likes RETURNING likes",
    ).bind(key),
  ]);
  return json({ likes: counted.results[0].likes, liked: Boolean(liked) }, 200, cors);
}

async function comment(env, input, ip, cors) {
  if (!(await env.COMMENTS.limit({ key: ip })).success) return json({ error: "rate" }, 429, cors);
  // Only bots fill the hidden "website" field; tell them it worked and keep nothing.
  if (input.website) return json({ pending: true }, 202, cors);
  const clean = cleanComment(input);
  if (!clean || !(await known(env, input.key))) return json({ error: "bad" }, 400, cors);
  const waiting = await env.DB.prepare("SELECT COUNT(*) AS n FROM comments WHERE approved = 0").first("n");
  if (waiting >= QUEUE) return json({ error: "queue" }, 503, cors);
  await env.DB.prepare("INSERT INTO comments (key, name, body) VALUES (?, ?, ?)").bind(input.key, clean.name, clean.body).run();
  return json({ pending: true }, 202, cors);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    if (!ORIGINS.has(origin)) return new Response(null, { status: 403 });
    // Same-origin requests need no CORS; only local development does.
    const cors = origin === SITE ? {} : { "access-control-allow-origin": origin, vary: "Origin" };
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "access-control-allow-methods": "POST", "access-control-allow-headers": "Content-Type", "access-control-max-age": "86400" } });
    }
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (Number(request.headers.get("content-length") || 0) > 8000) return json({ error: "length" }, 413, cors);

    let input;
    try {
      input = await request.json();
    } catch {
      return json({ error: "bad" }, 400, cors);
    }
    if (!input || typeof input.key !== "string" || !KEY.test(input.key)) return json({ error: "bad" }, 400, cors);

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const path = new URL(request.url).pathname;
    try {
      if (path === "/api/page/comment") return await comment(env, input, ip, cors);
      const [mine, all] = await Promise.all([env.PER_VISITOR.limit({ key: ip }), env.SITE_WIDE.limit({ key: "site" })]);
      if (!mine.success || !all.success) return json({ error: "rate" }, 429, cors);
      if (path === "/api/page") return await page(env, input, cors);
      if (path === "/api/page/like") return await like(env, input, cors);
      return new Response(null, { status: 404 });
    } catch (error) {
      // Most likely the free daily allowance is spent; the page just hides the counts.
      console.error(error);
      return json({ error: "unavailable" }, 503, cors);
    }
  },
};

// For check.mjs.
export { KEY, VISITOR, cleanComment };

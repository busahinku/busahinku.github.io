// Views, likes and comments from workers/engagement (busahin.com/api/page).
// The counts and the comments on a page come back in one request, shared by
// PageStats and Comments. Development reads the live data but never counts a view.
const ENDPOINT = import.meta.env.DEV ? "https://busahin.com/api/page" : "/api/page";

export type PageComment = { name: string; body: string; created: string };
export type PageData = { views: number; likes: number; liked: boolean; comments: PageComment[] };

// "/tr/courses/stat497/" -> "courses/stat497": both languages share one count.
export const pageKey = (path: string) => path.replace(/^\/(tr\/)?|\/$/g, "");

// A random id that remembers this browser's like. Not an account, nothing else.
export function visitor() {
  try {
    let id = localStorage.getItem("blog_visitor_id");
    if (!id) localStorage.setItem("blog_visitor_id", (id = crypto.randomUUID()));
    return id;
  } catch {
    return "";
  }
}

export async function send<T>(path: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

let current: { key: string; data: Promise<PageData | null> } | null = null;

// The visit is counted once per tab session.
export function load(key: string) {
  if (current?.key === key) return current.data;
  const seen = `viewed:${key}`;
  let view = false;
  try {
    view = !import.meta.env.DEV && !sessionStorage.getItem(seen);
  } catch {}
  const data = send<PageData>("", { key, visitor: visitor(), view }).then((d) => {
    try {
      if (d && view) sessionStorage.setItem(seen, "1");
    } catch {}
    return d;
  });
  current = { key, data };
  return data;
}

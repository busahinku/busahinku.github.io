import type { APIRoute } from "astro";
import { bookNotes, noteLinks } from "../../utils/book-notes";

// Which books have a note, for the reading Worker: it fetches this on each
// pull, so the private side knows which finished books still lack one
// without a secret or any write path back into the repository.
export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ notes: noteLinks(await bookNotes("en"), "en").map(({ keys, href, title }) => ({ keys, href, title })) }), {
    headers: { "content-type": "application/json" },
  });

import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { shareCard } from "../../lib/og-card.mjs";
import { getLocalizedProjects, getProjectSlug } from "../../utils/project-localization";

// /og/<collection>/<slug>.png: the share card each post, project and course
// page points its og:image at (see src/lib/og-card.mjs). Both languages share
// the English card.
export const getStaticPaths = (async () => {
  const live = ({ data }: { data: { draft: boolean } }) => !data.draft;
  const blog = await getCollection("blog", live);
  const projects = getLocalizedProjects(await getCollection("projects", live), "en");
  const courses = await getCollection("courses", live);
  return [
    ...blog.map((e) => ({ params: { slug: `blog/${e.id}` }, props: { kind: "Writing", ...e.data } })),
    ...projects.map((e) => ({ params: { slug: `projects/${getProjectSlug(e)}` }, props: { kind: "Project", ...e.data } })),
    ...courses.map((e) => ({ params: { slug: `courses/${e.id}` }, props: { kind: "Course notes", ...e.data } })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  new Response(await shareCard({ kind: props.kind, title: props.title, description: props.description }), {
    headers: { "content-type": "image/png" },
  });

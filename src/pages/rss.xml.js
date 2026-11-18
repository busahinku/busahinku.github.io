import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const posts = await getCollection("blog", ({ data }) => !data.draft);
	const notes = await getCollection("books", ({ data }) => !data.draft && data.lang === "en");
	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items: [
			...posts.map((post) => ({
				...post.data,
				link: `/blog/${post.id}/`,
			})),
			...notes.map((note) => ({
				title: note.data.title,
				description: note.data.description ?? note.data.author,
				pubDate: note.data.finished,
				link: `/reading/${note.data.translationKey ?? note.id}/`,
			})),
		],
	});
}

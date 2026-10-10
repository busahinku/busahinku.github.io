import { getCollection, render } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE } from '../../consts';

// One item per course, for its newest week. The link points at that week's
// heading, so a new week is a new link and feed readers show it as new.
export async function GET(context) {
	const courses = await getCollection('courses', ({ data }) => !data.draft);
	const items = await Promise.all(
		courses.map(async (course) => {
			const { headings } = await render(course);
			const week = headings.filter((h) => h.depth === 2 && /^Week \d+/.test(h.text)).at(-1);
			return {
				title: week ? `${course.data.title}, ${week.text}` : course.data.title,
				description: week
					? `New notes for ${week.text} in ${course.data.title}. ${course.data.description}`
					: course.data.description,
				pubDate: course.data.updatedDate ?? course.data.pubDate,
				link: `/courses/${course.id}/${week ? `#${week.slug}` : ''}`,
			};
		}),
	);
	return rss({
		title: `${SITE_TITLE}: course notes`,
		description: 'A new item every time a course gets a new week of notes.',
		site: context.site,
		items: items.sort((a, b) => b.pubDate - a.pubDate),
		// the links end in a #week anchor, which a trailing slash would break
		trailingSlash: false,
	});
}

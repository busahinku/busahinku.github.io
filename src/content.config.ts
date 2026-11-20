import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const CATEGORIES = ['technology', 'tutorial', 'personal', 'design', 'programming', 'philosophy', 'other'] as const;
export type Category = typeof CATEGORIES[number];

export const PROJECT_CATEGORIES = ['web', 'mobile', 'desktop', 'api', 'library', 'other', 'statistics', 'survey', 'academia', 'network', 'ML/DL', 'AI'] as const;
export type ProjectCategory = typeof PROJECT_CATEGORIES[number];

export const COURSE_CATEGORIES = ['statistics', 'mathematics', 'electrics-electronics', 'computer-engineering', 'programming', 'other'] as const;
export type CourseCategory = typeof COURSE_CATEGORIES[number];

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			tags: z.array(z.string()).default([]),
			category: z.enum(CATEGORIES).default('other'),
			author: z.string().default('Burak Sahin Kucuk'),
			featured: z.boolean().default(false),
			pinned: z.boolean().default(false),
			draft: z.boolean().default(false),
		}),
});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			tags: z.array(z.string()).default([]),
			category: z.enum(PROJECT_CATEGORIES).default('other'),
			author: z.string().default('Burak Sahin Kucuk'),
			featured: z.boolean().default(false),
			pinned: z.boolean().default(false),
			draft: z.boolean().default(false),
			// Project-specific fields
			github: z.string().url().optional(),
			demo: z.string().url().optional(),
			status: z.enum(['active', 'completed', 'archived', 'in-progress']).default('completed'),
			// A translated entry points back to the URL slug of its original entry.
			lang: z.enum(['en', 'tr']).default('en'),
			translationKey: z.string().optional(),
		}),
});

const courses = defineCollection({
	loader: glob({ base: './src/content/courses', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			tags: z.array(z.string()).default([]),
			category: z.enum(COURSE_CATEGORIES).default('other'),
			author: z.string().default('Burak Sahin Kucuk'),
			featured: z.boolean().default(false),
			pinned: z.boolean().default(false),
			draft: z.boolean().default(false),
		}),
});

// A note about a book he has finished, at /reading/<slug>/. English is the
// canonical language, like projects: a Turkish note sets lang "tr" and points
// translationKey at the English file's slug.
const books = defineCollection({
	loader: glob({ base: './src/content/books', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			author: z.string(),
			finished: z.coerce.date(),
			// One sentence for listings and the meta description; optional.
			description: z.string().optional(),
			// The title exactly as the reader reports it, when it differs from `title`.
			readerTitle: z.string().optional(),
			heroImage: image().optional(),
			// The book's cover as the reading Worker keeps it in R2 (written by the private app when it publishes).
			cover: z
				.string()
				.regex(/^https:\/\/files\.busahin\.com\/reading\/covers\/[0-9a-f-]{36}(\?v=[0-9a-f]{1,16})?$/)
				.optional(),
			// The book's description from CrossPoint Sync (written by the private app when it publishes),
			// and whether it came from Hardcover, which is then credited under it.
			about: z.string().max(6000).optional(),
			aboutFromHardcover: z.boolean().optional(),
			draft: z.boolean().default(false),
			lang: z.enum(['en', 'tr']).default('en'),
			translationKey: z.string().optional(),
		}),
});

export const collections = { blog, projects, courses, books };

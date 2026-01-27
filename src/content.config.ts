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
			draft: z.boolean().default(false),
			// Project-specific fields
			github: z.string().url().optional(),
			demo: z.string().url().optional(),
			status: z.enum(['active', 'completed', 'archived', 'in-progress']).default('completed'),
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
			draft: z.boolean().default(false),
		}),
});

export const collections = { blog, projects, courses };

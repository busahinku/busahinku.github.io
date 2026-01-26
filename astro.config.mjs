// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://busahinku.github.io',
  integrations: [mdx(), sitemap()],
  output: 'static',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
      transformers: [
        {
          // Remove background-color from inline styles so our CSS works
          pre(node) {
            const style = node.properties?.style;
            if (typeof style === 'string') {
              // Remove background-color and --shiki-dark-bg from inline style
              node.properties.style = style
                .replace(/background-color:[^;]+;?/gi, '')
                .replace(/--shiki-dark-bg:[^;]+;?/gi, '')
                .trim();
            }
          },
        },
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
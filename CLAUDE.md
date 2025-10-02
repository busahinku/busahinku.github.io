# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the project for production (static export)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Deployment
- `npm run postbuild` - Generate sitemap (runs automatically after build)
- `npm run deploy` - Build and deploy to GitHub Pages via git subtree

## Architecture Overview

This is a **Next.js 15** personal blog/portfolio website configured for **static export** and deployed to **GitHub Pages**.

### Core Structure
- **App Router**: Uses Next.js App Router (not Pages Router)
- **Static Export**: Configured with `output: 'export'` for GitHub Pages deployment
- **Content Management**: Markdown files in `content/` directory processed with gray-matter
- **Authentication**: Firebase Auth with Google OAuth for comments/likes
- **Database**: Firestore for storing comments and likes
- **Styling**: Tailwind CSS with custom themes

### Key Directories
- `app/` - Main application code using App Router
- `content/blog/` - Markdown blog posts with frontmatter
- `content/projects/` - Markdown project descriptions
- `public/` - Static assets, images, icons

### Content System
- Blog posts and projects are written in Markdown
- Frontmatter includes: title, description, date, tags, mainPhoto
- Content is processed at build time using gray-matter
- Utility functions: `getBlogPosts()` and `getProjects()` in `app/utils/`

### Firebase Integration
- Firebase config in `app/lib/firebase.ts`
- Requires environment variables for Firebase API keys
- Features: Google Authentication, Firestore comments/likes, App Check with reCAPTCHA
- Client-side components handle authentication state

### Component Architecture
- **Client Components**: Components with interactivity (comments, likes, theme switching)
- **Server Components**: Static content rendering
- **Shared Components**: Navbar, Footer, OptimizedMarkdown, etc.
- **Page-specific Components**: Comments, TableOfContents, LikeButton per post type

### Theming
- Custom theme context in `app/context/ThemeContext.tsx`
- Dark/light mode support throughout the application
- Theme preference persisted in localStorage

### Key Features
- Static site generation for fast loading
- SEO optimized with metadata and structured data
- Responsive design with mobile menu
- Markdown processing with syntax highlighting
- Mathematical equations support (KaTeX)
- Interactive comment system
- Like functionality for posts

### Build Process
1. Content is read from `content/` directories
2. Markdown is processed and converted to static HTML
3. Static export generates files in `out/` directory
4. Sitemap is automatically generated
5. GitHub Actions deploys to Pages

### Environment Variables Required
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

### Development Notes
- Uses Turbopack for faster development builds
- TypeScript with strict mode enabled
- ESLint configured with Next.js recommended rules
- No test framework currently configured
- Automated deployment via GitHub Actions on main branch pushes
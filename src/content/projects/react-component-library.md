---
title: 'React Component Library'
description: 'A reusable React component library with TypeScript, Storybook documentation, and comprehensive testing.'
pubDate: 'Nov 20 2023'
heroImage: '../../assets/blog-placeholder-3.jpg'
tags: ['react', 'typescript', 'storybook', 'jest', 'npm']
category: 'library'
author: 'Burak Sahin'
github: 'https://github.com/busahinku/react-ui'
demo: 'https://busahinku.github.io/react-ui'
status: 'active'
---

## Overview

A collection of reusable React components built with accessibility and customization in mind.

## Components

- Button variants (primary, secondary, outline, ghost)
- Form inputs with validation states
- Modal and Dialog components
- Toast notifications
- Data tables with sorting and pagination

## Development

```bash
npm install @busahinku/react-ui
```

```jsx
import { Button, Modal } from '@busahinku/react-ui';

function App() {
  return (
    <Button variant="primary" onClick={() => {}}>
      Click me
    </Button>
  );
}
```

## Testing

All components have unit tests with Jest and React Testing Library, achieving 90%+ code coverage.

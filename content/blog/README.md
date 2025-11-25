# Blog Posts

This directory contains all blog posts in Markdown format.

## How to Write a New Blog Post

1. Create a new `.md` file in this directory (e.g., `my-new-post.md`)
2. Add frontmatter at the top of the file with the following structure:

```markdown
---
slug: my-new-post
title: My New Blog Post Title
excerpt: A brief description of the post (used in listings)
author: Your Name
publishedAt: 2025-01-30
tags:
  - tag1
  - tag2
  - tag3
readingTime: 5
coverImage: /path/to/image.jpg (optional)
---

# Your Blog Post Title

Your content goes here in Markdown format...
```

3. Save the file - it will automatically appear on the blog!

## Frontmatter Fields

- **slug**: URL-friendly identifier (e.g., `my-new-post` becomes `/blog/my-new-post`)
- **title**: The post title
- **excerpt**: Short description shown in blog listings
- **author**: Author name
- **publishedAt**: Publication date in YYYY-MM-DD format
- **tags**: Array of tags for categorization
- **readingTime**: Estimated reading time in minutes (optional, auto-calculated if not provided)
- **coverImage**: Optional cover image URL
- **updatedAt**: Optional update date in YYYY-MM-DD format

## Markdown Support

All standard Markdown is supported, plus:
- GitHub Flavored Markdown (GFM)
- Links, images, code blocks
- Lists, tables, blockquotes
- And more!

## Example

See the existing `.md` files in this directory for examples.



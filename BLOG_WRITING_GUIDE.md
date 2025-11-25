# Blog Writing Guide

## Where to Write Articles

**Location:** `content/blog/` directory

Simply create a new `.md` file in the `content/blog/` directory and it will automatically appear on your blog!

## Quick Start

1. Navigate to the `content/blog/` directory
2. Create a new file: `my-article-title.md`
3. Add frontmatter and content (see template below)
4. Save - your article will appear on `/blog` automatically!

## Article Template

```markdown
---
slug: my-article-title
title: My Article Title
excerpt: A brief description that appears in blog listings
author: Your Name
publishedAt: 2025-01-30
tags:
  - tag1
  - tag2
readingTime: 5
---

# Your Article Title

Your article content goes here in Markdown format...

## Sections

You can use all standard Markdown features:
- **Bold** and *italic* text
- Lists (ordered and unordered)
- Links: [text](url)
- Images: ![alt](image-url)
- Code blocks
- And more!
```

## Frontmatter Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `slug` | Yes | URL-friendly identifier | `my-article-title` |
| `title` | Yes | Article title | `My Article Title` |
| `excerpt` | Yes | Short description for listings | `A brief description...` |
| `author` | Yes | Author name | `John Doe` |
| `publishedAt` | Yes | Publication date (YYYY-MM-DD) | `2025-01-30` |
| `tags` | Yes | Array of tags | `["product", "ai"]` |
| `readingTime` | No | Reading time in minutes (auto-calculated if omitted) | `5` |
| `coverImage` | No | Cover image URL | `/images/my-image.jpg` |
| `updatedAt` | No | Update date (YYYY-MM-DD) | `2025-02-01` |

## Examples

See existing articles in `content/blog/`:
- `welcome-to-loopwell.md`
- `organizational-intelligence-explained.md`
- `building-better-workplaces.md`

## Tips

1. **Slug**: Use lowercase, hyphens instead of spaces (e.g., `my-article-title`)
2. **Excerpt**: Keep it under 200 characters for best display
3. **Tags**: Use consistent tags across articles for better categorization
4. **Reading Time**: Will be auto-calculated based on word count if not specified
5. **Markdown**: Full GitHub Flavored Markdown is supported

## Preview

After saving your article:
- Visit `/blog` to see it in the listing
- Visit `/blog/[your-slug]` to see the full article

That's it! No database, no admin panel - just markdown files! 🎉



# Wiki/Page Editor Upgrade Implementation Plan
## Migration from HTML-String to TipTap/ProseMirror Structured Editor

**Version:** 1.0  
**Date:** 2025-01-XX  
**Goal:** Upgrade to Notion/Slite-level UX while maintaining backward compatibility

---

## Executive Summary

**Migration Approach:** Dual-format storage with gradual conversion
- Add `contentJson` (JSON) field alongside existing `content` (HTML)
- New pages default to JSON format
- Legacy pages remain HTML until user upgrades
- HTML → JSON conversion on-demand or via batch job
- **Source of truth:** JSON becomes primary after Stage 3; HTML kept for export/backward compatibility

**Why `textContent` field:** Store plain text extraction for:
- Full-text search (PostgreSQL `tsvector` or external search)
- LoopBrain context extraction (clean text without HTML/JSON parsing)
- SEO/excerpt generation
- Faster search queries (no need to parse JSON/HTML)

---

## PART 1: Data Model Changes

### Prisma Schema Changes

**File:** `prisma/schema.prisma`

#### WikiPage Model Updates

```prisma
model WikiPage {
  // ... existing fields ...
  content              String                // Keep for backward compatibility
  contentJson          Json?                 // NEW: ProseMirror JSON document
  contentFormat        ContentFormat         @default(HTML) // NEW: enum
  textContent          String?               // NEW: Plain text for search
  // ... rest of fields ...
  
  @@index([workspaceId, contentFormat], map: "idx_wiki_pages_format")
  @@index([workspaceId, updatedAt], map: "idx_wiki_pages_workspace_updated") // Already exists
}

enum ContentFormat {
  HTML
  JSON
}
```

#### WikiVersion Model Updates

```prisma
model WikiVersion {
  // ... existing fields ...
  content              String                // Keep for backward compatibility
  contentJson          Json?                 // NEW: ProseMirror JSON document
  contentFormat        ContentFormat?        // NEW: Track format at version time
  // ... rest of fields ...
}
```

#### Migration Steps

**File:** `prisma/migrations/YYYYMMDDHHMMSS_add_content_json_fields/migration.sql`

```sql
-- Step 1: Add new columns (nullable)
ALTER TABLE "wiki_pages" 
  ADD COLUMN "contentJson" JSONB,
  ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'HTML',
  ADD COLUMN "textContent" TEXT;

ALTER TABLE "wiki_versions" 
  ADD COLUMN "contentJson" JSONB,
  ADD COLUMN "contentFormat" TEXT;

-- Step 2: Create enum type (PostgreSQL)
CREATE TYPE "ContentFormat" AS ENUM ('HTML', 'JSON');

-- Step 3: Update column types to use enum
ALTER TABLE "wiki_pages" 
  ALTER COLUMN "contentFormat" TYPE "ContentFormat" USING "contentFormat"::"ContentFormat";

ALTER TABLE "wiki_versions" 
  ALTER COLUMN "contentFormat" TYPE "ContentFormat" USING "contentFormat"::"ContentFormat";

-- Step 4: Add indexes
CREATE INDEX "idx_wiki_pages_format" ON "wiki_pages"("workspaceId", "contentFormat");
CREATE INDEX "idx_wiki_pages_text_content" ON "wiki_pages" USING gin(to_tsvector('english', "textContent")) WHERE "textContent" IS NOT NULL;

-- Step 5: Backfill textContent from existing HTML (optional, can run async)
-- This will be handled by a script, not in migration
```

**Backfill Strategy:**
- **Immediate:** No backfill required - fields are nullable
- **Async script:** `scripts/backfill-text-content.ts` (runs after deployment)
- **On-demand:** Extract text when page is opened/edited

**Validation:**
- Existing reads/writes continue to work (content field unchanged)
- New fields are nullable, so no breaking changes
- Default `contentFormat = HTML` maintains current behavior

---

## PART 2: API Changes

### Updated Request/Response Payloads

**File:** `src/app/api/wiki/pages/route.ts`

#### POST /api/wiki/pages (Create)

**Request Body (New Format):**
```json
{
  "title": "My New Page",
  "contentJson": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Hello world"}]
      }
    ]
  },
  "contentFormat": "JSON",
  "parentId": null,
  "tags": ["documentation"],
  "category": "general",
  "permissionLevel": "team",
  "workspace_type": "team"
}
```

**Request Body (Legacy Format - Still Supported):**
```json
{
  "title": "My New Page",
  "content": "<p>Hello world</p>",
  "contentFormat": "HTML",
  // ... other fields
}
```

**Implementation:**
```typescript
// POST handler updates
const { title, content, contentJson, contentFormat = 'HTML', ... } = body

// Validation
if (!title) {
  return NextResponse.json({ error: 'Title is required' }, { status: 400 })
}

if (contentFormat === 'JSON' && !contentJson) {
  return NextResponse.json({ error: 'contentJson required when contentFormat is JSON' }, { status: 400 })
}

if (contentFormat === 'HTML' && !content) {
  return NextResponse.json({ error: 'content required when contentFormat is HTML' }, { status: 400 })
}

// Extract text content for search
const textContent = contentFormat === 'JSON' 
  ? extractTextFromProseMirror(contentJson)
  : extractTextFromHTML(content)

// Create page
const page = await prisma.wikiPage.create({
  data: {
    workspaceId: auth.workspaceId,
    title,
    slug: generateSlug(title),
    content: content || '', // Always set, even if empty (for backward compat)
    contentJson: contentFormat === 'JSON' ? contentJson : null,
    contentFormat: contentFormat as ContentFormat,
    textContent,
    excerpt: textContent?.substring(0, 200) || '',
    // ... other fields
  }
})
```

#### GET /api/wiki/pages/[id] (Read)

**Response (Negotiated Format):**
```json
{
  "id": "page-123",
  "title": "My Page",
  "content": "<p>Legacy HTML</p>",           // Always included for backward compat
  "contentJson": { "type": "doc", ... },     // Included if contentFormat === 'JSON'
  "contentFormat": "JSON",
  "textContent": "Plain text for search",
  // ... other fields
}
```

**Implementation:**
```typescript
// GET handler
const page = await prisma.wikiPage.findUnique({
  where: { id: resolvedParams.id },
  // ... includes
})

// Return both formats for compatibility
return NextResponse.json({
  ...page,
  // Ensure both fields are present
  content: page.content || '',
  contentJson: page.contentJson || null,
  contentFormat: page.contentFormat || 'HTML'
})
```

#### PUT /api/wiki/pages/[id] (Update)

**Request Body:**
```json
{
  "title": "Updated Title",
  "contentJson": { "type": "doc", ... },  // Preferred for JSON format
  "content": "<p>HTML</p>",                // Fallback for HTML format
  "contentFormat": "JSON",
  "tags": ["updated"]
}
```

**Implementation:**
```typescript
// PUT handler updates
const { title, content, contentJson, contentFormat, ... } = body

// Determine format (prefer JSON if both provided)
const finalFormat = contentJson ? 'JSON' : (contentFormat || currentPage.contentFormat || 'HTML')
const finalContent = contentJson || content || currentPage.content

// Validate
if (finalFormat === 'JSON' && !contentJson) {
  return NextResponse.json({ error: 'contentJson required for JSON format' }, { status: 400 })
}

// Extract text content
const textContent = finalFormat === 'JSON'
  ? extractTextFromProseMirror(contentJson)
  : extractTextFromHTML(finalContent)

// Update page
const updatedPage = await prisma.wikiPage.update({
  where: { id: resolvedParams.id },
  data: {
    ...(title && { title, slug: generateSlug(title) }),
    ...(finalFormat === 'JSON' 
      ? { contentJson: contentJson, contentFormat: 'JSON' }
      : { content: finalContent, contentFormat: 'HTML' }
    ),
    textContent,
    excerpt: textContent?.substring(0, 200) || '',
    // ... other fields
  }
})

// Create version (store in same format as current save)
if (contentChanged) {
  await prisma.wikiVersion.create({
    data: {
      pageId: resolvedParams.id,
      content: finalFormat === 'JSON' ? JSON.stringify(contentJson) : finalContent,
      contentJson: finalFormat === 'JSON' ? contentJson : null,
      contentFormat: finalFormat,
      version: nextVersion,
      createdById: auth.user.userId
    }
  })
}
```

### Validation Rules

**File:** `src/lib/wiki/content-validator.ts` (NEW)

```typescript
import { JSONContent } from '@tiptap/core'

export function validateProseMirrorJSON(json: any): json is JSONContent {
  if (!json || typeof json !== 'object') return false
  if (json.type !== 'doc') return false
  if (!Array.isArray(json.content)) return false
  return true
}

export function validateHTML(html: string): boolean {
  // Basic validation - ensure it's valid HTML
  if (typeof html !== 'string') return false
  // Could add DOMParser validation here
  return html.length > 0 || html === ''
}

export function extractTextFromProseMirror(json: JSONContent): string {
  // Recursively extract text nodes
  const extract = (node: any): string => {
    if (node.type === 'text') return node.text || ''
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extract).join(' ')
    }
    return ''
  }
  return extract(json).trim()
}

export function extractTextFromHTML(html: string): string {
  // Strip HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
```

### Error Handling

- **400 Bad Request:** Invalid content format, missing required fields
- **409 Conflict:** Slug collision (existing)
- **422 Unprocessable:** Invalid ProseMirror JSON structure
- **500 Internal:** Conversion errors, database failures

---

## PART 3: Frontend Editor Implementation

### TipTap Setup

**File:** `src/components/wiki/tiptap-editor.tsx` (NEW)

```typescript
"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Typography from '@tiptap/extension-typography'
import History from '@tiptap/extension-history'
import { lowlight } from 'lowlight'
import { SlashCommand } from './tiptap-extensions/slash-command'
import { Embed } from './tiptap-extensions/embed'
import { JSONContent } from '@tiptap/core'

interface TipTapEditorProps {
  content: JSONContent | null
  onChange: (json: JSONContent) => void
  placeholder?: string
  editable?: boolean
  onSave?: () => void
}

export function TipTapEditor({ 
  content, 
  onChange, 
  placeholder = "Type '/' for commands...",
  editable = true,
  onSave
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Use separate History extension for better control
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Typography,
      History,
      SlashCommand,
      Embed,
    ],
    content: content || {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[200px] p-4',
      },
      handlePaste: (view, event) => {
        // Enhanced paste handling - preserve formatting from Google Docs, Word, etc.
        const html = event.clipboardData?.getData('text/html')
        if (html) {
          // TipTap will handle HTML paste automatically
          return false // Let TipTap handle it
        }
        return false
      },
    },
  })

  // Handle save keyboard shortcut
  useEffect(() => {
    if (!editor || !onSave) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor, onSave])

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return <EditorContent editor={editor} />
}
```

### TipTap Extensions

#### Slash Command Extension

**File:** `src/components/wiki/tiptap-extensions/slash-command.tsx` (NEW)

```typescript
import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'
import { SlashCommandList } from './slash-command-list'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
      } as SuggestionOptions,
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ]
  },
})

// Slash command menu component
export const SlashCommandList = ({ items, command }: any) => {
  // Render command palette (heading, code, table, embed, etc.)
  // Implementation similar to existing EmbedCommandPalette but for all block types
}
```

#### Embed Node Extension

**File:** `src/components/wiki/tiptap-extensions/embed.tsx` (NEW)

```typescript
import { Node, mergeAttributes } from '@tiptap/core'

export const Embed = Node.create({
  name: 'embed',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      embedId: {
        default: null,
        parseHTML: element => element.getAttribute('data-embed-id'),
        renderHTML: attributes => {
          if (!attributes.embedId) {
            return {}
          }
          return {
            'data-embed-id': attributes.embedId,
          }
        },
      },
      provider: {
        default: 'generic',
      },
      url: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-embed-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedComponent)
  },
})
```

### Component Architecture

#### WikiEditorShell

**File:** `src/components/wiki/wiki-editor-shell.tsx` (NEW)

```typescript
"use client"

import { useState, useCallback } from 'react'
import { TipTapEditor } from './tiptap-editor'
import { WikiEditorToolbar } from './wiki-editor-toolbar'
import { SaveStatus } from './save-status'
import { JSONContent } from '@tiptap/core'

interface WikiEditorShellProps {
  initialContent: JSONContent | null
  onSave: (content: JSONContent) => Promise<void>
  placeholder?: string
}

export function WikiEditorShell({ 
  initialContent, 
  onSave, 
  placeholder 
}: WikiEditorShellProps) {
  const [content, setContent] = useState<JSONContent | null>(initialContent)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (contentToSave: JSONContent) => {
      try {
        setSaveStatus('saving')
        await onSave(contentToSave)
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (error) {
        console.error('Autosave failed:', error)
        setSaveStatus('error')
        // Retry after 2 seconds
        setTimeout(() => {
          debouncedSave(contentToSave)
        }, 2000)
      }
    }, 2000), // 2 second debounce
    [onSave]
  )

  const handleContentChange = (newContent: JSONContent) => {
    setContent(newContent)
    debouncedSave(newContent)
  }

  const handleManualSave = async () => {
    if (!content) return
    try {
      setSaveStatus('saving')
      await onSave(content)
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (error) {
      setSaveStatus('error')
    }
  }

  return (
    <div className="border rounded-lg">
      <WikiEditorToolbar onSave={handleManualSave} />
      <TipTapEditor
        content={content}
        onChange={handleContentChange}
        placeholder={placeholder}
        editable={true}
        onSave={handleManualSave}
      />
      <SaveStatus status={saveStatus} lastSaved={lastSaved} />
    </div>
  )
}
```

#### WikiRenderer (Read-Only)

**File:** `src/components/wiki/wiki-renderer.tsx` (NEW)

```typescript
"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// ... all extensions (same as editor, but editable: false)
import { JSONContent } from '@tiptap/core'

interface WikiRendererProps {
  content: JSONContent | null
  className?: string
}

export function WikiRenderer({ content, className }: WikiRendererProps) {
  const editor = useEditor({
    extensions: [
      // Same extensions as TipTapEditor
    ],
    content: content || { type: 'doc', content: [] },
    editable: false,
  })

  if (!editor) {
    return <div>Loading...</div>
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  )
}
```

### Autosave Behavior

**Implementation Details:**
- **Debounce:** 2 seconds after last keystroke
- **Indicator:** "Saving..." → "Saved" → "Error" (with retry)
- **Optimistic updates:** Content updates immediately, save happens in background
- **Retry strategy:** Exponential backoff (2s, 4s, 8s) with max 3 retries
- **Manual save:** Cmd/Ctrl+S triggers immediate save

**File:** `src/lib/utils/debounce.ts` (if not exists)

```typescript
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
```

---

## PART 4: Migration Strategy (CRITICAL)

### Stage 0: Schema Preparation (Week 1)

**Goal:** Add JSON fields without changing behavior

**Changes:**
1. Run Prisma migration (add `contentJson`, `contentFormat`, `textContent`)
2. Update API to accept both formats (but default to HTML)
3. No frontend changes yet

**Rollback:** Drop new columns (data loss only for any new JSON content)

**Validation:**
- All existing pages still load
- New pages can be created (still HTML)
- API accepts both formats but ignores JSON

---

### Stage 1: New Pages Use JSON (Week 2)

**Goal:** New pages default to TipTap/JSON format

**Changes:**
1. Update `src/app/(dashboard)/wiki/new/page.tsx` to use `WikiEditorShell`
2. Update POST API to default `contentFormat = 'JSON'` for new pages
3. Keep legacy editor available via feature flag

**Frontend:**
```typescript
// src/app/(dashboard)/wiki/new/page.tsx
import { WikiEditorShell } from '@/components/wiki/wiki-editor-shell'

// Replace RichTextEditor with WikiEditorShell
<WikiEditorShell
  initialContent={null}
  onSave={handleSave}
  placeholder="Start writing..."
/>
```

**API:**
```typescript
// POST /api/wiki/pages
const contentFormat = body.contentFormat || 'JSON' // Default to JSON for new pages
```

**Rollback:** Feature flag to revert to HTML editor

**Validation:**
- New pages save as JSON
- New pages render correctly
- Legacy pages still work

---

### Stage 2: Legacy Mode + Upgrade Button (Week 3-4)

**Goal:** Legacy pages render in HTML mode; users can upgrade

**Changes:**
1. Update `src/app/(dashboard)/wiki/[slug]/page.tsx` to detect format
2. Show "Upgrade to new editor" button for HTML pages
3. Implement HTML → JSON conversion on upgrade

**Frontend:**
```typescript
// src/app/(dashboard)/wiki/[slug]/page.tsx
const isLegacyPage = page.contentFormat === 'HTML'

{isLegacyPage && (
  <Button onClick={handleUpgradePage}>
    Upgrade to new editor
  </Button>
)}

{isLegacyPage ? (
  <RichTextEditor content={page.content} onChange={handleChange} />
) : (
  <WikiEditorShell 
    initialContent={page.contentJson} 
    onSave={handleSave} 
  />
)}
```

**Conversion Function:**

**File:** `src/lib/wiki/html-to-prosemirror.ts` (NEW)

```typescript
import { JSONContent } from '@tiptap/core'
import TurndownService from 'turndown'
import { generateJSON } from '@tiptap/html'

export async function convertHTMLToProseMirror(html: string): Promise<JSONContent> {
  // Use TipTap's built-in HTML parser
  const json = generateJSON(html, [
    StarterKit,
    Underline,
    Link,
    TaskList,
    TaskItem,
    Table,
    // ... all extensions
  ])
  
  return json
}

export async function upgradePageToJSON(pageId: string): Promise<void> {
  // Fetch page
  const page = await prisma.wikiPage.findUnique({ where: { id: pageId } })
  if (!page || page.contentFormat === 'JSON') {
    return
  }

  // Convert HTML to JSON
  const contentJson = await convertHTMLToProseMirror(page.content)
  const textContent = extractTextFromProseMirror(contentJson)

  // Update page
  await prisma.wikiPage.update({
    where: { id: pageId },
    data: {
      contentJson,
      contentFormat: 'JSON',
      textContent,
      // Keep content field for backward compatibility
    }
  })

  // Convert versions (optional - can be done lazily)
  // This is expensive, so consider doing it on-demand when viewing versions
}
```

**API Endpoint:**

**File:** `src/app/api/wiki/pages/[id]/upgrade/route.ts` (NEW)

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUnifiedAuth(request)
  const resolvedParams = await params
  
  // Verify page exists and user has access
  const page = await prisma.wikiPage.findUnique({
    where: { id: resolvedParams.id }
  })

  if (page.contentFormat === 'JSON') {
    return NextResponse.json({ message: 'Page already upgraded' })
  }

  // Convert
  await upgradePageToJSON(resolvedParams.id)

  return NextResponse.json({ success: true })
}
```

**Rollback:** Revert page to HTML format (keep JSON as backup)

**Validation:**
- Legacy pages render correctly
- Upgrade button works
- Converted pages work in new editor
- Version history preserved

---

### Stage 3: JSON as Default (Week 5)

**Goal:** All new pages use JSON; legacy pages remain HTML until upgraded

**Changes:**
1. Remove feature flag
2. Update all "new page" flows to use TipTap
3. Keep legacy editor only for HTML pages

**Rollback:** Revert to Stage 2 (keep upgrade button)

**Validation:**
- 100% of new pages are JSON
- Legacy pages still accessible
- No data loss

---

### Stage 4: Optional Cleanup (Future)

**Goal:** Remove HTML fields (only if 100% of pages converted)

**Changes:**
1. Batch job to convert all remaining HTML pages
2. Remove `content` field (or make it nullable/computed)
3. Archive HTML in `WikiVersion` only

**Rollback:** Keep HTML fields but mark as deprecated

---

### Handling Edge Cases

#### WikiVersion History

**Strategy:** Store format at version time, convert on-demand

```typescript
// When creating version
await prisma.wikiVersion.create({
  data: {
    pageId,
    content: format === 'JSON' ? JSON.stringify(contentJson) : content,
    contentJson: format === 'JSON' ? contentJson : null,
    contentFormat: format,
    version: nextVersion,
  }
})

// When viewing version
const version = await prisma.wikiVersion.findUnique({ where: { id } })
if (version.contentFormat === 'HTML') {
  // Convert on-demand for display
  const json = await convertHTMLToProseMirror(version.content)
  return <WikiRenderer content={json} />
} else {
  return <WikiRenderer content={version.contentJson} />
}
```

#### Embeds Conversion

**Strategy:** Extract embed data from HTML placeholders, create WikiEmbed records, reference in JSON

```typescript
export async function convertEmbedsInHTML(html: string, pageId: string): Promise<JSONContent> {
  // Extract embed placeholders
  const embedRegex = /<div[^>]*data-embed-id="([^"]*)"[^>]*>/g
  const matches = [...html.matchAll(embedRegex)]
  
  // Fetch or create WikiEmbed records
  const embeds = await Promise.all(
    matches.map(async (match) => {
      const embedId = match[1]
      let embed = await prisma.wikiEmbed.findUnique({ where: { id: embedId } })
      
      if (!embed) {
        // Extract data from HTML placeholder
        const embedData = extractEmbedDataFromHTML(match[0])
        embed = await prisma.wikiEmbed.create({
          data: {
            id: embedId,
            pageId,
            ...embedData
          }
        })
      }
      
      return embed
    })
  )
  
  // Replace HTML placeholders with embed nodes in ProseMirror JSON
  // This happens during HTML → JSON conversion
}
```

#### Tables and Weird HTML

**Strategy:** Use TipTap's HTML parser (handles most cases), fallback to plain text for edge cases

```typescript
export async function convertHTMLToProseMirror(html: string): Promise<JSONContent> {
  try {
    return generateJSON(html, extensions)
  } catch (error) {
    console.warn('HTML conversion failed, using fallback:', error)
    // Fallback: convert to plain text paragraphs
    const text = extractTextFromHTML(html)
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }]
        }
      ]
    }
  }
}
```

#### Paste Sanitization

**Strategy:** TipTap handles this automatically, but add custom sanitization for edge cases

```typescript
// In TipTapEditor component
editorProps: {
  handlePaste: (view, event) => {
    const html = event.clipboardData?.getData('text/html')
    if (html) {
      // Sanitize HTML before paste
      const sanitized = sanitizeHTML(html)
      // TipTap will convert to ProseMirror
      return false
    }
    return false
  },
}
```

---

## PART 5: Features Roadmap (2-3 Phases)

### Phase 1: Editor Foundation (Weeks 1-6)

**Goal:** MVP editor parity with current features + autosave + slash commands

**Features:**
- ✅ TipTap editor with all current formatting (bold, italic, headings, lists, tables, code)
- ✅ Task lists (checkboxes) - NEW
- ✅ Slash command menu (full implementation) - NEW
- ✅ Embed nodes (structured, not HTML placeholders) - NEW
- ✅ Autosave with status indicator - NEW
- ✅ Paste from Google Docs/Word (preserves formatting) - NEW
- ✅ Undo/redo (TipTap history)
- ✅ Read-only renderer for viewing

**Deliverables:**
- `WikiEditorShell` component
- `WikiRenderer` component
- Slash command extension
- Embed node extension
- HTML → JSON conversion utility
- Autosave system

**Success Criteria:**
- All existing formatting works
- New features (tasks, slash commands) work
- Autosave prevents data loss
- Paste preserves formatting

---

### Phase 2: Workflow Features (Weeks 7-10)

**Goal:** Templates, subdocs UX, navigation improvements

**Features:**
- ✅ Page templates (create from template)
- ✅ Template library (save pages as templates)
- ✅ Subdocs UX (parentId hierarchy with breadcrumbs)
- ✅ Table of contents (auto-generated from headings)
- ✅ Page outline/sidebar
- ✅ Improved search (using textContent field)

**Database Changes:**
```prisma
model WikiPageTemplate {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  description String?
  contentJson Json     // Template content in ProseMirror format
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   User     @relation(fields: [createdById], references: [id])
  
  @@index([workspaceId])
  @@map("wiki_page_templates")
}
```

**Deliverables:**
- Template selector in "New Page" flow
- Template save/load API
- Breadcrumb component
- TOC generator
- Enhanced search endpoint

---

### Phase 3: Interoperability (Weeks 11-14)

**Goal:** Import/export, improved search

**Features:**
- ✅ Markdown import/export
- ✅ DOCX import (Word documents)
- ✅ PDF export
- ✅ Notion import (if API available)
- ✅ Improved search indexing (full-text search on textContent)

**Deliverables:**
- Markdown parser (markdown → ProseMirror)
- Markdown serializer (ProseMirror → markdown)
- DOCX parser (mammoth.js or similar)
- PDF generator (puppeteer or similar)
- Search indexer (PostgreSQL full-text or external)

---

## PART 6: Acceptance Criteria

### Functional Requirements

1. **Copy/Paste from Google Docs**
   - ✅ Bold, italic, headings preserved
   - ✅ Lists (ordered/unordered) preserved
   - ✅ Tables preserved
   - ✅ Links preserved

2. **Slash Commands**
   - ✅ `/heading` inserts heading block
   - ✅ `/code` inserts code block
   - ✅ `/table` inserts table
   - ✅ `/embed` opens embed selector
   - ✅ `/task` inserts task list
   - ✅ Menu appears on `/` keystroke
   - ✅ Arrow keys navigate menu
   - ✅ Enter selects command

3. **Autosave**
   - ✅ Saves 2 seconds after last keystroke
   - ✅ Shows "Saving..." indicator
   - ✅ Shows "Saved" with timestamp
   - ✅ Shows "Error" on failure with retry
   - ✅ Manual save (Cmd/Ctrl+S) works

4. **Legacy Pages**
   - ✅ HTML pages render correctly
   - ✅ "Upgrade" button visible
   - ✅ Upgrade converts to JSON
   - ✅ Converted pages work in new editor
   - ✅ No data loss during conversion

5. **Version History**
   - ✅ Versions created on save
   - ✅ HTML versions can be viewed
   - ✅ JSON versions can be viewed
   - ✅ Version comparison works (future)

6. **Embed Blocks**
   - ✅ Embeds render correctly (not HTML hacks)
   - ✅ Embeds persist in JSON format
   - ✅ Embed data stored in WikiEmbed table
   - ✅ Embed nodes reference embedId

### Performance Requirements

1. **Editor Load Time**
   - ✅ Initial load < 500ms
   - ✅ Content render < 200ms

2. **Autosave Performance**
   - ✅ Save request < 300ms (p95)
   - ✅ No UI blocking during save

3. **Conversion Performance**
   - ✅ HTML → JSON conversion < 1s for typical page
   - ✅ Batch conversion < 10s per 100 pages

### Data Integrity

1. **No Data Loss**
   - ✅ All existing pages remain accessible
   - ✅ All versions preserved
   - ✅ Conversion is reversible (HTML kept)

2. **Format Consistency**
   - ✅ JSON format validated
   - ✅ Invalid JSON rejected

---

## PART 7: Test Plan

### Unit Tests

**File:** `src/lib/wiki/__tests__/content-validator.test.ts` (NEW)

```typescript
import { validateProseMirrorJSON, extractTextFromProseMirror } from '../content-validator'

describe('Content Validator', () => {
  it('validates valid ProseMirror JSON', () => {
    const valid = { type: 'doc', content: [] }
    expect(validateProseMirrorJSON(valid)).toBe(true)
  })

  it('rejects invalid ProseMirror JSON', () => {
    expect(validateProseMirrorJSON(null)).toBe(false)
    expect(validateProseMirrorJSON({ type: 'paragraph' })).toBe(false)
  })

  it('extracts text from ProseMirror JSON', () => {
    const json = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
      ]
    }
    expect(extractTextFromProseMirror(json)).toBe('Hello')
  })
})
```

**File:** `src/lib/wiki/__tests__/html-to-prosemirror.test.ts` (NEW)

```typescript
import { convertHTMLToProseMirror } from '../html-to-prosemirror'

describe('HTML to ProseMirror Conversion', () => {
  it('converts simple paragraph', async () => {
    const html = '<p>Hello world</p>'
    const json = await convertHTMLToProseMirror(html)
    expect(json.type).toBe('doc')
    expect(json.content[0].type).toBe('paragraph')
  })

  it('converts headings', async () => {
    const html = '<h1>Title</h1>'
    const json = await convertHTMLToProseMirror(html)
    expect(json.content[0].type).toBe('heading')
    expect(json.content[0].attrs.level).toBe(1)
  })

  it('converts tables', async () => {
    const html = '<table><tr><td>Cell</td></tr></table>'
    const json = await convertHTMLToProseMirror(html)
    expect(json.content[0].type).toBe('table')
  })
})
```

### Integration Tests

**File:** `src/app/api/wiki/pages/__tests__/route.test.ts` (NEW)

```typescript
import { POST } from '../route'
import { prisma } from '@/lib/db'

describe('POST /api/wiki/pages', () => {
  it('creates page with JSON format', async () => {
    const request = new Request('http://localhost/api/wiki/pages', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Page',
        contentJson: { type: 'doc', content: [] },
        contentFormat: 'JSON'
      })
    })

    const response = await POST(request)
    const page = await response.json()

    expect(page.contentFormat).toBe('JSON')
    expect(page.contentJson).toBeDefined()
  })

  it('creates page with HTML format (legacy)', async () => {
    const request = new Request('http://localhost/api/wiki/pages', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Legacy Page',
        content: '<p>Hello</p>',
        contentFormat: 'HTML'
      })
    })

    const response = await POST(request)
    const page = await response.json()

    expect(page.contentFormat).toBe('HTML')
    expect(page.content).toBe('<p>Hello</p>')
  })
})
```

**File:** `src/app/api/wiki/pages/[id]/__tests__/upgrade.test.ts` (NEW)

```typescript
import { POST } from '../upgrade/route'

describe('POST /api/wiki/pages/[id]/upgrade', () => {
  it('converts HTML page to JSON', async () => {
    // Create HTML page
    const page = await prisma.wikiPage.create({
      data: {
        title: 'Test',
        content: '<p>Hello</p>',
        contentFormat: 'HTML',
        // ... other fields
      }
    })

    const request = new Request(`http://localhost/api/wiki/pages/${page.id}/upgrade`, {
      method: 'POST'
    })

    const response = await POST(request, { params: Promise.resolve({ id: page.id }) })
    expect(response.status).toBe(200)

    // Verify conversion
    const updated = await prisma.wikiPage.findUnique({ where: { id: page.id } })
    expect(updated.contentFormat).toBe('JSON')
    expect(updated.contentJson).toBeDefined()
  })
})
```

### E2E Tests (Playwright)

**File:** `e2e/wiki-editor.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Wiki Editor', () => {
  test('creates new page with TipTap editor', async ({ page }) => {
    await page.goto('/wiki/new')
    
    // Type title
    await page.fill('input[name="title"]', 'Test Page')
    
    // Type in editor
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await editor.type('Hello world')
    
    // Wait for autosave
    await expect(page.locator('text=Saving...')).toBeVisible()
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 })
  })

  test('slash commands work', async ({ page }) => {
    await page.goto('/wiki/new')
    
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await editor.type('/heading')
    
    // Slash menu should appear
    await expect(page.locator('text=Heading 1')).toBeVisible()
    
    // Select heading
    await page.keyboard.press('Enter')
    
    // Should insert heading
    await expect(editor.locator('h1')).toBeVisible()
  })

  test('paste preserves formatting', async ({ page }) => {
    await page.goto('/wiki/new')
    
    // Copy formatted text
    await page.evaluate(() => {
      const text = new ClipboardItem({
        'text/html': new Blob(['<p><strong>Bold</strong> text</p>'], { type: 'text/html' })
      })
      navigator.clipboard.write([text])
    })
    
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await page.keyboard.press('Meta+v')
    
    // Should preserve bold
    await expect(editor.locator('strong:has-text("Bold")')).toBeVisible()
  })

  test('upgrades legacy page', async ({ page }) => {
    // Create HTML page (via API or seed)
    const pageId = await createLegacyPage()
    
    await page.goto(`/wiki/${pageId}`)
    
    // Upgrade button should be visible
    await expect(page.locator('button:has-text("Upgrade to new editor")')).toBeVisible()
    
    // Click upgrade
    await page.click('button:has-text("Upgrade to new editor")')
    
    // Should convert to JSON
    await expect(page.locator('.ProseMirror')).toBeVisible()
    await expect(page.locator('button:has-text("Upgrade")')).not.toBeVisible()
  })

  test('autosave prevents data loss', async ({ page }) => {
    await page.goto('/wiki/new')
    
    const editor = page.locator('.ProseMirror')
    await editor.click()
    await editor.type('Important content')
    
    // Wait for autosave
    await expect(page.locator('text=Saved')).toBeVisible({ timeout: 5000 })
    
    // Refresh page
    await page.reload()
    
    // Content should be preserved
    await expect(editor).toContainText('Important content')
  })
})
```

---

## Risks and Mitigations

### Risk 1: HTML → JSON Conversion Failures

**Risk:** Complex HTML (tables, nested lists, embeds) may not convert perfectly

**Mitigation:**
- Use TipTap's robust HTML parser (handles most cases)
- Fallback to plain text for edge cases
- Keep original HTML in `content` field as backup
- Test conversion on sample of real pages before rollout

**Rollback:** Revert page to HTML format if conversion fails

---

### Risk 2: Version History Data Loss

**Risk:** Converting versions may lose fidelity or be expensive

**Mitigation:**
- Store format at version time (don't convert existing versions)
- Convert on-demand when viewing old versions
- Keep HTML versions as-is (they're historical records)

**Rollback:** Versions remain in original format

---

### Risk 3: Performance Degradation

**Risk:** JSON parsing/rendering slower than HTML

**Mitigation:**
- Benchmark TipTap render performance
- Use React.memo for renderer component
- Lazy load editor (code splitting)
- Cache rendered output for read-only views

**Rollback:** Feature flag to disable JSON editor

---

### Risk 4: Paste from External Sources

**Risk:** Paste may introduce invalid HTML/JSON

**Mitigation:**
- TipTap sanitizes HTML automatically
- Add custom sanitization for edge cases
- Strip dangerous HTML (scripts, iframes)
- Test paste from Google Docs, Word, Notion

**Rollback:** Fallback to plain text paste

---

### Risk 5: Concurrent Edits

**Risk:** Autosave may conflict with manual saves or concurrent edits

**Mitigation:**
- Use optimistic locking (check `updatedAt` before save)
- Show conflict resolution UI if needed
- Queue autosave requests (don't send if manual save pending)

**Rollback:** Disable autosave, require manual save

---

### Risk 6: Migration Rollback Complexity

**Risk:** Rolling back requires data migration

**Mitigation:**
- Keep HTML as source of truth during Stages 0-2
- Only make JSON primary in Stage 3 (after validation)
- Maintain dual-write during transition
- Document rollback procedure for each stage

**Rollback Plan:**
- Stage 0-1: Drop JSON columns (no data loss, just new pages revert)
- Stage 2: Revert pages to HTML (JSON kept as backup)
- Stage 3: Revert to Stage 2 (keep upgrade button)

---

## File Change Summary

### New Files

1. `src/components/wiki/tiptap-editor.tsx` - Main TipTap editor component
2. `src/components/wiki/wiki-editor-shell.tsx` - Editor wrapper with toolbar/autosave
3. `src/components/wiki/wiki-renderer.tsx` - Read-only renderer
4. `src/components/wiki/wiki-editor-toolbar.tsx` - Toolbar component
5. `src/components/wiki/save-status.tsx` - Autosave status indicator
6. `src/components/wiki/tiptap-extensions/slash-command.tsx` - Slash command extension
7. `src/components/wiki/tiptap-extensions/embed.tsx` - Embed node extension
8. `src/lib/wiki/content-validator.ts` - Validation utilities
9. `src/lib/wiki/html-to-prosemirror.ts` - HTML → JSON conversion
10. `src/app/api/wiki/pages/[id]/upgrade/route.ts` - Upgrade endpoint
11. `scripts/backfill-text-content.ts` - Async backfill script

### Modified Files

1. `prisma/schema.prisma` - Add contentJson, contentFormat, textContent fields
2. `src/app/api/wiki/pages/route.ts` - Support both formats in POST
3. `src/app/api/wiki/pages/[id]/route.ts` - Support both formats in GET/PUT
4. `src/app/(dashboard)/wiki/new/page.tsx` - Use WikiEditorShell
5. `src/app/(dashboard)/wiki/[slug]/page.tsx` - Detect format, show upgrade button
6. `src/components/wiki/wiki-page-body.tsx` - Use WikiRenderer for JSON pages

### Deprecated (Keep for Legacy)

1. `src/components/wiki/rich-text-editor.tsx` - Keep for HTML pages
2. `src/components/wiki/enhanced-rich-text-editor.tsx` - Keep for HTML pages

---

## Timeline Estimate

- **Week 1:** Schema migration, API updates (Stage 0)
- **Week 2:** TipTap editor implementation, new pages use JSON (Stage 1)
- **Week 3-4:** Legacy mode, upgrade button, conversion (Stage 2)
- **Week 5:** JSON as default, testing (Stage 3)
- **Week 6:** Bug fixes, polish
- **Weeks 7-10:** Phase 2 features (templates, subdocs)
- **Weeks 11-14:** Phase 3 features (import/export)

**Total:** ~14 weeks for full implementation

---

## Success Metrics

- **Adoption:** 80% of new pages use JSON format within 2 weeks of Stage 1
- **Conversion:** 50% of legacy pages upgraded within 4 weeks of Stage 2
- **Performance:** Editor load time < 500ms (p95)
- **Reliability:** Autosave success rate > 99.5%
- **User Satisfaction:** Zero data loss incidents

---

## Next Steps

1. **Review and approve plan** with team
2. **Create feature branch:** `feature/wiki-tiptap-migration`
3. **Set up staging environment** for testing
4. **Begin Stage 0** (schema migration)
5. **Schedule weekly check-ins** to review progress

---

**End of Implementation Plan**


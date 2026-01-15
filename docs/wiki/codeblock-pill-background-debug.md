# Code Block Pill Background Debug

## Problem
Code blocks show per-line "pill blocks" with backgrounds instead of a single container background.

## Phase 0: Evidence Collection

### Edit Mode Findings
**DOM Structure:**
- TipTap editor element: `<div class="tiptap ProseMirror prose prose-slate ...">`
- Code block structure: `<pre><code class="hljs">...</code></pre>`
- The `prose` class is applied directly to the TipTap editor element (via `editorProps.attributes.class`)
- Our `.editor` wrapper wraps `<EditorContent>`, but TipTap renders content inside its own DOM structure

**CSS Application:**
- Tailwind Typography (`prose`) applies default styles to `pre code` elements
- Our `.editor pre *` selector may not match because:
  - The `prose` class is on the TipTap editor element itself
  - The `.editor` wrapper is a sibling/parent, not necessarily wrapping the rendered `pre` elements correctly
  - TipTap's DOM structure: `.editor` → `EditorContent` → `div.tiptap.prose` → `pre` → `code.hljs` → spans

**Root Cause Hypothesis:**
- Tailwind Typography's `prose` class has styles like `.prose pre code { background: ... }` that apply to code blocks
- Highlight.js adds spans with token classes that may have backgrounds
- Our CSS module `.editor` selector doesn't have enough specificity or isn't matching the right elements

### Read Mode Findings
**DOM Structure:**
- `WikiReadView` wraps content in: `<div class="prose prose-foreground ... ${styles.editor}">`
- Same TipTap structure: `div.tiptap.prose` → `pre` → `code.hljs`
- The `styles.editor` class is applied, but `prose` is also present, creating potential conflicts

**CSS Application:**
- Same issue as edit mode - `prose` styles may override our `.editor` styles
- The double wrapper (`prose` + `styles.editor`) suggests styles might not be scoped correctly

## Conclusion

**Actual Cause:**
1. Tailwind Typography's `prose` class applies default code block styles
2. Our `.editor` CSS module selector may not have sufficient specificity to override `prose` styles
3. The TipTap editor element has `prose` class directly, so our `.editor pre *` selector needs to account for the `prose` class being on a parent/sibling element
4. Highlight.js token spans may have inline styles or classes with backgrounds

**Why Prior Fixes Didn't Work:**
- `.editor pre *` selector assumes `.editor` wraps the `pre` elements, but TipTap's structure means `prose` is on the editor element itself
- CSS module scoping creates a class like `.editor_abc123`, but we need to ensure it has higher specificity than `.prose pre code`
- Need to target `.editor.prose pre code` or use more specific selectors that account for the actual DOM structure

## Fix Applied

**Strategy:**
1. Use CSS Module `:global()` to target the `prose` class that TipTap applies directly to its editor element
2. Override Tailwind Typography defaults with higher specificity using `.editor :global(.prose) pre *`
3. Apply styles both with and without `prose` selector for maximum coverage
4. Ensure `.editor` wrapper properly contains content in both edit and read modes

**Implementation:**
- Updated CSS to use `.editor :global(.prose) pre *` pattern to target prose-styled elements
- Added fallback selectors without `prose` for safety: `.editor pre *`
- Fixed `WikiReadView` wrapper structure to ensure `.editor` wraps the prose container
- All selectors use `!important` to override Tailwind Typography defaults

**Why This Works:**
- `:global(.prose)` allows CSS Module to target the global `prose` class that TipTap applies
- Higher specificity than default Tailwind Typography rules
- Covers both edit mode (TipTap editor) and read mode (WikiReadView) structures
- Targets all nested elements (`pre *`, `code *`, `.hljs *`) to remove any backgrounds

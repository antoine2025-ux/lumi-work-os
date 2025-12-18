# Phase 1: "Obvious Editing" Implementation

## Overview

Phase 1 implements Notion/Slite-style editing UX for the TipTap JSON editor, making it instantly familiar without requiring users to learn slash commands. The editor now feels intuitive and discoverable.

## User-Visible Behaviors

### PART A: Block Hover Gutter

**What it does:**
- When hovering over any block (paragraph, heading, list, task, code, table, quote), a left gutter appears with two buttons:
  - **"+" button**: Inserts a new block below (opens slash menu)
  - **"⋮⋮" button**: Opens block actions dropdown

**Block Actions Menu:**
- **Turn into**: Convert block to paragraph, heading 1/2/3, quote, bulleted list, numbered list, task list, or code block
- **Duplicate**: Creates a copy of the block below
- **Delete**: Removes the block and moves cursor appropriately

**Supported Block Types:**
- Paragraph
- Heading 1, 2, 3
- Bulleted list
- Numbered list
- Task list
- Code block
- Quote
- Table (entire table treated as one block)

### PART B: Expanded Inline Selection Menu

**What it does:**
- When text is selected, a floating formatting toolbar appears above the selection
- Includes formatting buttons: Bold, Italic, Underline, Strikethrough, Code
- Link button with dropdown: Add link, Edit link (when inside link), Remove link
- "Turn into" submenu: Convert selection to paragraph, heading 1/2/3, or quote

**Behavior:**
- Only appears when there's actual text selection (not collapsed cursor)
- Does not appear for tables (table toolbar handles that)
- Closes on Escape key

### PART C: Keyboard Shortcuts

**Standard shortcuts:**
- `Cmd/Ctrl+B` = Bold
- `Cmd/Ctrl+I` = Italic
- `Cmd/Ctrl+K` = Add/edit link (opens prompt)
- `Escape` = Closes all open menus (slash menu, selection menu)

**Enter/Backspace behavior:**
- Enter in heading creates paragraph below
- Backspace on empty heading becomes paragraph
- Enter in list creates new list item
- Backspace on empty list item exits list
- Task list Enter creates new task item; backspace on empty removes task

## Implementation Details

### File Structure

```
src/components/wiki/tiptap/
├── ui/
│   └── block-targeting.ts          # Block detection utilities
├── blocks/
│   └── block-gutter.tsx             # Gutter UI component
├── commands/
│   └── block-commands.ts            # Block transformation commands
├── hooks/
│   └── use-keyboard-shortcuts.ts   # Keyboard shortcut handler
├── bubble-menu.tsx                  # Expanded selection menu
└── tiptap-editor.tsx                # Main editor (integrated)
```

### Key Components

1. **Block Targeting** (`block-targeting.ts`)
   - `getActiveBlock()`: Detects which block cursor is in
   - `getBlockDOMElement()`: Gets DOM element for positioning
   - Handles all block types including nested structures (lists, tables)

2. **Block Gutter** (`block-gutter.tsx`)
   - Appears on hover and when cursor is in block
   - Uses React portals for positioning
   - Integrates with slash command menu

3. **Block Commands** (`block-commands.ts`)
   - `turnIntoBlock()`: Transforms block type using TipTap commands
   - `duplicateBlock()`: Clones block using ProseMirror slice
   - `deleteBlock()`: Removes block with cursor management

4. **Bubble Menu** (`bubble-menu.tsx`)
   - Expanded with underline, strikethrough
   - Link editing dropdown
   - "Turn into" submenu for inline conversion

5. **Keyboard Shortcuts** (`use-keyboard-shortcuts.ts`)
   - Handles Cmd/Ctrl+B/I/K
   - Escape key handling
   - Integrated with editor focus

## Manual Test Checklist

### Block Gutter Tests

1. ✅ **New JSON page**: Type a paragraph, hover → gutter appears
2. ✅ **Click "+"**: Slash menu opens → insert Heading 2 → heading inserted below
3. ✅ **Click "⋮" → Turn into → Quote**: Current block becomes quote
4. ✅ **Click "⋮" → Duplicate**: Duplicated block appears below
5. ✅ **Click "⋮" → Delete**: Block removed, cursor sane

### Selection Menu Tests

6. ✅ **Select text**: Formatting menu appears:
   - Underline/strike work
   - Link add/edit/remove works
   - Turn into from selection works

### Keyboard Tests

7. ✅ **Keyboard shortcuts**:
   - Cmd/Ctrl+B/I/K work
   - Escape closes menus

### Special Block Tests

8. ✅ **Code block**:
   - Gutter appears on hover
   - Actions work without breaking code block formatting

9. ✅ **Table**:
   - Gutter appears when cursor in table
   - Delete removes whole table block safely

### Persistence Tests

10. ✅ **Refresh page** after autosave and after manual save: content persists

## Known Limitations (Deferred to Phase 2)

1. **Drag-and-drop**: Block reordering via drag-and-drop is not implemented (Phase 2)
2. **Nested lists**: Tab/Shift+Tab indentation for nested lists not implemented (intentionally deferred)
3. **Block IDs**: No persistent block IDs for advanced features (not needed for Phase 1)
4. **Multi-select**: Cannot select multiple blocks at once (Phase 2)

## Edge Cases Handled

1. **Empty document**: Deleting last block creates new paragraph
2. **Table deletion**: Entire table treated as single block
3. **List conversion**: Converting list to paragraph properly exits list structure
4. **Code block conversion**: Text extracted when converting code block to paragraph
5. **Cursor placement**: Cursor stays in correct position after all transformations
6. **Menu positioning**: Gutter and menus position correctly during scroll

## Technical Notes

- **No DOM hacking**: Uses TipTap/ProseMirror APIs exclusively
- **Stable positioning**: Gutter uses fixed positioning with scroll compensation
- **Performance**: Event listeners cleaned up properly, no memory leaks
- **Accessibility**: Keyboard navigation works, Escape closes menus
- **HTML legacy**: Completely untouched - only affects JSON pages

## Files Changed

### New Files
- `src/components/wiki/tiptap/ui/block-targeting.ts`
- `src/components/wiki/tiptap/blocks/block-gutter.tsx`
- `src/components/wiki/tiptap/commands/block-commands.ts`
- `src/components/wiki/tiptap/hooks/use-keyboard-shortcuts.ts`
- `docs/wiki/PHASE_1_OBVIOUS_EDITING.md`

### Modified Files
- `src/components/wiki/tiptap-editor.tsx` (integrated gutter, keyboard shortcuts)
- `src/components/wiki/tiptap/bubble-menu.tsx` (expanded with underline, strikethrough, link UX, turn into)

## Verification Steps

1. Create a new JSON wiki page
2. Type some content and hover over blocks - gutter should appear
3. Click "+" button - slash menu should open
4. Select text - formatting menu should appear
5. Test keyboard shortcuts (Cmd+B, Cmd+I, Cmd+K)
6. Test block actions (Turn into, Duplicate, Delete)
7. Test with code blocks and tables
8. Save and refresh - content should persist

## Success Criteria

✅ Editor feels obviously usable without learning slash commands
✅ Block gutter and selection menu are stable and consistent
✅ All manual checklist items pass
✅ HTML legacy is untouched
✅ No regressions in task lists, tables, code blocks, embeds
✅ Autosave and manual save work correctly

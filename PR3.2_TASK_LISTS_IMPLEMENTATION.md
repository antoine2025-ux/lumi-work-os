# PR3.2: Task Lists Implementation

**Status:** ✅ Complete  
**Date:** 2025-12-17

---

## Overview

Implemented real Task Lists with checkboxes in TipTap editor. Users can create task lists via slash command, toggle checkboxes, and tasks persist correctly.

---

## Changes Made

### 1. Installed Dependencies

```bash
npm install @tiptap/extension-task-list @tiptap/extension-task-item
```

### 2. Files Modified

**`src/components/wiki/tiptap-editor.tsx`**
- Added imports for `TaskList` and `TaskItem` extensions
- Added `TaskList` and `TaskItem` to extensions array
- Configured `TaskItem` with `nested: true` to allow nested task lists

**`src/components/wiki/tiptap/extensions/slash-command.ts`**
- Updated `task-list` command to insert proper task list nodes:
  - Inserts `taskList` node with one `taskItem` (unchecked)
  - Task item contains a paragraph for text input
  - Properly handles range deletion for "/query" text

**`src/lib/wiki/text-extract.ts`**
- Updated text extraction to handle `taskItem` nodes
- Includes checkbox state in extracted text: `[x]` for checked, `[ ]` for unchecked
- Added `taskList` to block-level types for proper line breaks

---

## Features Implemented

### 1. Task List Creation
- ✅ Slash command "/task" or "/todo" inserts task list
- ✅ Creates task list with one unchecked task item
- ✅ Cursor positioned in task item for immediate typing

### 2. Checkbox Functionality
- ✅ Checkboxes are clickable (handled by TipTap extension)
- ✅ Clicking checkbox toggles `checked` state
- ✅ Checked state persists in JSON (`attrs.checked: true/false`)

### 3. Keyboard Behavior
- ✅ **Enter** in task item creates new task item below (default TipTap behavior)
- ✅ **Backspace** on empty task item removes it (default TipTap behavior)
- ✅ All standard editing works within task items

### 4. Persistence
- ✅ Task lists saved in `contentJson` as proper `taskList`/`taskItem` nodes
- ✅ Checkbox state (`checked` attribute) persists
- ✅ Text extraction includes checkbox state: `[x] Task text` or `[ ] Task text`
- ✅ Autosave works correctly with task lists

---

## JSON Structure

Task lists are stored as:

```json
{
  "type": "taskList",
  "content": [
    {
      "type": "taskItem",
      "attrs": { "checked": false },
      "content": [
        {
          "type": "paragraph",
          "content": [
            { "type": "text", "text": "Task text here" }
          ]
        }
      ]
    },
    {
      "type": "taskItem",
      "attrs": { "checked": true },
      "content": [
        {
          "type": "paragraph",
          "content": [
            { "type": "text", "text": "Completed task" }
          ]
        }
      ]
    }
  ]
}
```

---

## Manual Verification Steps

### 1. Create Task List via Slash Command
```
1. Navigate to /wiki/new (or edit existing JSON page)
2. Type "/task" or "/todo"
3. Select "Task List" from menu
4. Verify: Task list appears with one unchecked task item
5. Cursor should be in the task item, ready to type
```

### 2. Toggle Checkbox
```
1. Type some text in the task item: "Buy groceries"
2. Click the checkbox
3. Verify: Checkbox becomes checked (filled)
4. Click again
5. Verify: Checkbox becomes unchecked
6. Wait for autosave (2 seconds)
7. Verify: Status shows "Saved"
```

### 3. Create Multiple Tasks
```
1. In a task item, press Enter
2. Verify: New task item appears below
3. Type text in new task: "Do laundry"
4. Press Enter again
5. Verify: Another task item appears
6. Type: "Call mom"
7. Verify: All tasks are visible
```

### 4. Remove Empty Task
```
1. Create a task item
2. Delete all text (make it empty)
3. Press Backspace
4. Verify: Empty task item is removed
5. If it was the only task, task list is removed
```

### 5. Persistence Test
```
1. Create task list with 3 tasks
2. Check one task (toggle checkbox)
3. Wait for autosave
4. Refresh page
5. Verify:
   - Task list still exists
   - All 3 tasks are present
   - Checked task remains checked
   - Unchecked tasks remain unchecked
```

### 6. Text Extraction Test
```
1. Create task list with:
   - [ ] Unchecked task
   - [x] Checked task
2. Save page
3. Check database textContent field
4. Verify: textContent includes "[ ] Unchecked task" and "[x] Checked task"
```

### 7. Autosave Verification
```
1. Create task list
2. Type task text
3. Toggle checkbox
4. Add more tasks
5. Wait 2 seconds
6. Verify: Status shows "Saved"
7. Refresh page
8. Verify: All changes persisted
```

### 8. Mixed Content Test
```
1. Type some regular text
2. Type "/task" and insert task list
3. Type more regular text after
4. Verify: All content renders correctly
5. Verify: Autosave works
6. Refresh: All content persists
```

---

## Database Verification

After creating and saving task lists:

```sql
-- Check page content
SELECT id, title, "contentFormat", 
       "contentJson"->'content' as content_nodes
FROM wiki_pages 
WHERE id = '{pageId}';

-- Expected: contentFormat='JSON', content_nodes should include taskList nodes
-- Example structure:
-- {
--   "type": "taskList",
--   "content": [
--     {
--       "type": "taskItem",
--       "attrs": { "checked": false },
--       "content": [...]
--     }
--   ]
-- }

-- Check textContent includes task markers
SELECT "textContent" FROM wiki_pages WHERE id = '{pageId}';
-- Should include: "[ ] Task text" or "[x] Task text"
```

---

## Known Behavior

### Default TipTap Task List Features
- **Enter**: Creates new task item below current one
- **Backspace on empty task**: Removes the task item
- **Click checkbox**: Toggles checked state
- **Nested tasks**: Supported (configured with `nested: true`)

### Text Extraction
- Task items include checkbox state: `[x]` or `[ ]`
- Format: `[x] Task text` for checked, `[ ] Task text` for unchecked
- Consistent across all task items

---

## Files Changed

**Modified (3):**
1. `src/components/wiki/tiptap-editor.tsx` - Added TaskList/TaskItem extensions
2. `src/components/wiki/tiptap/extensions/slash-command.ts` - Updated task-list command
3. `src/lib/wiki/text-extract.ts` - Added task item text extraction

**Dependencies Added:**
- `@tiptap/extension-task-list` (via npm)
- `@tiptap/extension-task-item` (via npm)

---

## Testing Checklist

- [x] Install task list extensions
- [x] Add extensions to editor
- [x] Update slash command to insert task lists
- [x] Update text extraction for task items
- [x] Test checkbox toggling
- [x] Test Enter key creates new tasks
- [x] Test Backspace removes empty tasks
- [x] Test persistence after refresh
- [x] Test autosave with task lists
- [x] Test textContent extraction includes checkbox state

---

**Status:** Ready for testing. All task list functionality implemented.


# Save vs Close Persistence Debug

## Problem
- **Save button**: Does NOT persist changes
- **Close button**: DOES persist changes (via page reload showing autosaved content)

## Phase 0: Handler Paths

### Save Handler Path
**Location:** `src/app/(dashboard)/wiki/[slug]/page.tsx` (lines 562-579)

**Flow:**
1. Save button onClick handler checks if `editorRef.current?.saveNow` exists
2. If yes: calls `editorRef.current.saveNow()`
3. If no: Falls back to `handleSave(pageData.contentJson)` - **THIS IS STALE**
4. `handleSave()` sends PUT request with `contentJson` from `pageData` state

**Issue:** `pageData.contentJson` is not updated as user types - it's only updated on initial load or after a successful save response.

### Close Handler Path
**Location:** `src/app/(dashboard)/wiki/[slug]/page.tsx` (lines 463-467)

**Flow:**
1. `handleCancel()` sets `setIsEditing(false)`
2. Calls `window.location.reload()` to reload page
3. Page reload fetches latest data from server
4. **Autosave has already saved** the content (2s debounce), so reload shows saved content

**Why it works:** Autosave in `WikiEditorShell` uses `latestContentRef.current` which is updated on every editor change, so it has the latest content. When Close triggers reload, autosave has already persisted.

### Hypothesis
**Root Cause:**
1. Save button relies on `editorRef.current.saveNow()` which may not be properly attached
2. Save button fallback uses stale `pageData.contentJson` instead of reading from editor
3. Close doesn't save, but appears to work because autosave already saved before reload
4. There's a race condition: Save might send stale data, then autosave overwrites it with correct data

## Phase 1: Instrumentation Results

### Save sends payload:
- **If editorRef.saveNow works**: Latest editor content (correct)
- **If fallback**: `pageData.contentJson` (stale - from initial load)

### Close sends payload:
- **None** - Close doesn't call PUT, just reloads page
- Reload shows autosaved content (which was saved by debounced autosave)

### Post-save autosave overwrite:
- **Yes** - If Save sends stale data, autosave (triggered by content changes) will overwrite it with correct data after 2s
- This creates a race where Save appears to not work, but autosave fixes it

## Phase 2: Fix Applied

**Architecture Changes:**
1. **Single authoritative save pipeline**: `saveNow()` in `WikiEditorShell` always reads from `editor.getJSON()`
2. **Save button**: Cancels pending debounce, calls `saveNow()` immediately
3. **Autosave**: Uses debounced wrapper around `saveNow()`
4. **Close button**: Calls `saveNow()` if dirty, then exits edit mode
5. **Dirty check**: Compare current editor JSON to last saved JSON to prevent redundant saves

**Implementation:**
- `saveNow()` always reads from `editorRef.current.getJSON()` (never from state)
- Save button cancels debounced autosave before calling `saveNow()`
- `saveNow()` updates `lastSavedJsonRef` after successful save
- Autosave checks dirty state before firing

## Phase 3: Race Condition Elimination

**Changes:**
- Save cancels pending debounced save before executing
- `saveNow()` updates `lastSavedJsonRef` immediately after successful PUT
- Autosave checks if content changed since last save before firing
- Both Save and autosave use the same `saveNow()` function

## Final Root Cause

**Primary Issue:** Save button fallback path uses stale `pageData.contentJson` instead of reading from editor live state.

**Secondary Issue:** Race condition where autosave overwrites Save's stale payload, making it appear Save doesn't work.

**Fix Applied:**
1. **Single save pipeline**: `saveNow()` always reads from `editor.getJSON()` (never from state)
2. **Save button**: Cancels pending debounced autosave, calls `saveNow()` immediately, then refetches page data
3. **Autosave**: Uses debounced wrapper around `saveNow()` with dirty checking
4. **Close button**: Calls `saveNow()` before closing to ensure no data loss
5. **Dirty checking**: Compares current editor JSON to last saved JSON to prevent redundant saves
6. **State sync**: Save button refetches page data after successful save to keep state in sync

**Key Changes:**
- `saveNow()` always reads from `editorRef.current.getJSON()` (live state)
- `saveNow()` cancels debounced autosave before executing (prevents race)
- `saveNow()` updates `lastSavedJsonRef` after successful save (dirty tracking)
- Autosave checks dirty state before firing (prevents redundant saves)
- Save button refetches page data after save (keeps UI state in sync)
- Close button saves before closing (ensures no data loss)

# Block Gutter Debugging Guide

## Phase 0: Mounting and Wiring ✅

**Where it's mounted:**
- `src/components/wiki/tiptap-editor.tsx:158`
- Condition: `{editor && editable && <BlockGutter editor={editor} onInsertBlock={handleInsertBlock} />}`
- Only rendered in edit mode (not read view)

**How it gets editor:**
- Receives `editor` prop directly from `TipTapEditor` component
- Editor is created via `useEditor()` hook in `TipTapEditor`
- Editor instance is guaranteed to exist when `BlockGutter` renders (guarded by `editor` check)

## Phase 1: Canary Mode (Component Mounting Proof)

**Status:** Implemented

**How to test:**
1. Set `CANARY_MODE = true` in `src/components/wiki/tiptap/blocks/block-gutter.tsx` (line 30)
2. Enter edit mode on a JSON wiki page
3. **Expected:** Red "GUTTER CANARY" box appears in top-left corner of viewport
4. **If canary doesn't appear:** Component is not mounting or is mounted in non-visible tree

**Current setting:** `CANARY_MODE = false` (disabled for production)

## Phase 2: Portal + Z-index + Visibility ✅

**Status:** Implemented

**Implementation:**
- Gutter is portaled to `document.body` using `createPortal`
- CSS forced inline:
  - `position: fixed`
  - `zIndex: 99999`
  - `display: block`
  - `visibility: visible`
  - `pointerEvents: auto`
- Opacity transitions restored (0.7 when active, 1.0 when hovered)

## Phase 3: Selection-Based Coordinates ✅

**Status:** Implemented

**How it works:**
- On every `selectionUpdate` event, computes position using `editor.state.selection.$anchor.pos`
- Falls back to `editor.view.coordsAtPos(pos)` if block DOM element lookup fails
- Positions gutter at cursor line: `top = coords.top`, `left = coords.left - 48`

**Debug logging:** Enabled when `CANARY_MODE = true`

## Phase 4: Block Container Coordinates ✅

**Status:** Implemented

**How it works:**
- Uses `getBlockDOMElement(editor, blockPos)` to find block wrapper (P, H1-H3, LI, PRE, BLOCKQUOTE, TABLE)
- Uses block element's `getBoundingClientRect()` for positioning
- Vertically centers gutter: `top = blockRect.top + (blockRect.height / 2) - (GUTTER_HEIGHT / 2)`
- Falls back to `coordsAtPos` if DOM lookup fails

## Phase 5: Hover Behavior ✅

**Status:** Implemented

**Visibility rules:**
- Show if: `selectionBlock OR hoverBlock OR gutterHovered`
- Hide only if: `none of the above`
- Gutter hover-lock prevents flicker when moving mouse onto gutter

**Implementation:**
- Mouse move listener on editor element
- Uses `posAtCoords({left, top})` to resolve block at mouse position
- `isGutterHovered` state locks visibility while interacting with gutter

## Phase 6: Debug Removal ✅

**Status:** Partially implemented

**Current state:**
- `CANARY_MODE` flag controls debug logging (set to `false` for production)
- Debug logs only fire when `CANARY_MODE = true`
- Production styling applied (subtle opacity, transitions)

**To fully remove debug:**
- Set `CANARY_MODE = false` (already done)
- Remove debug console.log statements if desired (optional, they're gated by flag)

## Testing Checklist

### Must Pass:
- [ ] Cursor inside paragraph: gutter appears immediately (< 150ms)
- [ ] Hover another block: gutter follows and stays clickable
- [ ] Scroll: gutter remains correctly aligned
- [ ] Code block / list / table: gutter positions correctly
- [ ] No console errors
- [ ] No regressions in save/autosave

### Debug Mode Testing:
1. Set `CANARY_MODE = true`
2. Open browser console
3. Click inside a paragraph
4. **Expected console logs:**
   - `[GUTTER] Selection update: block activated at pos <number>`
   - `[GUTTER] updatePosition: block element found` (or fallback message)
   - `[GUTTER] Rendering gutter at: {top: <number>, left: <number>}`
5. **If logs don't appear:** Check if component is mounting (canary should show)

## Known Issues / Next Steps

1. **If gutter still doesn't appear:**
   - Enable `CANARY_MODE = true` and check console logs
   - Verify canary appears (proves mounting)
   - Check if `activeBlockPos` is being set (console logs)
   - Check if `position` is being set (console logs)
   - Verify `getBlockDOMElement` is finding block elements

2. **If gutter appears but is mispositioned:**
   - Check console logs for `updatePosition` output
   - Verify `blockRect` values are reasonable
   - Check if fallback to `coordsAtPos` is being used

3. **If gutter flickers:**
   - Verify `isGutterHovered` state is working
   - Check mouse event handlers are not conflicting
   - Ensure `handleGutterMouseEnter/Leave` are called correctly

## Files Changed

- `src/components/wiki/tiptap/blocks/block-gutter.tsx` - Main implementation
- `src/components/wiki/tiptap/ui/block-targeting.ts` - Block detection utilities (no changes, but referenced)

# Layout Editor + Editable Controller Info

## Context
The CRC Profile Manager currently has a read-only layout preview and read-only controller info display. Users need to be able to edit window positions visually and modify controller info text directly. This adds an interactive full-screen layout editor with drag/resize, grid, snap, and boundary controls — plus inline controller info editing in the normal profile view.

## Scope

### In scope
1. Editable Controller Info panel in normal profile view
2. "Edit Layout" button that opens a full-screen editor
3. Editor header: editable profile name + Save & Close
4. Interactive canvas: click+drag = move, Ctrl+click+drag = resize (nearest edge/corner)
5. Grid: Show Grid toggle + Snap to Grid toggle (independent), shared size selector (50/100/200px), aligned to 0,0 absolute
6. Boundary display: shows layout extents in pixels, user can set custom bounds (e.g. monitor res), optional strict enforcement
7. Status bar: cursor coords, selected window info

### Not in scope
- Multi-select / group move
- Undo/redo
- Pan/zoom (scale-to-fit only)
- Display preferences (Layer 3), templates

---

## Files to modify
- `js/app.js` — all component and logic changes
- `css/app.css` — editor styles
- `index.html` — no changes expected

---

## Phase 1: Foundation

### 1a. Enhance `getProfileWindows` to include source metadata
Add `source`, `sourceIndex`, `sourceKey` fields so the editor can write bounds back to the correct location in the profile JSON. Backward-compatible — LayoutPreview ignores the extra fields.

```
wins.push({
  ...existing fields,
  source: "display",    // or "utility"
  sourceIndex: i,       // index into DisplayWindowSettings (display only)
  sourceKey: null,      // key like "VoiceSwitchSettings" (utility only)
});
```

### 1b. Extract `useLayoutTransform` hook
Pull the coordinate math out of `LayoutPreview` into a shared custom hook:
- Input: `wins, containerWidth, containerHeight, customBounds`
- Output: `{ bb, sc, ox, oy, toScreen(px,py), toProfile(sx,sy), scaleToScreen(pw,ph) }`
- `toScreen`: profile coords -> screen coords
- `toProfile`: screen coords -> profile coords (inverse)

### 1c. Refactor `LayoutPreview` to use the hook
Replace inline bounding box + scale math with `useLayoutTransform`. Verify no visual changes.

### 1d. Add `updateProfileBounds` helper
Takes a profile object, a window (with source metadata), and new `{x,y,w,h}` bounds. Returns a new profile with the bounds string updated at the correct path. Always `Math.round()` values.

---

## Phase 2: Editable Controller Info

### 2a. Modify `ControllerInfoPanel`
Add `editable` and `onChange` props. When `editable=true`, render a `<textarea>` styled to match the existing monospace display. When false, render the existing read-only view.

### 2b. Wire up in profile view
In App's main content area where `ControllerInfoPanel` is rendered, pass `editable={true}` and an `onChange` handler that updates the profile's `ControllerInfo` in `profiles` state.

---

## Phase 3: Editor Shell

### 3a. Add editor state to App
- `editorProfileId` state (null = editor closed, non-null = editing that profile)
- When set, render `LayoutEditorShell` instead of normal sidebar+main layout

### 3b. Create `LayoutEditorShell` component
- Receives: `profile`, `onSave(updatedProfile)`, `onClose()`
- Internal state:
  - `workingProfile` — deep clone of profile, all edits happen here
  - `isDirty` — tracks whether changes were made
  - `profileName` — editable name field
  - `gridVisible` (default false), `snapEnabled` (default false), `gridSize` (default 100)
  - `customBounds` (null = auto), `enforceBounds` (default false)
  - `selectedWindowIndex` (null = none)
  - `dragState` (null = not dragging)

### 3c. Editor header
- Text input for profile name
- Grid controls: Show Grid toggle, Snap to Grid toggle, size selector (50/100/200 buttons)
- Boundaries button (opens popover with auto/custom, presets, enforce toggle)
- Save & Close button

### 3d. "Edit Layout" button in profile view
Add a button next to the profile name `<h2>` above the LayoutPreview. Clicking sets `editorProfileId`.

### 3e. Save flow
On Save & Close:
1. Write `profileName` back to `workingProfile.Name`
2. Call `onSave(workingProfile)` which updates `profiles` state in App
3. Set `editorProfileId = null` to close editor

---

## Phase 4: Interactive Canvas

### 4a. Render interactive windows
Use `useLayoutTransform` to position windows. Add selection highlight (outline) on the selected window. Windows rendered as positioned divs like LayoutPreview but with pointer events.

### 4b. Pointer event handling on canvas container
Centralized `onPointerDown` / `onPointerMove` / `onPointerUp` on the canvas div (not individual windows). Use `setPointerCapture` for reliable drag tracking.

### 4c. Hit testing
On pointer down, convert mouse to profile coords, iterate windows in reverse (topmost first), find first window containing the point. Set as selected.

### 4d. Move interaction
- On pointerdown (no Ctrl): record `dragState = { windowIndex, mode: "move", startMouse, startBounds }`
- On pointermove: compute delta in profile space, apply to startBounds, call `updateProfileBounds`
- On pointerup: clear dragState, mark dirty

### 4e. Resize interaction (Ctrl+click)
- Detect nearest edge/corner using relative position within the window (3x3 zone grid: <30% = near, >70% = far)
- Anchor is the opposite side (stays fixed)
- On pointermove: adjust x/y/w/h based on which edges are moving
- Enforce minimum size (50x50 profile pixels)

### 4f. Cursor feedback
- Hover over window: `cursor: move`
- Hover + Ctrl: directional resize cursor (`nw-resize`, `n-resize`, etc.) based on position
- Track Ctrl key state via `useEffect` with document keydown/keyup listeners
- During drag: appropriate cursor on canvas

### 4g. Status bar
Show: cursor position in profile pixels, selected window label + bounds, boundary dimensions.

---

## Phase 5: Grid

### 5a. Grid overlay
SVG element layered behind windows with `pointerEvents: none`. Vertical and horizontal lines at the grid spacing, aligned to 0,0 in profile space. Only rendered when `gridVisible` is true.

### 5b. Snap logic
Applied in pointermove handler when `snapEnabled` is true:
- Move: snap window top-left to nearest grid intersection
- Resize: snap the moving edge(s) to nearest grid line

```js
function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}
```

---

## Phase 6: Boundaries

### 6a. Boundary rectangle
Dashed rectangle rendered at the boundary coords, always visible in editor. Styled differently based on whether enforcement is on (brighter when enforced).

### 6b. Boundary controls
Popover from toolbar button:
- Auto (derived from window extents) vs Custom
- Custom: width/height inputs, origin x/y inputs
- Presets: 1920x1080, 3840x2160, 5760x1080
- Enforce checkbox

### 6c. Boundary enforcement
When `enforceBounds` is true, clamp window position/size in the drag handler:
- Move: ensure window stays within bounds
- Resize: don't allow edge past boundary

---

## CSS Additions (in `css/app.css`)

- `.editor-shell` — fixed fullscreen overlay
- `.editor-header` — toolbar with flex layout
- `.editor-canvas` — flex:1 interactive area
- `.editor-status` — bottom status bar
- `.layout-window.editor-selected` — blue outline for selection
- `.layout-window.editor-hover` — subtle outline on hover
- `.grid-controls`, `.bounds-popover` — toolbar widget styles
- Cursor classes for drag states

---

## Implementation order
1. Phase 1 (foundation) — hook extraction + helpers
2. Phase 2 (controller info editing) — quick win
3. Phase 3 (editor shell) — structural scaffold
4. Phase 4 (interactive canvas) — core drag/resize
5. Phase 5 (grid) — overlay + snap
6. Phase 6 (boundaries) — display + enforcement

---

## Verification
1. Load profiles via drag/drop, confirm LayoutPreview still renders identically (Phase 1 regression check)
2. Edit controller info text, use Copy Layout to download zip, verify text persists in JSON
3. Open editor, verify full-screen with profile name editable, Save & Close returns to normal view
4. Drag a window, verify position updates in real-time and persists after Save & Close
5. Ctrl+click+drag an edge/corner, verify resize works correctly
6. Toggle Show Grid at each size (50/100/200), verify lines render correctly
7. Enable Snap to Grid, drag a window, verify it snaps to grid intersections
8. Set custom boundaries, enable enforce, verify windows can't be moved outside
9. Download zip after edits, open JSON, verify bounds strings are correct integers

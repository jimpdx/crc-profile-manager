# Changelog

## v1.3 — 2026-04-12

### Fixed

- GitHub stars badge no longer overlaps Save/Close buttons in the layout editor (z-index fix)
- GitHub stars badge is now hidden entirely while the layout editor is open

### Changed

- Layout editor help modal only shows once per browser session (remembered via sessionStorage)
- "Copy Layout..." now skips the source selection step when a profile is already selected
- Apply Layout modal now offers **Save** (apply without downloading) and **Save & Download (.zip)** as separate options

---

## v1.2 — 2026-04-12

### Added

- **Snap All** — one-click button to align all four edges of every window to the nearest grid lines

---

## v1.1 — 2026-04-12

### Added

- **Visual layout editor** — full-screen editor to rearrange window positions by dragging, with Ctrl+click+drag to resize from the nearest edge or corner
- **Grid overlay** — toggle-able grid lines at 50, 100, or 200px spacing, aligned to absolute pixel coordinates
- **Snap to grid** — independent toggle that locks window movement and resize to grid increments
- **Boundary controls** — display layout boundaries in pixels, set custom bounds (with presets for common monitor resolutions like 1920x1080, 3840x2160, 5760x1080), and optionally enforce strict boundaries
- **Editable Controller Info** — modify the controller info text directly from the profile view (no longer read-only)
- **Editable profile name** — rename profiles from within the layout editor
- **Download All (.zip)** — toolbar button to export all profiles as a zip
- **Per-profile download** — download button on each sidebar item for single-profile JSON export
- **Dirty change tracking** — download buttons light up amber when profiles have unsaved changes; clears on download
- **Editor status bar** — shows cursor position in profile pixels, selected window info, and boundary dimensions
- **Inter font** — replaced system/monospace fonts with Inter from Google Fonts throughout the UI

### Changed

- **Redesigned welcome screen** — drag-and-drop as the primary loading method with the app header always visible; browse for files as a fallback
- Layout preview now uses a shared `useLayoutTransform` hook for coordinate math, shared between the read-only preview and the interactive editor
- `getProfileWindows` now returns source metadata (`source`, `sourceIndex`, `sourceKey`) for write-back support
- Editor Save & Close downloads the updated profile JSON automatically
- Grid, Snap, and Enforce Boundaries now default to ON when opening the editor
- Boundaries button shows orange border and "(enforced)" label when boundary enforcement is active
- Buttons restyled with gradients, hover lift, and improved sizing

## v1.0 — 2026-04-11

### Initial release

- Color-coded layout preview for all CRC window types (STARS, ERAM, ASDE-X, Tower Cab, Browser, and utility windows)
- Copy Layout workflow — select a source profile, pick targets, download updated profiles as a zip
- Controller Info sync with automatic feedback URL substitution across ARTCCs
- Drag-and-drop folder loading and JSON file browsing
- Profiles grouped by ARTCC in the sidebar
- 22 ARTCC feedback URLs mapped

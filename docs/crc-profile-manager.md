# CRC Profile Manager — Project Handoff

## What This Is

A single-page web app for VATSIM controllers who use the **CRC (Common RADAR Client)** to manage their controller profiles. CRC stores profiles as JSON files in `%LOCALAPPDATA%\CRC\Profiles`. Each profile defines window layout, display settings, and controller info for a specific ATC position (e.g., "ZSE - Portland Approach").

The app lets controllers **visualize** their profile window layouts, **standardize** layouts across profiles, and **update controller info text** with ARTCC-aware feedback URL substitution.

## Current State

A working prototype exists as a single HTML file (`CRCProfileManager.html`) using React 18 + Babel (in-browser transform) + JSZip, all loaded from CDNs. No build step — just open in a browser.

**The app currently supports:**

- **Drag-and-drop loading**: User drags their CRC `Profiles` folder (or individual JSON files) from Windows Explorer into the browser. Uses `webkitGetAsEntry()` to read directory contents.
- **Profile list sidebar**: Profiles grouped by ARTCC (e.g., ZHN, ZSE, ZOA, ZAN).
- **Visual layout preview**: Color-coded rectangles showing the position and size of every window — STARS (blue), ERAM (red), ASDE-X (green), Tower Cab (amber), Browser (purple), Voice Switch (gray), Messages (teal), Controller List (pink), Flight Plan Editor (indigo). Scales proportionally with a legend showing only the types present in each profile.
- **Controller Info display**: Shows the `ControllerInfo` field (visible to pilots on VATSIM) in a monospace panel.
- **Copy Layout workflow**: Three-step flow — (1) click "Copy Layout," (2) select source profile, (3) select one or more target profiles. A confirmation modal lets the user toggle:
  - **Window Layout** (Layer 1): Copies `Bounds`, `IsVisible`, `IsMaximized`, `ShowTitleBar`, `ScaleFactor`, `CoverTaskBarWhenMaximized` for all display windows and utility windows.
  - **Controller Profile Text** (Layer 2): Copies `ControllerInfo` with automatic feedback URL substitution based on the target profile's `ArtccId`.
- **Zip download**: Modified profiles are packaged into `crc-profiles-updated.zip` using JSZip. User extracts the zip into their Profiles folder to apply changes.

## Architecture Decisions & Constraints

### Why not File System Access API?
Chrome's `showDirectoryPicker()` blocks access to `%LOCALAPPDATA%` (treated as a protected system directory). We tried multiple workarounds including Chrome flags (`--disable-features=FileSystemAccessBlockedPaths`, `--allow-file-access-from-files`) — none worked reliably. Drag-and-drop via `webkitGetAsEntry()` bypasses this restriction for reading.

### Why not Tauri?
Considered but deferred — too much build complexity for the current scope. Tauri would be the right move if the project needs auto-detection of the CRC folder, direct file writes, or distribution as a standalone `.exe`.

### Why zip download instead of direct write-back?
Since drag-and-drop only grants read access, we can't write back to the original files. The zip download is the simplest UX: download one file, extract into the Profiles folder, overwrite.

### Hosting
The app should be hosted on a real HTTPS domain (e.g., GitHub Pages, Netlify, Vercel) to avoid `file://` security origin issues in Chrome. Once hosted, no browser flags are needed — everything works out of the box.

## CRC Profile JSON Schema

Each profile is a JSON file named `{uuid}.json`. Key structure:

```json
{
  "Id": "uuid",
  "Version": 1,
  "Name": "ZSE - Portland Approach",
  "ArtccId": "ZSE",
  "Role": "Controller",
  "NetworkRating": "Controller3",
  "ControllerInfo": "Jim Thompson | HCF Senior Controller (C3)\r\nFeedback? https://zseartcc.org/feedback\r\nhttps://youtube.com/@zulualphajuliet",
  "LastUsedAt": "2026-04-11T21:25:34Z",
  "LastUsedEnvironment": "Live",
  "LastUsedPositionId": "...",
  "DisplayWindowSettings": [
    {
      "Id": "uuid",
      "WindowSettings": {
        "IsVisible": true,
        "Bounds": "3823,1,1370,1390",
        "ScaleFactor": 1.0,
        "IsMaximized": false,
        "ShowTitleBar": true
      },
      "CoverTaskBarWhenMaximized": false,
      "DisplaySettings": [
        {
          "$type": "Vatsim.Nas.Crc.Ui.Displays.Stars.Settings.StarsDisplaySettings, CRC",
          "Center": { "Lat": 45.55, "Lon": -122.51 },
          "Range": 45.0,
          "FacilityId": "P80",
          "CurrentPrefSet": { /* brightness, char sizes, leader settings, list positions, video maps, etc. */ }
        },
        {
          "$type": "Vatsim.Nas.Crc.Ui.Displays.Browser.Settings.BrowserDisplaySettings, CRC",
          "InitialUrl": "https://strips.virtualnas.net"
        }
      ],
      "SelectedDisplayId": "uuid"
    }
  ],
  "ControllerListSettings": { "Type": "ControllerList", "WindowSettings": { "Bounds": "..." } },
  "FlightPlanEditorSettings": { "Type": "FlightPlanEditor", "WindowSettings": { "Bounds": "..." } },
  "MessagesAreaSettings": { "Type": "MessagesArea", "WindowSettings": { "Bounds": "..." } },
  "VoiceSwitchSettings": { "Type": "VoiceSwitch", "WindowSettings": { "Bounds": "..." } },
  "Bookmarks": [],
  "SelectedBeaconCodes": [],
  "SecondaryVoiceSwitchPositionIds": []
}
```

### Display Types (from `$type` field)
- `StarsDisplaySettings` — STARS radar scope
- `EramDisplaySettings` — ERAM radar scope
- `AsdexDisplaySettings` — ASDE-X surface radar
- `TowerCabDisplaySettings` — Tower cab view
- `BrowserDisplaySettings` — Embedded browser (strips, TDLS, etc.)

### What's Portable vs Facility-Specific

| Portable (safe to copy) | Facility-specific (do NOT copy) |
|---|---|
| `WindowSettings.Bounds` | `Center` (lat/lon) |
| `IsVisible`, `IsMaximized`, `ShowTitleBar` | `Range` |
| `ScaleFactor` | `FacilityId`, `AreaId`, `PositionId` |
| `CoverTaskBarWhenMaximized` | `SelectedVideoMapIds` |
| Brightness values, char sizes | `RangeRingCenter` |
| Leader direction/length | `QuickLookedTcps` |
| `ControllerInfo` (with URL swap) | Weather display settings |

## Feedback URL Lookup Table

The app includes a default lookup of ARTCC feedback URLs, keyed by `ArtccId`. These are best-guess defaults — users should be able to override them. Confirmed URLs:

| ArtccId | Feedback URL | Status |
|---|---|---|
| ZHN | `https://vhcf.net/feedback/new` | Confirmed |
| ZUA | `https://vhcf.net/feedback/new` | Confirmed (Guam, under HCF) |
| ZSE | `https://zseartcc.org/feedback` | Confirmed |
| ZOA | `https://oakartcc.org/pilots/feedback` | Confirmed |
| ZAN | `https://www.zanartcc.org/feedback` | Confirmed |
| All others | `https://[domain]/feedback` | Best guess, unverified |

## Planned Features (Not Yet Built)

### Layer 3 — Display Preferences (deferred)
Selective copying of STARS/ERAM/ASDE-X pref set values (brightness, char sizes, leader settings, list positions) while excluding facility-specific fields. Intentionally deferred until Layers 1 and 2 are solid.

### Template System
Save a layout as a named template (e.g., "My Approach Layout") and apply it to any profile. Templates would store only the portable fields.

### Template Sharing
Export/import templates so ARTCC training staff could publish recommended layouts.

### Controller Info Editor
In-app editing of `ControllerInfo` text with live preview and batch apply across profiles.

### User-Overridable Feedback URLs
Settings panel where users can correct the feedback URL for their ARTCC.

## File Access Strategy for Production

When hosted on HTTPS, the **File System Access API** (`showDirectoryPicker()`) should work — the blocker we hit was Chrome refusing to let `file://` pages access `%LOCALAPPDATA%`. A properly hosted site asking the user to pick that folder via the picker should be allowed, since the user is explicitly granting permission.

**Recommended approach: offer both paths.**

1. **Primary: `showDirectoryPicker()`** — seamless read/write. User picks their Profiles folder once, the app reads all JSON files, and writes modified profiles directly back. No zip, no manual copying. Use IndexedDB to persist the directory handle so it remembers across sessions (user just re-grants permission on return).
2. **Fallback: drag-and-drop + zip download** — for browsers that don't support the File System Access API (Firefox, Safari), or if the picker is blocked for any reason. User drags the folder in, app reads via `webkitGetAsEntry()`, and exports modified profiles as a zip.

Detect support with `if ('showDirectoryPicker' in window)` and show the appropriate UI.

**Important caveat:** This needs to be tested once hosted. If Chrome still blocks `%LOCALAPPDATA%` even from an HTTPS origin, then drag-and-drop + zip is the only viable browser-based approach, and Tauri becomes the path to direct file access.

## Tech Stack for Production

The prototype uses in-browser Babel which is fine for development but should be replaced for production. Recommended setup:

- **React 18** with a proper build tool (Vite recommended — fast, minimal config)
- **JSZip** for zip generation
- **Tailwind CSS** or keep the current custom CSS (it's clean and minimal)
- **Static hosting**: GitHub Pages, Netlify, or Vercel (no backend needed)
- **No backend required** — everything runs client-side

## File Reference

- `CRCProfileManager.html` — Current working prototype (single file, ~24KB)
- The user's CRC profiles are in `%LOCALAPPDATA%\CRC\Profiles` (24 JSON files)

## Notes

- CRC may write to profile files while they're in use. We encountered null bytes at the end of a file from a concurrent write — the app already handles this by stripping trailing null bytes during JSON parse.
- The `Bounds` format is `"x,y,width,height"` as a comma-separated string.
- Some profiles have `DisplaySettings` arrays with multiple entries in a single window (e.g., STARS + Browser tabs in one window). The `SelectedDisplayId` indicates which is currently active.
- The user (Jim) controls positions across ZHN/HCF (Honolulu), ZSE (Seattle), ZOA (Oakland), and ZAN (Anchorage).

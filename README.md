# VATSIM CRC Profile Manager

A browser-based tool for VATSIM controllers to manage their [CRC (Common RADAR Client)](https://crc.virtualnas.net) profiles — visualize window layouts, standardize them across positions, and keep controller info text consistent.

## What it does

CRC stores one JSON file per controller profile in `%LOCALAPPDATA%\CRC\Profiles`. If you control multiple positions or facilities, keeping those profiles consistent is tedious. This tool makes it easy.

* **Visualize** — color-coded layout preview showing every window's position and size for any profile
* **Copy Layout** — copy window positions from one profile to others in a few clicks
* **Sync Controller Info** — copy your `ControllerInfo` text (visible to pilots on VATSIM) across profiles, with automatic feedback URL substitution per ARTCC
* **Safe by design** — only portable fields are copied; radar center, range, facility IDs, and other position-specific settings are never touched

## Usage

1. Open the app (served over HTTP — see below)
2. Drag your `%LOCALAPPDATA%\CRC\Profiles` folder into the browser window
3. Select a profile from the sidebar to preview its layout
4. Click **Copy Layout...** to copy a layout to one or more other profiles
5. Download the zip, extract into your Profiles folder, done

Use **Reload** in the toolbar to re-read your profiles after CRC has written changes. Use **Browse...** to load a different set of files.

## Running locally

The app must be served over HTTP — opening `index.html` directly as a `file://` URL will not work (Chrome blocks cross-origin script loads). The easiest option is the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code, or:

```
npx serve .
```

Then open [`http://127.0.0.1:5500`](http://127.0.0.1:5500) (Live Server) or `http://localhost:3000` (serve).

## Copy Layout — what gets copied

| Copied (portable)                             | Not copied (facility-specific)         |
| --------------------------------------------- | -------------------------------------- |
| Window positions and sizes (`Bounds`)         | Radar center lat/lon                   |
| `IsVisible`, `IsMaximized`, `ShowTitleBar`    | Range                                  |
| `ScaleFactor`, `CoverTaskBarWhenMaximized`    | `FacilityId`, `AreaId`, `PositionId`   |
| `ControllerInfo` text (with URL substitution) | Video map selections, weather settings |

## Feedback URL substitution

When copying Controller Info across ARTCCs, the app automatically swaps the feedback URL based on the target profile's `ArtccId`. Default URLs are included for all US facilities; confirmed URLs for ZHN/ZUA, ZSE, ZOA, and ZAN.

## Tech

No build step. React 18 + JSZip loaded from CDN, JSX transpiled in-browser by Babel. No backend — everything runs client-side.

```
index.html   ← app shell
css/app.css  ← styles
js/app.js    ← React app
```

## Planned

* Layer 3: copy display preferences (brightness, char sizes, leader settings) while excluding facility-specific fields
* Named layout templates — save and re-apply a layout without needing a source profile
* Template sharing — export/import for ARTCC training staff
* In-app Controller Info editor with live preview
* User-overridable feedback URLs per ARTCC
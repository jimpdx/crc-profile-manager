const { useState, useCallback, useMemo, useEffect, useRef } = React;

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FEEDBACK_URLS = {
  ZAB: "https://www.zabartcc.org/feedback",
  ZAN: "https://www.zanartcc.org/feedback",
  ZTL: "https://www.ztlartcc.org/feedback",
  ZBW: "https://www.bvartcc.com/feedback",
  ZAU: "https://www.zauartcc.org/feedback",
  ZOB: "https://clevelandcenter.org/feedback",
  ZDV: "https://zdvartcc.org/feedback",
  ZFW: "https://www.zfwartcc.net/feedback",
  ZHN: "https://vhcf.net/feedback/new",
  ZUA: "https://vhcf.net/feedback/new",
  ZHU: "https://houston.center/feedback",
  ZID: "https://flyindycenter.com/feedback",
  ZJX: "https://zjxartcc.org/feedback",
  ZKC: "https://zkcartcc.org/feedback",
  ZLA: "https://laartcc.org/feedback",
  ZME: "https://memphisartcc.com/feedback",
  ZMA: "https://www.zmaartcc.net/feedback",
  ZMP: "https://minniecenter.org/feedback",
  ZNY: "https://nyartcc.org/feedback",
  ZOA: "https://oakartcc.org/pilots/feedback",
  ZLC: "https://zlcartcc.org/feedback",
  ZSE: "https://zseartcc.org/feedback",
  ZDC: "https://www.vzdc.org/feedback",
};

const DISPLAY_TYPE_MAP = {
  StarsDisplaySettings:     { key: "stars",            label: "STARS",               css: "dt-stars" },
  EramDisplaySettings:      { key: "eram",             label: "ERAM",                css: "dt-eram" },
  AsdexDisplaySettings:     { key: "asdex",            label: "ASDE-X",              css: "dt-asdex" },
  TowerCabDisplaySettings:  { key: "towercab",         label: "Tower Cab",           css: "dt-towercab" },
  BrowserDisplaySettings:   { key: "browser",          label: "Browser",             css: "dt-browser" },
};

const UTILITY_WINDOWS = [
  { key: "VoiceSwitchSettings",      label: "Voice Switch",       css: "dt-voiceswitch" },
  { key: "MessagesAreaSettings",     label: "Messages",           css: "dt-messages" },
  { key: "ControllerListSettings",   label: "Controller List",    css: "dt-controllerlist" },
  { key: "FlightPlanEditorSettings", label: "Flight Plan Editor", css: "dt-flightplaneditor" },
];

const LEGEND_ITEMS = [
  { label: "STARS",               css: "dt-stars" },
  { label: "ERAM",                css: "dt-eram" },
  { label: "ASDE-X",              css: "dt-asdex" },
  { label: "Tower Cab",           css: "dt-towercab" },
  { label: "Browser",             css: "dt-browser" },
  { label: "Voice Switch",        css: "dt-voiceswitch" },
  { label: "Messages",            css: "dt-messages" },
  { label: "Controller List",     css: "dt-controllerlist" },
  { label: "Flight Plan Editor",  css: "dt-flightplaneditor" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBounds(s) {
  if (!s) return null;
  const p = s.split(",").map(Number);
  return p.length === 4 && p.every(n => !isNaN(n))
    ? { x: p[0], y: p[1], w: p[2], h: p[3] }
    : null;
}

function getDisplayType(ds) {
  const t = ds?.$type || "";
  for (const [f, info] of Object.entries(DISPLAY_TYPE_MAP)) {
    if (t.includes(f)) return info;
  }
  return { key: "unknown", label: "Unknown", css: "dt-browser" };
}

function getProfileWindows(profile) {
  const wins = [];

  const dwSettings = profile.DisplayWindowSettings || [];
  for (let i = 0; i < dwSettings.length; i++) {
    const dw = dwSettings[i];
    const b = parseBounds(dw.WindowSettings?.Bounds);
    if (!b) continue;
    const sel =
      (dw.DisplaySettings || []).find(ds => ds.Id === dw.SelectedDisplayId) ||
      dw.DisplaySettings?.[0];
    const ti = sel ? getDisplayType(sel) : { key: "unknown", label: "Display", css: "dt-browser" };
    wins.push({
      ...b, ...ti,
      facilityId: sel?.FacilityId || "",
      tabs: (dw.DisplaySettings || []).map(ds => getDisplayType(ds).label),
      source: "display",
      sourceIndex: i,
      sourceKey: null,
    });
  }

  for (const uw of UTILITY_WINDOWS) {
    const s = profile[uw.key];
    if (!s?.WindowSettings) continue;
    const b = parseBounds(s.WindowSettings.Bounds);
    if (!b) continue;
    wins.push({ ...b, ...uw, source: "utility", sourceIndex: null, sourceKey: uw.key });
  }

  return wins;
}

function updateProfileBounds(profile, win, newBounds) {
  const p = JSON.parse(JSON.stringify(profile));
  const boundsStr = `${Math.round(newBounds.x)},${Math.round(newBounds.y)},${Math.round(newBounds.w)},${Math.round(newBounds.h)}`;
  if (win.source === "display") {
    p.DisplayWindowSettings[win.sourceIndex].WindowSettings.Bounds = boundsStr;
  } else if (win.source === "utility") {
    p[win.sourceKey].WindowSettings.Bounds = boundsStr;
  }
  return p;
}

function useLayoutTransform(wins, containerWidth, containerHeight, customBounds) {
  return useMemo(() => {
    let bb;
    if (customBounds) {
      bb = { minX: customBounds.x, minY: customBounds.y,
             maxX: customBounds.x + customBounds.w, maxY: customBounds.y + customBounds.h };
    } else if (!wins.length) {
      bb = { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
    } else {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of wins) {
        minX = Math.min(minX, w.x);
        minY = Math.min(minY, w.y);
        maxX = Math.max(maxX, w.x + w.w);
        maxY = Math.max(maxY, w.y + w.h);
      }
      bb = { minX, minY, maxX, maxY };
    }

    const tw = bb.maxX - bb.minX || 1;
    const th = bb.maxY - bb.minY || 1;
    const sc = Math.min(containerWidth / tw, containerHeight / th) * 0.95;
    const ox = (containerWidth - tw * sc) / 2;
    const oy = (containerHeight - th * sc) / 2;

    const toScreen = (px, py) => ({
      sx: (px - bb.minX) * sc + ox,
      sy: (py - bb.minY) * sc + oy,
    });
    const toProfile = (sx, sy) => ({
      px: (sx - ox) / sc + bb.minX,
      py: (sy - oy) / sc + bb.minY,
    });
    const scaleToScreen = (pw, ph) => ({ sw: pw * sc, sh: ph * sc });

    return { bb, sc, ox, oy, tw, th, toScreen, toProfile, scaleToScreen };
  }, [wins, containerWidth, containerHeight, customBounds]);
}

function readDirectory(dirEntry) {
  return new Promise(resolve => {
    const reader = dirEntry.createReader();
    const files = [];
    const batch = () => {
      reader.readEntries(async entries => {
        if (!entries.length) { resolve(files); return; }
        for (const e of entries) {
          if (e.isFile) {
            const f = await new Promise((r, j) => e.file(r, j));
            files.push(f);
          }
        }
        batch();
      });
    };
    batch();
  });
}

// ── Components ────────────────────────────────────────────────────────────────

function LayoutPreview({ profile, height = 280 }) {
  const ref = useRef(null);
  const [cw, setCw] = useState(600);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => {
      for (const en of e) setCw(en.contentRect.width);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const wins = useMemo(() => getProfileWindows(profile), [profile]);
  const { bb, sc, ox, oy } = useLayoutTransform(wins, cw, height, null);

  return (
    <div>
      <div ref={ref} className="layout-container" style={{ height: height + "px", position: "relative" }}>
        {wins.map((w, i) => (
          <div
            key={i}
            className={`layout-window ${w.css}`}
            style={{
              left:   (w.x - bb.minX) * sc + ox,
              top:    (w.y - bb.minY) * sc + oy,
              width:  w.w * sc,
              height: w.h * sc,
            }}
            title={`${w.label}${w.facilityId ? " (" + w.facilityId + ")" : ""}\n${w.w}x${w.h} at ${w.x},${w.y}`}
          >
            <span className="window-label">
              {w.label}{w.facilityId ? ` (${w.facilityId})` : ""}
            </span>
            {w.tabs && w.tabs.length > 1 && (
              <span className="window-sublabel">{w.tabs.join(" / ")}</span>
            )}
          </div>
        ))}
      </div>
      <div className="legend">
        {LEGEND_ITEMS
          .filter(li => wins.some(w => w.css === li.css))
          .map(li => (
            <div key={li.label} className="legend-item">
              <div className={`legend-swatch ${li.css}`} />
              {li.label}
            </div>
          ))}
      </div>
    </div>
  );
}

function ControllerInfoPanel({ profile, editable, onChange }) {
  const info = (profile.ControllerInfo || "").replace(/\r\n/g, "\n").trim();
  return (
    <div className="controller-info-box">
      <h3>Controller Info (visible to pilots)</h3>
      {editable ? (
        <textarea
          className="controller-info-edit"
          value={profile.ControllerInfo || ""}
          onChange={e => onChange(e.target.value)}
          rows={6}
          placeholder="Enter controller info text..."
        />
      ) : info ? (
        <div className="controller-info-text">{info}</div>
      ) : (
        <div className="controller-info-text empty">No controller info set</div>
      )}
    </div>
  );
}

function CopyModal({ source, targets, profiles, onClose, onApply }) {
  const [copyLayout, setCL] = useState(true);
  const [copyCI, setCI]     = useState(false);
  const [urls]              = useState({ ...DEFAULT_FEEDBACK_URLS });

  const tProfs     = targets.map(id => profiles.find(p => p.Id === id)).filter(Boolean);
  const diffArtccs = [...new Set(tProfs.map(p => p.ArtccId))].filter(a => a !== source.ArtccId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Apply Layout</h2>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "12px" }}>
          From <strong style={{ color: "#f8fafc" }}>{source.Name}</strong> to:
        </p>
        <div className="target-list">
          {tProfs.map(t => <div key={t.Id}>{t.Name} ({t.ArtccId})</div>)}
        </div>

        <div className="section-title">What to copy</div>

        <label>
          <input type="checkbox" checked={copyLayout} onChange={e => setCL(e.target.checked)} />
          <div>
            <div>Window Layout</div>
            <div className="label-desc">
              Window positions and sizes for all display and utility windows.
              Does not affect radar center, range, or facility-specific settings.
            </div>
          </div>
        </label>

        <label>
          <input type="checkbox" checked={copyCI} onChange={e => setCI(e.target.checked)} />
          <div>
            <div>Controller Profile Text</div>
            <div className="label-desc">
              Your controller info visible to pilots. Feedback URL auto-adjusts per ARTCC.
            </div>
            {diffArtccs.length > 0 && copyCI && (
              <div className="artcc-note">
                Targets span different ARTCCs ({diffArtccs.join(", ")}). Feedback URLs will be substituted.
              </div>
            )}
          </div>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!copyLayout && !copyCI}
            onClick={() => onApply({ copyLayout, copyControllerInfo: copyCI, feedbackUrls: urls })}
          >
            Download Updated Profiles (.zip)
          </button>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onFilesLoaded }) {
  const [dragOver, setDO] = useState(false);
  const fileRef = useRef(null);

  const onDrop = useCallback(async e => {
    e.preventDefault();
    setDO(false);
    const files = [];
    for (const item of e.dataTransfer.items) {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const df = await readDirectory(entry);
        files.push(...df);
      } else if (entry?.isFile) {
        const f = await new Promise((r, j) => entry.file(r, j));
        files.push(f);
      }
    }
    onFilesLoaded(files);
  }, [onFilesLoaded]);

  return (
    <div
      className="welcome-screen"
      onDragOver={e => { e.preventDefault(); setDO(true); }}
      onDragLeave={() => setDO(false)}
      onDrop={onDrop}
    >
      <div className={`welcome-drop${dragOver ? " drag-over" : ""}`}>
        <div className="welcome-drop-icon">&#128194;</div>
        <h2>Drop your CRC Profiles folder here</h2>
        <p>
          Open Windows Explorer, navigate to the path below,
          and drag the entire <strong>Profiles</strong> folder
          (or individual JSON files) into this window. Your location may vary.
        </p>
        <div className="welcome-path">%LOCALAPPDATA%\CRC\Profiles</div>
      </div>

      <div className="welcome-divider">
        <span>or</span>
      </div>

      <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
        Browse for JSON files...
      </button>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".json"
        style={{ display: "none" }}
        onChange={e => onFilesLoaded(Array.from(e.target.files || []))}
      />

      <div className="welcome-tip">
        <strong>Tip:</strong> When you download edited profiles in JSON format, save them
        back to your <strong>CRC Profiles</strong> folder and overwrite the existing files
        with the same name. Each profile has a unique filename that matches
        the original.
      </div>
    </div>
  );
}

// ── Snap helper ──────────────────────────────────────────────────────────────

function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

function getNearestAnchor(px, py, bounds) {
  const relX = (px - bounds.x) / bounds.w;
  const relY = (py - bounds.y) / bounds.h;
  const col = relX < 0.3 ? "left" : relX > 0.7 ? "right" : "center";
  const row = relY < 0.3 ? "top"  : relY > 0.7 ? "bottom" : "center";
  return {
    anchorX: col === "left" ? "right" : col === "right" ? "left" : "left",
    anchorY: row === "top" ? "bottom" : row === "bottom" ? "top" : "top",
    cursorCol: col,
    cursorRow: row,
  };
}

function getResizeCursor(col, row) {
  const map = {
    "top-left": "nw-resize", "top-center": "n-resize", "top-right": "ne-resize",
    "center-left": "w-resize", "center-center": "move", "center-right": "e-resize",
    "bottom-left": "sw-resize", "bottom-center": "s-resize", "bottom-right": "se-resize",
  };
  return map[`${row}-${col}`] || "move";
}

// ── Layout Editor ────────────────────────────────────────────────────────────

function LayoutEditorShell({ profile, onSave, onClose }) {
  const [workingProfile, setWP] = useState(() => JSON.parse(JSON.stringify(profile)));
  const [isDirty, setDirty]     = useState(false);
  const [profileName, setPN]    = useState(profile.Name || "");

  const [showHelp, setShowHelp] = useState(true);

  // Grid & snap (independent toggles)
  const [gridVisible, setGridVis]  = useState(true);
  const [snapEnabled, setSnapEn]   = useState(true);
  const [gridSize, setGridSize]    = useState(100);

  // Boundaries
  const [boundsMode, setBoundsMode]     = useState("auto"); // "auto" | "custom"
  const [customW, setCustomW]           = useState(1920);
  const [customH, setCustomH]           = useState(1080);
  const [customX, setCustomX]           = useState(0);
  const [customY, setCustomY]           = useState(0);
  const [enforceBounds, setEnforce]     = useState(true);
  const [showBoundsPopover, setShowBP]  = useState(false);

  // Interaction
  const [selectedIdx, setSelIdx]   = useState(null);
  const [hoverIdx, setHoverIdx]    = useState(null);
  const [ctrlHeld, setCtrlHeld]    = useState(false);
  const dragRef = useRef(null);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [mouseProfile, setMouseProfile] = useState(null);

  const wins = useMemo(() => getProfileWindows(workingProfile), [workingProfile]);

  const customBounds = boundsMode === "custom"
    ? { x: customX, y: customY, w: customW, h: customH }
    : null;

  const { bb, toScreen, toProfile, scaleToScreen } =
    useLayoutTransform(wins, canvasSize.w, canvasSize.h, customBounds);

  // Track canvas size
  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Track Ctrl key
  useEffect(() => {
    const down = e => { if (e.key === "Control") setCtrlHeld(true); };
    const up   = e => { if (e.key === "Control") setCtrlHeld(false); };
    document.addEventListener("keydown", down);
    document.addEventListener("keyup", up);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); };
  }, []);

  // Hit test: find topmost window at profile coords
  const hitTest = useCallback((px, py) => {
    for (let i = wins.length - 1; i >= 0; i--) {
      const w = wins[i];
      if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) return i;
    }
    return -1;
  }, [wins]);

  // Clamp bounds within boundary
  const clampBounds = useCallback((b) => {
    if (!enforceBounds) return b;
    let { x, y, w, h } = b;
    const bw = bb.maxX - bb.minX;
    const bh = bb.maxY - bb.minY;
    w = Math.min(w, bw);
    h = Math.min(h, bh);
    x = Math.max(bb.minX, Math.min(x, bb.maxX - w));
    y = Math.max(bb.minY, Math.min(y, bb.maxY - h));
    return { x, y, w, h };
  }, [enforceBounds, bb]);

  const onPointerDown = useCallback(e => {
    if (showHelp) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { px, py } = toProfile(sx, sy);
    const idx = hitTest(px, py);

    if (idx < 0) { setSelIdx(null); return; }
    setSelIdx(idx);

    const win = wins[idx];
    const startBounds = { x: win.x, y: win.y, w: win.w, h: win.h };
    const isResize = e.ctrlKey;
    const anchor = isResize ? getNearestAnchor(px, py, startBounds) : null;

    dragRef.current = {
      idx,
      mode: isResize ? "resize" : "move",
      startMouse: { px, py },
      startBounds,
      anchor,
    };

    canvasRef.current.setPointerCapture(e.pointerId);
  }, [toProfile, hitTest, wins, showHelp]);

  const onPointerMove = useCallback(e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { px, py } = toProfile(sx, sy);
    setMouseProfile({ px: Math.round(px), py: Math.round(py) });

    if (!dragRef.current) {
      // Hover detection
      const idx = hitTest(px, py);
      setHoverIdx(idx >= 0 ? idx : null);
      return;
    }

    const d = dragRef.current;
    let dx = px - d.startMouse.px;
    let dy = py - d.startMouse.py;
    let newBounds;

    if (d.mode === "move") {
      let nx = d.startBounds.x + dx;
      let ny = d.startBounds.y + dy;
      if (snapEnabled) {
        nx = snapToGrid(nx, gridSize);
        ny = snapToGrid(ny, gridSize);
      }
      newBounds = { x: nx, y: ny, w: d.startBounds.w, h: d.startBounds.h };
    } else {
      // Resize
      let { x, y, w, h } = d.startBounds;
      const a = d.anchor;

      if (a.anchorX === "right") {
        // Left edge moves
        let newX = x + dx;
        if (snapEnabled) newX = snapToGrid(newX, gridSize);
        w = (x + w) - newX;
        x = newX;
      } else if (a.anchorX === "left") {
        // Right edge moves
        let newRight = x + w + dx;
        if (snapEnabled) newRight = snapToGrid(newRight, gridSize);
        w = newRight - x;
      }

      if (a.anchorY === "bottom") {
        // Top edge moves
        let newY = y + dy;
        if (snapEnabled) newY = snapToGrid(newY, gridSize);
        h = (y + h) - newY;
        y = newY;
      } else if (a.anchorY === "top") {
        // Bottom edge moves
        let newBottom = y + h + dy;
        if (snapEnabled) newBottom = snapToGrid(newBottom, gridSize);
        h = newBottom - y;
      }

      // Enforce minimum size
      if (w < 50) { if (a.anchorX === "right") x = d.startBounds.x + d.startBounds.w - 50; w = 50; }
      if (h < 50) { if (a.anchorY === "bottom") y = d.startBounds.y + d.startBounds.h - 50; h = 50; }

      newBounds = { x, y, w, h };
    }

    newBounds = clampBounds(newBounds);
    const updated = updateProfileBounds(workingProfile, wins[d.idx], newBounds);
    setWP(updated);
    setDirty(true);
  }, [toProfile, hitTest, workingProfile, wins, snapEnabled, gridSize, clampBounds]);

  const onPointerUp = useCallback(e => {
    if (dragRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  // Cursor logic
  const getCursor = () => {
    if (dragRef.current) {
      if (dragRef.current.mode === "move") return "grabbing";
      const a = dragRef.current.anchor;
      return getResizeCursor(a.cursorCol, a.cursorRow);
    }
    if (hoverIdx !== null && ctrlHeld) {
      const w = wins[hoverIdx];
      if (mouseProfile) {
        const relX = (mouseProfile.px - w.x) / w.w;
        const relY = (mouseProfile.py - w.y) / w.h;
        const col = relX < 0.3 ? "left" : relX > 0.7 ? "right" : "center";
        const row = relY < 0.3 ? "top"  : relY > 0.7 ? "bottom" : "center";
        return getResizeCursor(col, row);
      }
      return "nw-resize";
    }
    if (hoverIdx !== null) return "move";
    return "default";
  };

  const snapAllToGrid = () => {
    let p = workingProfile;
    let count = 0;
    for (const w of wins) {
      const newX = snapToGrid(w.x, gridSize);
      const newY = snapToGrid(w.y, gridSize);
      const newR = snapToGrid(w.x + w.w, gridSize);
      const newB = snapToGrid(w.y + w.h, gridSize);
      const newW = Math.max(gridSize, newR - newX);
      const newH = Math.max(gridSize, newB - newY);
      if (newX !== w.x || newY !== w.y || newW !== w.w || newH !== w.h) {
        p = updateProfileBounds(p, w, { x: newX, y: newY, w: newW, h: newH });
        count++;
      }
    }
    if (count > 0) {
      setWP(p);
      setDirty(true);
    }
  };

  const handleSave = () => {
    const p = { ...workingProfile, Name: profileName };
    onSave(p);
  };

  const handleClose = () => {
    if (isDirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    onClose();
  };

  // Preset boundaries
  const applyPreset = (w, h) => {
    setBoundsMode("custom");
    setCustomX(0); setCustomY(0);
    setCustomW(w); setCustomH(h);
  };

  const selWin = selectedIdx !== null ? wins[selectedIdx] : null;

  // Grid lines for SVG
  const gridLines = useMemo(() => {
    if (!gridVisible) return [];
    const lines = [];
    const startX = Math.floor(bb.minX / gridSize) * gridSize;
    const startY = Math.floor(bb.minY / gridSize) * gridSize;
    for (let gx = startX; gx <= bb.maxX; gx += gridSize) {
      const { sx } = toScreen(gx, 0);
      lines.push({ x1: sx, y1: 0, x2: sx, y2: canvasSize.h, label: gx });
    }
    for (let gy = startY; gy <= bb.maxY; gy += gridSize) {
      const { sy } = toScreen(0, gy);
      lines.push({ x1: 0, y1: sy, x2: canvasSize.w, y2: sy, label: gy });
    }
    return lines;
  }, [gridVisible, gridSize, bb, toScreen, canvasSize]);

  return (
    <div className="editor-shell">
      <div className="editor-header">
        <input
          type="text"
          className="editor-name-input"
          value={profileName}
          onChange={e => { setPN(e.target.value); setDirty(true); }}
        />
        <span style={{ fontSize: "11px", color: "#64748b" }}>
          {workingProfile.ArtccId} &middot; {workingProfile.Role}
        </span>

        <div className="editor-separator" />

        <div className="grid-controls">
          <button
            className={`btn btn-ghost btn-sm${gridVisible ? " active" : ""}`}
            onClick={() => setGridVis(!gridVisible)}
            title="Show grid lines"
          >Grid</button>
          <button
            className={`btn btn-ghost btn-sm${snapEnabled ? " active" : ""}`}
            onClick={() => setSnapEn(!snapEnabled)}
            title="Snap to grid"
          >Snap</button>
          {[50, 100, 200].map(s => (
            <button
              key={s}
              className={`btn btn-ghost btn-sm${gridSize === s ? " active" : ""}`}
              onClick={() => setGridSize(s)}
            >{s}px</button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={snapAllToGrid}
            title="Snap all windows to nearest grid lines"
          >Snap All</button>
        </div>

        <div className="editor-separator" />

        <div style={{ position: "relative" }}>
          <button className={`btn btn-sm${enforceBounds ? " btn-enforce" : " btn-ghost"}`} onClick={() => setShowBP(!showBoundsPopover)}>
            Boundaries{enforceBounds ? " (enforced)" : ""}
          </button>
          {showBoundsPopover && (
            <div className="bounds-popover" onClick={e => e.stopPropagation()}>
              <div className="bounds-section">
                <label className="bounds-radio">
                  <input type="radio" name="bm" checked={boundsMode === "auto"} onChange={() => setBoundsMode("auto")} />
                  Auto (fit to windows)
                </label>
                <label className="bounds-radio">
                  <input type="radio" name="bm" checked={boundsMode === "custom"} onChange={() => setBoundsMode("custom")} />
                  Custom
                </label>
              </div>
              {boundsMode === "custom" && (
                <div className="bounds-custom">
                  <div className="bounds-row">
                    <label>X <input type="number" value={customX} onChange={e => setCustomX(Number(e.target.value))} /></label>
                    <label>Y <input type="number" value={customY} onChange={e => setCustomY(Number(e.target.value))} /></label>
                  </div>
                  <div className="bounds-row">
                    <label>W <input type="number" value={customW} onChange={e => setCustomW(Number(e.target.value))} /></label>
                    <label>H <input type="number" value={customH} onChange={e => setCustomH(Number(e.target.value))} /></label>
                  </div>
                  <div className="bounds-presets">
                    <button className="btn btn-ghost btn-sm" onClick={() => applyPreset(1920, 1080)}>1920x1080</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => applyPreset(3840, 2160)}>3840x2160</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => applyPreset(5760, 1080)}>5760x1080</button>
                  </div>
                </div>
              )}
              <label className="bounds-enforce">
                <input type="checkbox" checked={enforceBounds} onChange={e => setEnforce(e.target.checked)} />
                Enforce boundaries (prevent windows from going outside)
              </label>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave}>
          {isDirty ? "Save & Close" : "Close"}
        </button>
      </div>

      <div
        ref={canvasRef}
        className="editor-canvas"
        style={{ cursor: getCursor() }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Boundary rectangle */}
        {(() => {
          const tl = toScreen(bb.minX, bb.minY);
          const { sw, sh } = scaleToScreen(bb.maxX - bb.minX, bb.maxY - bb.minY);
          return (
            <div
              className={`editor-boundary${enforceBounds ? " enforced" : ""}`}
              style={{ left: tl.sx, top: tl.sy, width: sw, height: sh }}
            />
          );
        })()}

        {/* Grid SVG */}
        {gridVisible && (
          <svg className="editor-grid" width={canvasSize.w} height={canvasSize.h}>
            {gridLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="rgba(148,163,184,0.12)" strokeWidth={1} />
            ))}
          </svg>
        )}

        {/* Windows */}
        {wins.map((w, i) => {
          const { sx, sy } = toScreen(w.x, w.y);
          const { sw, sh } = scaleToScreen(w.w, w.h);
          let cls = `layout-window ${w.css}`;
          if (i === selectedIdx) cls += " editor-selected";
          else if (i === hoverIdx) cls += " editor-hover";
          return (
            <div key={i} className={cls} style={{ left: sx, top: sy, width: sw, height: sh }}>
              <span className="window-label">
                {w.label}{w.facilityId ? ` (${w.facilityId})` : ""}
              </span>
              {w.tabs && w.tabs.length > 1 && (
                <span className="window-sublabel">{w.tabs.join(" / ")}</span>
              )}
            </div>
          );
        })}

        {showHelp && (
          <div className="editor-help-overlay" onClick={() => setShowHelp(false)}>
            <div className="editor-help-modal" onClick={e => e.stopPropagation()}>
              <h3>Layout Editor</h3>
              <ul>
                <li><strong>Click and drag</strong> a window to move it</li>
                <li><strong>Ctrl + click and drag</strong> to resize from the nearest edge</li>
                <li>Click directly on any window to select and start dragging it</li>
              </ul>
              <p>Grid, Snap, and Boundary enforcement are on by default. Use the toolbar to adjust.</p>
              <button className="btn btn-primary" onClick={() => setShowHelp(false)}>Got it</button>
            </div>
          </div>
        )}
      </div>

      <div className="editor-status">
        <span>
          {mouseProfile ? `Cursor: ${mouseProfile.px}, ${mouseProfile.py}` : "Cursor: --"}
        </span>
        <span>
          {selWin ? `${selWin.label}: ${selWin.w}x${selWin.h} at ${selWin.x},${selWin.y}` : "No selection"}
        </span>
        <span>
          Bounds: {Math.round(bb.maxX - bb.minX)}x{Math.round(bb.maxY - bb.minY)}
          {boundsMode === "custom" ? " (custom)" : " (auto)"}
        </span>
        <span style={{ marginLeft: "auto", color: "#475569" }}>
          Click to move &middot; Ctrl+click to resize
        </span>
      </div>
    </div>
  );
}

// ── GitHub Stars ─────────────────────────────────────────────────────────────

function GitHubStars() {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/jimpdx/crc-profile-manager")
      .then(r => r.json())
      .then(d => { if (typeof d.stargazers_count === "number") setStars(d.stargazers_count); })
      .catch(() => {});
  }, []);

  return (
    <a
      href="https://github.com/jimpdx/crc-profile-manager"
      target="_blank"
      rel="noopener noreferrer"
      className="github-stars"
      title="Star this project on GitHub"
    >
      <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <svg className="star-icon" height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
      </svg>
      {stars !== null && <span className="star-count">{stars}</span>}
    </a>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [profiles,    setProfiles] = useState([]);
  const [fileNameMap, setFNM]      = useState({});
  const [rawFiles,    setRawFiles] = useState([]);
  const [selectedId,  setSelId]    = useState(null);
  const [mode,        setMode]     = useState("view");
  const [sourceId,    setSrcId]    = useState(null);
  const [targetIds,   setTgtIds]   = useState([]);
  const [showModal,   setShowModal] = useState(false);
  const [toast,       setToast]    = useState(null);
  const [editorId,    setEditorId] = useState(null);
  const [dirtyIds,    setDirtyIds] = useState(new Set());
  const [dlTipShown,  setDLTip]   = useState(false);
  const browseRef = useRef(null);

  const showToast = useCallback((m, duration = 3000) => {
    setToast(m);
    setTimeout(() => setToast(null), duration);
  }, []);

  const processFiles = useCallback(async files => {
    const profs = [], fmap = {};
    for (const f of files) {
      if (!f.name.endsWith(".json")) continue;
      try {
        const t = await f.text();
        const d = JSON.parse(t.replace(/\0+$/, ""));
        if (d.Id && d.DisplayWindowSettings) {
          profs.push(d);
          fmap[d.Id] = f.name;
        }
      } catch (e) {}
    }
    if (profs.length) {
      profs.sort(
        (a, b) =>
          (a.ArtccId || "").localeCompare(b.ArtccId || "") ||
          (a.Name    || "").localeCompare(b.Name    || "")
      );
      setRawFiles(files);
      setProfiles(profs);
      setFNM(fmap);
      setDirtyIds(new Set());
      setSelId(null);
      setMode("view");
      showToast(`Loaded ${profs.length} profiles`);
    }
  }, [showToast]);

  const downloadProfile = useCallback((profile) => {
    const name = fileNameMap[profile.Id] || `${profile.Id}.json`;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDirtyIds(prev => { const s = new Set(prev); s.delete(profile.Id); return s; });
    if (!dlTipShown) {
      setDLTip(true);
      showToast("Save this file to your CRC Profiles folder, overwriting the existing file with the same name", 6000);
    }
  }, [fileNameMap, dlTipShown, showToast]);

  const downloadAllAsZip = useCallback(async () => {
    const zip = new JSZip();
    for (const p of profiles) {
      const name = fileNameMap[p.Id] || `${p.Id}.json`;
      zip.file(name, JSON.stringify(p, null, 2));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "crc-profiles.zip";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDirtyIds(new Set());
    showToast(`Downloaded ${profiles.length} profiles as zip`);
  }, [profiles, fileNameMap, showToast]);

  const onLoaded = useCallback(files => {
    processFiles(files);
  }, [processFiles]);

  const grouped = useMemo(() => {
    const g = {};
    for (const p of profiles) {
      const a = p.ArtccId || "?";
      if (!g[a]) g[a] = [];
      g[a].push(p);
    }
    return g;
  }, [profiles]);

  const selProfile = profiles.find(p => p.Id === selectedId);
  const srcProfile = profiles.find(p => p.Id === sourceId);

  // ── Layout copy helpers ──

  const extractLayout = p => {
    const L = {
      displayWindows: (p.DisplayWindowSettings || []).map(dw => ({
        bounds:      dw.WindowSettings?.Bounds,
        isVisible:   dw.WindowSettings?.IsVisible,
        isMaximized: dw.WindowSettings?.IsMaximized,
        showTitleBar: dw.WindowSettings?.ShowTitleBar,
        scaleFactor: dw.WindowSettings?.ScaleFactor,
        coverTaskBar: dw.CoverTaskBarWhenMaximized,
      })),
    };
    for (const uw of UTILITY_WINDOWS) {
      const s = p[uw.key];
      if (s?.WindowSettings) {
        L[uw.key] = {
          bounds:      s.WindowSettings.Bounds,
          isVisible:   s.WindowSettings.IsVisible,
          isMaximized: s.WindowSettings.IsMaximized,
          showTitleBar: s.WindowSettings.ShowTitleBar,
          scaleFactor: s.WindowSettings.ScaleFactor,
        };
      }
    }
    return L;
  };

  const applyLayout = (target, L) => {
    const u = JSON.parse(JSON.stringify(target));
    for (let i = 0; i < Math.min(L.displayWindows.length, (u.DisplayWindowSettings || []).length); i++) {
      const s = L.displayWindows[i];
      if (!s.bounds) continue;
      Object.assign(u.DisplayWindowSettings[i].WindowSettings, {
        Bounds:      s.bounds,
        IsVisible:   s.isVisible,
        IsMaximized: s.isMaximized,
        ShowTitleBar: s.showTitleBar,
        ScaleFactor: s.scaleFactor,
      });
      u.DisplayWindowSettings[i].CoverTaskBarWhenMaximized = s.coverTaskBar;
    }
    for (const uw of UTILITY_WINDOWS) {
      if (L[uw.key] && u[uw.key]?.WindowSettings) {
        Object.assign(u[uw.key].WindowSettings, {
          Bounds:      L[uw.key].bounds,
          IsVisible:   L[uw.key].isVisible,
          IsMaximized: L[uw.key].isMaximized,
          ShowTitleBar: L[uw.key].showTitleBar,
          ScaleFactor: L[uw.key].scaleFactor,
        });
      }
    }
    return u;
  };

  const applyCI = (target, srcInfo, srcArtcc, urls) => {
    const u  = JSON.parse(JSON.stringify(target));
    const ta = u.ArtccId;
    if (srcArtcc === ta) {
      u.ControllerInfo = srcInfo;
    } else {
      const su = urls[srcArtcc] || "";
      const tu = urls[ta]       || su;
      u.ControllerInfo = su && tu ? srcInfo.replace(su, tu) : srcInfo;
    }
    return u;
  };

  const handleApply = useCallback(async opts => {
    const src = profiles.find(p => p.Id === sourceId);
    if (!src) return;

    const L = opts.copyLayout ? extractLayout(src) : null;
    const updated = [];

    for (const tid of targetIds) {
      const t = profiles.find(p => p.Id === tid);
      if (!t) continue;
      let u = JSON.parse(JSON.stringify(t));
      if (L) u = applyLayout(u, L);
      if (opts.copyControllerInfo) u = applyCI(u, src.ControllerInfo, src.ArtccId, opts.feedbackUrls);
      updated.push({ data: u, filename: fileNameMap[tid] || `${tid}.json`, id: tid });
    }

    const zip  = new JSZip();
    for (const { data, filename } of updated) zip.file(filename, JSON.stringify(data, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const zu   = URL.createObjectURL(blob);
    const za   = document.createElement("a");
    za.href     = zu;
    za.download = "crc-profiles-updated.zip";
    document.body.appendChild(za);
    za.click();
    document.body.removeChild(za);
    URL.revokeObjectURL(zu);

    setProfiles(prev => prev.map(p => {
      const m = updated.find(u => u.id === p.Id);
      return m ? m.data : p;
    }));
    setShowModal(false);
    setMode("view");
    setSrcId(null);
    setTgtIds([]);
    showToast(`Downloaded zip with ${updated.length} updated profile${updated.length !== 1 ? "s" : ""}`);
  }, [profiles, sourceId, targetIds, fileNameMap, showToast]);

  // ── Sidebar item click ──

  const handleProfileClick = p => {
    if (mode === "view") {
      setSelId(p.Id);
    } else if (mode === "selectSource") {
      setSrcId(p.Id);
      setSelId(p.Id);
    } else if (mode === "selectTargets" && p.Id !== sourceId) {
      setTgtIds(prev =>
        prev.includes(p.Id) ? prev.filter(x => x !== p.Id) : [...prev, p.Id]
      );
    }
  };

  const cancelCopy = () => { setMode("view"); setSrcId(null); setTgtIds([]); };

  // ── Render ──

  return (
    <div className="app">
      {profiles.length === 0 ? (
        <div className="app-welcome">
          <div className="sidebar-header">
            <h1>CRC Profile Manager <span className="version-badge">v1.2</span></h1>
            <p>Layout standardization for VATSIM CRC</p>
          </div>
          <WelcomeScreen onFilesLoaded={onLoaded} />
        </div>
      ) : (<>
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>CRC Profile Manager <span className="version-badge">v1.2</span></h1>
            <p>Layout standardization for VATSIM CRC</p>
          </div>
          <div className="sidebar-list">
            {Object.entries(grouped).map(([artcc, profs]) => (
              <div key={artcc} className="artcc-group">
                <div className="artcc-label">{artcc}</div>
                {profs.map(p => {
                  let cls = "profile-item";
                  if (mode === "view"          && p.Id === selectedId)           cls += " selected";
                  if ((mode === "selectSource" || mode === "selectTargets") && p.Id === sourceId) cls += " source-selected";
                  if (mode === "selectTargets" && targetIds.includes(p.Id))      cls += " target-selected";
                  const types = [...new Set(
                    (p.DisplayWindowSettings || [])
                      .flatMap(dw => (dw.DisplaySettings || []).map(ds => getDisplayType(ds).key))
                  )];
                  return (
                    <div key={p.Id} className={cls} onClick={() => handleProfileClick(p)}>
                      <span style={{ flex: 1 }}>{p.Name}</span>
                      <button
                        className={`profile-dl-btn${dirtyIds.has(p.Id) ? " dirty" : ""}`}
                        title={dirtyIds.has(p.Id) ? "Download this profile (unsaved changes)" : "Download this profile"}
                        onClick={e => { e.stopPropagation(); downloadProfile(p); }}
                      >&#8681;</button>
                      <span className="badge">{types.length}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="main">
          <div className="toolbar">
            <button className="btn btn-ghost" onClick={() => processFiles(rawFiles)}>
              Reload
            </button>
            <button className="btn btn-ghost" onClick={() => browseRef.current?.click()}>
              Browse...
            </button>
            <input
              ref={browseRef}
              type="file"
              multiple
              accept=".json"
              style={{ display: "none" }}
              onChange={e => processFiles(Array.from(e.target.files || []))}
            />
            <button className={`btn ${dirtyIds.size > 0 ? "btn-dirty" : "btn-ghost"}`} onClick={downloadAllAsZip}>
              Download All (.zip){dirtyIds.size > 0 ? ` (${dirtyIds.size} changed)` : ""}
            </button>

            {mode === "view" && (
              <button className="btn btn-success" onClick={() => { setMode("selectSource"); setSrcId(null); setTgtIds([]); }}>
                Copy Layout...
              </button>
            )}

            {mode === "selectSource" && (<>
              <span style={{ fontSize: "13px", color: "#fbbf24" }}>Step 1: Select source profile</span>
              <button className="btn btn-primary" disabled={!sourceId} onClick={() => { if (sourceId) setMode("selectTargets"); }}>Next</button>
              <button className="btn btn-ghost" onClick={cancelCopy}>Cancel</button>
            </>)}

            {mode === "selectTargets" && (<>
              <span style={{ fontSize: "13px", color: "#fbbf24" }}>Step 2: Select target profile(s)</span>
              <button className="btn btn-primary" disabled={targetIds.length === 0} onClick={() => setShowModal(true)}>
                Apply to {targetIds.length}...
              </button>
              <button className="btn btn-ghost" onClick={() => setTgtIds(profiles.filter(p => p.Id !== sourceId).map(p => p.Id))}>
                Select All
              </button>
              <button className="btn btn-ghost" onClick={cancelCopy}>Cancel</button>
            </>)}
          </div>

          <div className="content">
            {selProfile ? (
              <div>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#f8fafc" }}>{selProfile.Name}</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditorId(selProfile.Id)}>
                      Edit Layout
                    </button>
                  </div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selProfile.ArtccId} &middot; {selProfile.Role} &middot;{" "}
                    {selProfile.LastUsedEnvironment ? `Last used on ${selProfile.LastUsedEnvironment}` : "Never used"}
                  </span>
                </div>
                <LayoutPreview profile={selProfile} height={320} />
                <ControllerInfoPanel profile={selProfile} editable onChange={val => {
                  setProfiles(prev => prev.map(p => p.Id === selProfile.Id ? { ...p, ControllerInfo: val } : p));
                  setDirtyIds(prev => new Set(prev).add(selProfile.Id));
                }} />
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  {mode === "selectSource"
                    ? "Click a profile in the sidebar to use as the layout source."
                    : mode === "selectTargets"
                    ? "Click profiles to select as targets. Source is highlighted green."
                    : "Select a profile from the sidebar to view its layout."}
                </p>
              </div>
            )}
          </div>

          <div className="status-bar">
            <span>{profiles.length} profiles loaded</span>
            {srcProfile && mode !== "view" && <span>Source: {srcProfile.Name}</span>}
            {targetIds.length > 0 && <span>{targetIds.length} target{targetIds.length !== 1 ? "s" : ""} selected</span>}
          </div>
        </div>

        {showModal && srcProfile && (
          <CopyModal
            source={srcProfile}
            targets={targetIds}
            profiles={profiles}
            onClose={() => setShowModal(false)}
            onApply={handleApply}
          />
        )}

        {editorId && (() => {
          const ep = profiles.find(p => p.Id === editorId);
          if (!ep) return null;
          return (
            <LayoutEditorShell
              profile={ep}
              onSave={updated => {
                setProfiles(prev => prev.map(p => p.Id === updated.Id ? updated : p));
                setEditorId(null);
                downloadProfile(updated);
                showToast("Profile downloaded");
              }}
              onClose={() => setEditorId(null)}
            />
          );
        })()}

        {toast && <div className="toast">{toast}</div>}
      </>)}

      <GitHubStars />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

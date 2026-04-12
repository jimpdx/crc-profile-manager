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

  for (const dw of profile.DisplayWindowSettings || []) {
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
    });
  }

  for (const uw of UTILITY_WINDOWS) {
    const s = profile[uw.key];
    if (!s?.WindowSettings) continue;
    const b = parseBounds(s.WindowSettings.Bounds);
    if (!b) continue;
    wins.push({ ...b, ...uw });
  }

  return wins;
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

  const bb = useMemo(() => {
    if (!wins.length) return { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of wins) {
      minX = Math.min(minX, w.x);
      minY = Math.min(minY, w.y);
      maxX = Math.max(maxX, w.x + w.w);
      maxY = Math.max(maxY, w.y + w.h);
    }
    return { minX, minY, maxX, maxY };
  }, [wins]);

  const tw = bb.maxX - bb.minX || 1;
  const th = bb.maxY - bb.minY || 1;
  const sc = Math.min(cw / tw, height / th) * 0.95;
  const ox = (cw - tw * sc) / 2;
  const oy = (height - th * sc) / 2;

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

function ControllerInfoPanel({ profile }) {
  const info = (profile.ControllerInfo || "").replace(/\r\n/g, "\n").trim();
  return (
    <div className="controller-info-box">
      <h3>Controller Info (visible to pilots)</h3>
      {info
        ? <div className="controller-info-text">{info}</div>
        : <div className="controller-info-text empty">No controller info set</div>
      }
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

function DropZone({ onFilesLoaded }) {
  const [dragOver, setDO] = useState(false);
  const fileRef = useRef(null);

  const collectAndLoad = useCallback(async files => {
    onFilesLoaded(files);
  }, [onFilesLoaded]);

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
    await collectAndLoad(files);
  }, [collectAndLoad]);

  return (
    <div
      className="dropzone"
      onDragOver={e => { e.preventDefault(); setDO(true); }}
      onDragLeave={() => setDO(false)}
      onDrop={onDrop}
    >
      <div className={`drop-area${dragOver ? " drag-over" : ""}`}>
        <div className="drop-icon">&#128194;</div>
        <div className="drop-title">Drop your CRC Profiles folder here</div>
        <div className="drop-subtitle">Drag the folder from Windows Explorer into this area</div>
        <div className="drop-path">%LOCALAPPDATA%\CRC\Profiles</div>
        <div className="drop-or">&mdash; or &mdash;</div>
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          Browse for JSON files
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".json"
          style={{ display: "none" }}
          onChange={e => collectAndLoad(Array.from(e.target.files || []))}
        />
      </div>
    </div>
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
  const browseRef = useRef(null);

  const showToast = useCallback(m => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
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
      setSelId(null);
      setMode("view");
      showToast(`Loaded ${profs.length} profiles`);
    }
  }, [showToast]);

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
      {profiles.length > 0 && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h1>CRC Profile Manager <span className="version-badge">v1.0</span></h1>
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
                      <span className="badge">{types.length}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="main" style={profiles.length === 0 ? { flex: 1 } : {}}>
        {profiles.length > 0 && (
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
        )}

        <div className="content">
          {profiles.length === 0 ? (
            <DropZone onFilesLoaded={onLoaded} />
          ) : selProfile ? (
            <div>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#f8fafc" }}>{selProfile.Name}</h2>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  {selProfile.ArtccId} &middot; {selProfile.Role} &middot;{" "}
                  {selProfile.LastUsedEnvironment ? `Last used on ${selProfile.LastUsedEnvironment}` : "Never used"}
                </span>
              </div>
              <LayoutPreview profile={selProfile} height={320} />
              <ControllerInfoPanel profile={selProfile} />
            </div>
          ) : (
            <div className="dropzone">
              <p style={{ color: "#475569" }}>
                {mode === "selectSource"
                  ? "Click a profile in the sidebar to use as the layout source."
                  : mode === "selectTargets"
                  ? "Click profiles to select as targets. Source is highlighted green."
                  : "Select a profile from the sidebar to view its layout."}
              </p>
            </div>
          )}
        </div>

        {profiles.length > 0 && (
          <div className="status-bar">
            <span>{profiles.length} profiles loaded</span>
            {srcProfile && mode !== "view" && <span>Source: {srcProfile.Name}</span>}
            {targetIds.length > 0 && <span>{targetIds.length} target{targetIds.length !== 1 ? "s" : ""} selected</span>}
          </div>
        )}
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

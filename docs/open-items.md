# Open Items

Tracked feature requests, design questions, and improvements not yet scheduled.

## Grid origin alignment

The grid currently aligns to absolute 0,0 in pixel space. Many users have already aligned their window edges to specific positions that represent the visible boundary of their monitor layout. The grid origin should be configurable:

- **Option A (current):** Grid at absolute 0,0 — matches raw monitor pixel coordinates
- **Option B (proposed default):** Grid origin at the top-left of the current bounding box — aligns with the user's existing layout boundaries
- **Option C:** User-specified origin via the Boundaries controls

Recommendation: default to Option B (bounding box origin), with Option C available when custom boundaries are set. This respects existing layouts where users have intentionally positioned their top-left edges.

## Download file naming / overwrite behavior

Chrome appends `(1)`, `(2)`, etc. to downloaded files rather than overwriting. This creates friction since users need to replace files in their Profiles folder. Investigated options:

- Browser download behavior is controlled by the user's Chrome setting: **Settings > Downloads > "Ask where to save each file before downloading"**. When enabled, the user gets a Save As dialog and can overwrite directly. We should recommend this in the UI or docs.
- There is no web API to force overwrite — this is a browser security boundary.
- We could suggest users enable "Ask where to save" in Chrome, or provide instructions to set their default download location to the Profiles folder.
- Alternative: add a help tip or first-time notice explaining the download workflow.

## Future features (from README)

- Named layout templates — save and re-apply a layout without needing a source profile
- Template sharing — export/import for ARTCC training staff
- Layer 3: copy display preferences (brightness, char sizes, leader settings) while excluding facility-specific fields
- User-overridable feedback URLs per ARTCC

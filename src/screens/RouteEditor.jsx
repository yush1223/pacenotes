import { useState, useEffect } from "react";
import { uid } from "../lib/storage";
import { fmt, parseTargetInput } from "../lib/time";
import * as db from "../lib/db";
import BackHead from "../components/BackHead";
import Switch from "../components/Switch";

// ---------- route editor ----------
export default function RouteEditor({ gameId, initial, userId, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [targetStr, setTargetStr] = useState(initial?.target_ms != null ? fmt(initial.target_ms, false) : "");
  const [useTarget, setUseTarget] = useState(initial?.use_target !== false);
  const [pb, setPb] = useState(null);
  const [practiceBests, setPracticeBests] = useState({});
  const [segments, setSegments] = useState(
    initial?.segments?.length
      ? initial.segments.map((s) => ({ ...s, targetStr: s.target_ms != null ? fmt(s.target_ms, false) : "" }))
      : [{ id: uid(), title: "", notes: "", targetStr: "" }]
  );

  // PB is read-only reference here, for context while setting targets. It
  // lives in a separate per-user table now, so it needs its own fetch.
  useEffect(() => {
    if (!initial?.id) return;
    db.getPB(initial.id, userId).then(setPb);
    db.getPracticeBests(initial.id, userId).then(setPracticeBests);
  }, [initial?.id, userId]);
  const pbBySegId = {};
  if (pb) initial.segments.forEach((s, i) => { pbBySegId[s.id] = toDuration(pb.splits, i); });

  const updateSeg = (idx, field, val) => setSegments((segs) => segs.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  const addSeg = () => setSegments((segs) => [...segs, { id: uid(), title: "", notes: "", targetStr: "" }]);
  const removeSeg = (idx) => setSegments((segs) => segs.filter((_, i) => i !== idx));
  const moveSeg = (idx, dir) => setSegments((segs) => {
    const next = [...segs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return segs;
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  });

  const canSave = name.trim() && segments.some((s) => s.title.trim());

  const handleSave = () => {
    const kept = segments.filter((s) => s.title.trim());
    const cleanSegs = kept.map((s) => ({
      id: s.id,
      title: s.title.trim(),
      notes: s.notes || "",
      target_ms: useTarget ? parseTargetInput(s.targetStr) : null,
    }));
    onSave({
      id: initial?.id,
      game_id: gameId,
      name: name.trim(),
      // Target is an all-or-nothing optional feature — switching it off
      // clears the stored values too, not just the display, so "off"
      // really means gone, not just hidden.
      target_ms: useTarget ? parseTargetInput(targetStr) : null,
      segments: cleanSegs,
      use_target: useTarget,
      // Only present when this editor was opened via "Remix" — carried
      // through untouched so saveRoute() can record lineage on insert.
      remixedFrom: initial?.remixedFrom,
      remixedFromName: initial?.remixedFromName,
      remixedFromOwnerId: initial?.remixedFromOwnerId,
    });
  };

  return (
    <div className="pn-view">
      <BackHead onBack={onCancel} eyebrow={initial?.id ? "Edit route" : initial?.remixedFrom ? "Remix route" : "New route"} title="Route editor" />
      {initial?.remixedFrom && !initial?.id && (
        <div className="pn-hint" style={{ marginTop: -8, marginBottom: 14 }}>
          Starting from "{initial.remixedFromName}" by {initial.remixedFromOwnerUsername || "the original author"} — edit freely, credit stays attached.
        </div>
      )}
      {pb && (
        <div className="pn-editor-pb-note">
          <span className="pn-editor-pb-note-label">personal best</span>
          <span className="pn-mono pn-brass-text">{fmt(pb.total_ms, false)}</span>
          <span className="pn-editor-pb-note-hint">set by your best run — not editable here</span>
        </div>
      )}
      <label className="pn-label">Route name</label>
      <input className="pn-input" placeholder="e.g. Any% — no major glitches" value={name} onChange={(e) => setName(e.target.value)} />

      <Switch checked={useTarget} onChange={setUseTarget} label="Use target times" />
      <div className="pn-hint" style={{ marginTop: -8, marginBottom: 14 }}>
        Speedrunning here is built around PBs — target is an optional stand-in for segments (or a whole route) you don't have a PB for yet.
      </div>

      {useTarget && (
        <>
          <label className="pn-label">Total target (optional)</label>
          <input className="pn-input pn-input-mono" placeholder="mm:ss or h:mm:ss — e.g. current WR" value={targetStr} onChange={(e) => setTargetStr(e.target.value)} />
        </>
      )}

      <label className="pn-label" style={{ marginTop: 18 }}>Segments</label>

      <div className="pn-seg-editor-list pn-stagger">
        {segments.map((s, i) => (
          <div className="pn-seg-editor-card" key={s.id}>
            <div className="pn-seg-editor-tab">{String(i + 1).padStart(2, "0")}</div>
            <div className="pn-seg-editor-body">
              <div className="pn-seg-editor-toprow">
                <input className="pn-input" placeholder="Segment title" value={s.title} onChange={(e) => updateSeg(i, "title", e.target.value)} />
                {pbBySegId[s.id] != null && (
                  <span className="pn-seg-editor-pb" title="Personal best for this segment (read-only)">
                    pb {fmt(pbBySegId[s.id], false)}
                  </span>
                )}
                {useTarget && (
                  <input
                    className="pn-input pn-input-mono pn-seg-editor-target"
                    placeholder="target"
                    title="Optional target split time for this segment (mm:ss)"
                    value={s.targetStr}
                    onChange={(e) => updateSeg(i, "targetStr", e.target.value)}
                  />
                )}
              </div>
              {useTarget && practiceBests[s.id] != null && (
                <div className="pn-hint" style={{ marginTop: -4, marginBottom: 8 }}>
                  your practice best: <span className="pn-brass-text">{fmt(practiceBests[s.id], false)}</span>{" "}
                  <button className="pn-author-link" onClick={() => updateSeg(i, "targetStr", fmt(practiceBests[s.id], false))}>use as target</button>
                </div>
              )}
              <textarea className="pn-textarea" placeholder={"One step per line…"} rows={3} value={s.notes} onChange={(e) => updateSeg(i, "notes", e.target.value)} />
              <div className="pn-seg-editor-actions">
                <button className="pn-mini-btn" onClick={() => moveSeg(i, -1)} disabled={i === 0}>↑</button>
                <button className="pn-mini-btn" onClick={() => moveSeg(i, 1)} disabled={i === segments.length - 1}>↓</button>
                <button className="pn-mini-btn pn-mini-btn-danger" onClick={() => removeSeg(i)} disabled={segments.length === 1}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="pn-btn pn-btn-ghost pn-btn-full" onClick={addSeg}>+ Add segment</button>

      {/* Sticky, not buried at the end of a long segment list — the whole
          point of this bar is that you shouldn't have to go looking for it. */}
      <div className="pn-btn-row pn-editor-actions" style={{ marginTop: 18 }}>
        <button className="pn-btn pn-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="pn-btn pn-btn-primary" disabled={!canSave} onClick={handleSave}>Save route</button>
      </div>
    </div>
  );
}

function toDuration(cumulativeSplits, i) {
  if (!cumulativeSplits || cumulativeSplits[i] == null) return null;
  return i === 0 ? cumulativeSplits[0] : cumulativeSplits[i] - cumulativeSplits[i - 1];
}

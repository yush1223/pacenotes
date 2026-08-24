import { useState } from "react";
import { uid } from "../lib/storage";
import { fmt, parseTargetInput } from "../lib/time";
import BackHead from "../components/BackHead";

// ---------- route editor ----------
export default function RouteEditor({ gameId, initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [targetStr, setTargetStr] = useState(initial?.target != null ? fmt(initial.target, false) : "");
  const [segments, setSegments] = useState(
    initial?.segments?.length
      ? initial.segments.map((s, i) => ({
          ...s,
          targetStr: initial.targets?.[i] != null ? fmt(initial.targets[i], false) : "",
        }))
      : [{ id: uid(), title: "", notes: "", targetStr: "" }]
  );

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
    const cleanSegs = kept.map((s) => ({ id: s.id, title: s.title.trim(), notes: s.notes || "" }));
    onSave({
      id: initial?.id || uid(),
      gameId,
      name: name.trim(),
      target: parseTargetInput(targetStr),
      segments: cleanSegs,
      pb: initial?.pb || null,
      targets: kept.map((s) => parseTargetInput(s.targetStr)),
    });
  };

  return (
    <div className="pn-view">
      <BackHead onBack={onCancel} eyebrow={initial ? "Edit route" : "New route"} title="Route editor" />
      <label className="pn-label">Route name</label>
      <input className="pn-input" placeholder="e.g. Any% — no major glitches" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="pn-label">Total target (optional)</label>
      <input className="pn-input pn-input-mono" placeholder="mm:ss or h:mm:ss — e.g. current WR" value={targetStr} onChange={(e) => setTargetStr(e.target.value)} />
      <label className="pn-label" style={{ marginTop: 18 }}>Segments</label>
      <div className="pn-hint" style={{ marginBottom: 10 }}>
        A per-segment target is optional — once you have a PB, that becomes the thing to chase automatically. Set a target for segments you don't have a PB pace for yet.
      </div>

      <div className="pn-seg-editor-list pn-stagger">
        {segments.map((s, i) => (
          <div className="pn-seg-editor-card" key={s.id}>
            <div className="pn-seg-editor-tab">{String(i + 1).padStart(2, "0")}</div>
            <div className="pn-seg-editor-body">
              <div className="pn-seg-editor-toprow">
                <input className="pn-input" placeholder="Segment title" value={s.title} onChange={(e) => updateSeg(i, "title", e.target.value)} />
                <input
                  className="pn-input pn-input-mono pn-seg-editor-target"
                  placeholder="target"
                  title="Optional target split time for this segment (mm:ss)"
                  value={s.targetStr}
                  onChange={(e) => updateSeg(i, "targetStr", e.target.value)}
                />
              </div>
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
      <div className="pn-btn-row" style={{ marginTop: 18 }}>
        <button className="pn-btn pn-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="pn-btn pn-btn-primary" disabled={!canSave} onClick={handleSave}>Save route</button>
      </div>
    </div>
  );
}

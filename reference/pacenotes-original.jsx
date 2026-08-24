import React, { useState, useEffect, useRef, useCallback } from "react";

// ---------- storage helpers ----------
async function getKey(key, fallback) {
  try {
    const r = await window.storage.get(key, false);
    return r ? JSON.parse(r.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function setKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
    return true;
  } catch (e) {
    console.error("storage set failed", key, e);
    return false;
  }
}
async function deleteKey(key) {
  try {
    await window.storage.delete(key, false);
  } catch (e) {}
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ---------- time helpers ----------
function fmt(ms, showTenths = true) {
  if (ms == null || isNaN(ms)) return "\u2014";
  const neg = ms < 0;
  ms = Math.abs(ms);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor((ms % 1000) / 100);
  let str = "";
  if (h > 0) str = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  else str = `${m}:${String(s).padStart(2, "0")}`;
  if (showTenths) str += `.${t}`;
  return (neg ? "-" : "") + str;
}
function fmtDelta(ms) {
  if (ms == null || isNaN(ms)) return null;
  const sign = ms > 0 ? "+" : ms < 0 ? "\u2212" : "";
  return sign + fmt(Math.abs(ms), true);
}
function parseTargetInput(str) {
  if (!str) return null;
  const parts = str.split(":").map((p) => parseFloat(p));
  if (parts.some((p) => isNaN(p))) return null;
  let ms = 0;
  if (parts.length === 3) ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  else if (parts.length === 2) ms = (parts[0] * 60 + parts[1]) * 1000;
  else if (parts.length === 1) ms = parts[0] * 1000;
  else return null;
  return ms;
}
function relTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function toDurations(cum) {
  return cum.map((c, i) => (i === 0 ? c : c - cum[i - 1]));
}
function computeBPT(gold) {
  if (!gold || gold.length === 0 || gold.some((g) => g == null)) return null;
  return gold.reduce((a, b) => a + b, 0);
}

// ---------- seed ----------
const SEED_ROUTE_ID = "seed-htf-any";
const SEED_GAME_ID = "seed-htf";
function seedSegments() {
  return [
    { id: uid(), title: "Crash Site", notes: "Get to shore, head straight for Lighthouse Island\nDon't backtrack for stray items" },
    { id: uid(), title: "Lighthouse Island", notes: "Collect clams, feed the guard\nGet to $60\nBuy Crab-Fishing Rod, Knife, Beer\nGive Beer to guard for the keys\nLeave immediately" },
    { id: uid(), title: "Islands 2\u20134", notes: "Only talk to quest-relevant NPCs\nComplete only the unlock quest per island\nBuy the minimum weapon + engine upgrade\nSkip: casino, Drip hunting, rare variants" },
    { id: uid(), title: "Volcano Island", notes: "Grab Footsnail en route to camp\nFeed Footsnail + Crab-Fishing Rod to NPC\nBuy inventory slot, Fishing Rod, Standard Lure\nCook-and-feed loop to $50 for Professional Lure\nFight and kill the whale boss" },
    { id: uid(), title: "Ending", notes: "Return Whale Fin to the scientist\nGet RHIB keys\nStart the RHIB \u2192 credits roll" },
  ];
}
function seedFakeRuns() {
  const base = [172000, 165000, 151000, 148000, 143000, 134000];
  const now = Date.now();
  return base.map((total, i) => {
    const cuts = [0.06, 0.28, 0.55, 0.82, 1].map((f) => Math.round(total * f));
    return { date: now - (base.length - i) * 86400000, total, segments: cuts };
  });
}

// ---------- root ----------
export default function Pacenotes() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [routesByGame, setRoutesByGame] = useState({});
  const [screen, setScreen] = useState("library");
  const [gameId, setGameId] = useState(null);
  const [routeId, setRouteId] = useState(null);
  const [editingRoute, setEditingRoute] = useState(null);
  const [editorReturn, setEditorReturn] = useState("game");
  const [toast, setToast] = useState(null);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    (async () => {
      let g = await getKey("pn_games", null);
      if (!g) {
        g = [{ id: SEED_GAME_ID, name: "How to Fish" }];
        await setKey("pn_games", g);
        await setKey(`pn_routes_${SEED_GAME_ID}`, [{ id: SEED_ROUTE_ID, name: "Any% \u2014 skip-heavy" }]);
        const runs = seedFakeRuns();
        const pbRun = runs.reduce((best, r) => (!best || r.total < best.total ? r : best), null);
        const gold = seedSegments().map((_, i) => {
          let best = null;
          for (const r of runs) {
            const durs = toDurations(r.segments);
            if (best == null || durs[i] < best) best = durs[i];
          }
          return best;
        });
        await setKey(`pn_route_${SEED_ROUTE_ID}`, {
          id: SEED_ROUTE_ID,
          gameId: SEED_GAME_ID,
          name: "Any% \u2014 skip-heavy",
          target: 11 * 60000 + 14000,
          segments: seedSegments(),
          pb: { segments: pbRun.segments, total: pbRun.total },
          gold,
        });
        await setKey(`pn_runs_${SEED_ROUTE_ID}`, runs.slice().reverse());
        await setKey("pn_total_runs", runs.length);
      }
      setGames(g);
      const rb = {};
      for (const game of g) rb[game.id] = await getKey(`pn_routes_${game.id}`, []);
      setRoutesByGame(rb);
      setLoading(false);
    })();
  }, []);

  const addGame = async (name) => {
    const newGame = { id: uid(), name };
    const g = [...games, newGame];
    setGames(g);
    await setKey("pn_games", g);
    await setKey(`pn_routes_${newGame.id}`, []);
    setRoutesByGame((prev) => ({ ...prev, [newGame.id]: [] }));
    return newGame.id;
  };

  const deleteGame = async (gId) => {
    const g = games.filter((x) => x.id !== gId);
    setGames(g);
    await setKey("pn_games", g);
    const routes = routesByGame[gId] || [];
    for (const r of routes) {
      await deleteKey(`pn_route_${r.id}`);
      await deleteKey(`pn_runs_${r.id}`);
    }
    await deleteKey(`pn_routes_${gId}`);
    flash("Game removed");
  };

  const saveRoute = async (route) => {
    const routes = routesByGame[route.gameId] || [];
    const exists = routes.some((r) => r.id === route.id);
    const newRoutes = exists
      ? routes.map((r) => (r.id === route.id ? { id: route.id, name: route.name } : r))
      : [...routes, { id: route.id, name: route.name }];
    await setKey(`pn_routes_${route.gameId}`, newRoutes);
    await setKey(`pn_route_${route.id}`, route);
    setRoutesByGame((prev) => ({ ...prev, [route.gameId]: newRoutes }));
    flash("Route saved");
  };

  const deleteRoute = async (route) => {
    const routes = (routesByGame[route.gameId] || []).filter((r) => r.id !== route.id);
    await setKey(`pn_routes_${route.gameId}`, routes);
    await deleteKey(`pn_route_${route.id}`);
    await deleteKey(`pn_runs_${route.id}`);
    setRoutesByGame((prev) => ({ ...prev, [route.gameId]: routes }));
    flash("Route deleted");
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-dim)" }}>Loading\u2026</div>
      </Shell>
    );
  }

  return (
    <Shell toast={toast}>
      {screen === "library" && (
        <Library
          games={games}
          routesByGame={routesByGame}
          onOpenGame={(id) => { setGameId(id); setScreen("game"); }}
          onAddGame={async (name) => { const id = await addGame(name); setGameId(id); setScreen("game"); }}
          onDeleteGame={deleteGame}
        />
      )}
      {screen === "game" && (
        <GameDetail
          game={games.find((g) => g.id === gameId)}
          routes={routesByGame[gameId] || []}
          onBack={() => setScreen("library")}
          onOpenRoute={(id) => { setRouteId(id); setScreen("route"); }}
          onNewRoute={() => { setEditingRoute(null); setEditorReturn("game"); setScreen("editor"); }}
        />
      )}
      {screen === "editor" && (
        <RouteEditor
          gameId={gameId}
          initial={editingRoute}
          onCancel={() => setScreen(editorReturn === "route" ? "route" : "game")}
          onSave={async (route) => { await saveRoute(route); setRouteId(route.id); setScreen("route"); }}
        />
      )}
      {screen === "route" && (
        <RouteDetail
          routeId={routeId}
          onBack={() => setScreen("game")}
          onEdit={(route) => { setEditingRoute(route); setEditorReturn("route"); setScreen("editor"); }}
          onDelete={async (route) => { await deleteRoute(route); setScreen("game"); }}
          onStartRun={() => setScreen("run")}
          onHistory={() => setScreen("history")}
        />
      )}
      {screen === "run" && (
        <RunScreen routeId={routeId} onExit={() => setScreen("route")} onFinished={() => flash("Run saved")} />
      )}
      {screen === "history" && <HistoryScreen routeId={routeId} onBack={() => setScreen("route")} />}
    </Shell>
  );
}

// ---------- shell ----------
function Shell({ children, toast }) {
  return (
    <div className="pn-app">
      <style>{CSS}</style>
      <div className="pn-frame">
        <div className="pn-content">{children}</div>
        {toast && <div className="pn-toast">{toast}</div>}
      </div>
    </div>
  );
}

// ---------- split-flap clock (signature element) ----------
function FlapClock({ text, size = "lg" }) {
  const chars = text.split("");
  return (
    <div className={"pn-flapclock pn-flapclock-" + size}>
      {chars.map((c, i) => (
        <span key={i} className={"pn-flap" + (/[0-9]/.test(c) ? "" : " pn-flap-punct")}>
          <span className="pn-flap-char">{c}</span>
          <span className="pn-flap-seam" />
        </span>
      ))}
    </div>
  );
}

// ---------- sparkline ----------
function Sparkline({ values, width = 60, height = 22 }) {
  if (!values || values.length < 2) return <span className="pn-spark-empty">no trend yet</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - ((v - min) / range) * height]);
  const trendGood = values[values.length - 1] <= values[0];
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className="pn-spark">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={trendGood ? "var(--good)" : "var(--bad)"} strokeWidth="1.4" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={trendGood ? "var(--good)" : "var(--bad)"} />
    </svg>
  );
}

// ---------- library ----------
function Library({ games, routesByGame, onOpenGame, onAddGame, onDeleteGame }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [totalRuns, setTotalRuns] = useState(0);
  const [gameStats, setGameStats] = useState({});

  useEffect(() => {
    (async () => {
      setTotalRuns(await getKey("pn_total_runs", 0));
      const stats = {};
      for (const g of games) {
        const routes = routesByGame[g.id] || [];
        let bestPb = null;
        for (const r of routes) {
          const full = await getKey(`pn_route_${r.id}`, null);
          if (full?.pb && (bestPb == null || full.pb.total < bestPb)) bestPb = full.pb.total;
        }
        stats[g.id] = { routeCount: routes.length, bestPb };
      }
      setGameStats(stats);
    })();
  }, [games, routesByGame]);

  return (
    <div className="pn-view">
      <div className="pn-masthead">
        <div className="pn-masthead-mark">PACE\u2007NOTES</div>
        <div className="pn-masthead-rule" />
        <div className="pn-masthead-readout">
          {String(games.length).padStart(2, "0")} GAMES LOGGED \u00b7 {String(totalRuns).padStart(3, "0")} RUNS RECORDED
        </div>
      </div>

      {games.length === 0 && <div className="pn-empty">No games yet. Add the one you're running.</div>}

      <div className="pn-ledger">
        {games.map((g, i) => {
          const st = gameStats[g.id] || {};
          return (
            <div className="pn-ledger-row" key={g.id} onClick={() => onOpenGame(g.id)}>
              <span className="pn-ledger-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-ledger-main">
                <span className="pn-ledger-title">{g.name}</span>
                <span className="pn-ledger-sub">
                  {st.routeCount ?? 0} route{st.routeCount === 1 ? "" : "s"}
                  {st.bestPb != null && <> \u00b7 best <span className="pn-brass-text">{fmt(st.bestPb, false)}</span></>}
                </span>
              </span>
              <button
                className="pn-x"
                onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${g.name}" and all its routes?`)) onDeleteGame(g.id); }}
                aria-label="Delete game"
              >
                \u2715
              </button>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div className="pn-inline-form">
          <input
            className="pn-input"
            autoFocus
            placeholder="Game name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) { onAddGame(name.trim()); setName(""); setAdding(false); }
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <button className="pn-btn pn-btn-primary" onClick={() => { if (name.trim()) { onAddGame(name.trim()); setName(""); setAdding(false); } }}>Add</button>
          <button className="pn-btn pn-btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button className="pn-btn pn-btn-primary pn-btn-full" onClick={() => setAdding(true)}>+ Log a game</button>
      )}
    </div>
  );
}

// ---------- game detail ----------
function GameDetail({ game, routes, onBack, onOpenRoute, onNewRoute }) {
  const [details, setDetails] = useState({});

  useEffect(() => {
    (async () => {
      const d = {};
      for (const r of routes) {
        const full = await getKey(`pn_route_${r.id}`, null);
        const runs = await getKey(`pn_runs_${r.id}`, []);
        d[r.id] = { full, runs };
      }
      setDetails(d);
    })();
  }, [routes]);

  if (!game) return null;
  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Game" title={game.name} />
      {routes.length === 0 && <div className="pn-empty">No routes yet for {game.name}.</div>}

      <div className="pn-ledger pn-ledger-wide">
        {routes.map((r, i) => {
          const d = details[r.id];
          const bpt = d?.full ? computeBPT(d.full.gold) : null;
          const sparkVals = d?.runs?.length ? d.runs.slice(0, 8).reverse().map((x) => x.total) : null;
          return (
            <div className="pn-ledger-row pn-ledger-row-tall" key={r.id} onClick={() => onOpenRoute(r.id)}>
              <span className="pn-ledger-idx">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-ledger-main">
                <span className="pn-ledger-title">{r.name}</span>
                <div className="pn-instrument-row">
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">pb</span>
                    <span className="pn-mono pn-brass-text">{d?.full?.pb ? fmt(d.full.pb.total, false) : "\u2014"}</span>
                  </div>
                  <div className="pn-instrument-divider" />
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">bpt</span>
                    <span className="pn-mono">{bpt != null ? fmt(bpt, false) : "\u2014"}</span>
                  </div>
                  <div className="pn-instrument-divider" />
                  <div className="pn-instrument">
                    <span className="pn-instrument-label">runs</span>
                    <span className="pn-mono">{d?.runs?.length ?? 0}</span>
                  </div>
                </div>
              </span>
              <Sparkline values={sparkVals} />
            </div>
          );
        })}
      </div>

      <button className="pn-btn pn-btn-primary pn-btn-full" onClick={onNewRoute}>+ New route</button>
    </div>
  );
}

// ---------- route editor ----------
function RouteEditor({ gameId, initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [targetStr, setTargetStr] = useState(initial?.target != null ? fmt(initial.target, false) : "");
  const [segments, setSegments] = useState(
    initial?.segments?.length ? initial.segments.map((s) => ({ ...s })) : [{ id: uid(), title: "", notes: "" }]
  );

  const updateSeg = (idx, field, val) => setSegments((segs) => segs.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  const addSeg = () => setSegments((segs) => [...segs, { id: uid(), title: "", notes: "" }]);
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
    const cleanSegs = segments.filter((s) => s.title.trim()).map((s) => ({ id: s.id, title: s.title.trim(), notes: s.notes || "" }));
    onSave({
      id: initial?.id || uid(),
      gameId,
      name: name.trim(),
      target: parseTargetInput(targetStr),
      segments: cleanSegs,
      pb: initial?.pb || null,
      gold: initial?.gold || cleanSegs.map(() => null),
    });
  };

  return (
    <div className="pn-view">
      <BackHead onBack={onCancel} eyebrow={initial ? "Edit route" : "New route"} title="Route editor" />
      <label className="pn-label">Route name</label>
      <input className="pn-input" placeholder="e.g. Any% \u2014 no major glitches" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="pn-label">Target time (optional)</label>
      <input className="pn-input pn-input-mono" placeholder="mm:ss or h:mm:ss \u2014 e.g. current WR" value={targetStr} onChange={(e) => setTargetStr(e.target.value)} />
      <label className="pn-label" style={{ marginTop: 18 }}>Segments</label>

      <div className="pn-seg-editor-list">
        {segments.map((s, i) => (
          <div className="pn-seg-editor-card" key={s.id}>
            <div className="pn-seg-editor-tab">{String(i + 1).padStart(2, "0")}</div>
            <div className="pn-seg-editor-body">
              <input className="pn-input" placeholder="Segment title" value={s.title} onChange={(e) => updateSeg(i, "title", e.target.value)} />
              <textarea className="pn-textarea" placeholder={"One step per line\u2026"} rows={3} value={s.notes} onChange={(e) => updateSeg(i, "notes", e.target.value)} />
              <div className="pn-seg-editor-actions">
                <button className="pn-mini-btn" onClick={() => moveSeg(i, -1)} disabled={i === 0}>\u2191</button>
                <button className="pn-mini-btn" onClick={() => moveSeg(i, 1)} disabled={i === segments.length - 1}>\u2193</button>
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

// ---------- route detail (roadbook) ----------
function RouteDetail({ routeId, onBack, onEdit, onDelete, onStartRun, onHistory }) {
  const [route, setRoute] = useState(null);
  useEffect(() => { (async () => setRoute(await getKey(`pn_route_${routeId}`, null)))(); }, [routeId]);
  if (!route) return <div className="pn-view">Loading\u2026</div>;

  const bpt = computeBPT(route.gold);
  const pbDurations = route.pb ? toDurations(route.pb.segments) : null;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="Route" title={route.name} />

      <div className="pn-gauge-panel">
        <div className="pn-gauge">
          <span className="pn-gauge-label">target</span>
          <span className="pn-mono pn-gauge-value">{route.target != null ? fmt(route.target, false) : "\u2014"}</span>
        </div>
        <div className="pn-gauge-divider" />
        <div className="pn-gauge">
          <span className="pn-gauge-label">personal best</span>
          <span className="pn-mono pn-gauge-value pn-brass-text">{route.pb ? fmt(route.pb.total, false) : "\u2014"}</span>
        </div>
        <div className="pn-gauge-divider" />
        <div className="pn-gauge">
          <span className="pn-gauge-label">best possible</span>
          <span className="pn-mono pn-gauge-value">{bpt != null ? fmt(bpt, false) : "\u2014"}</span>
        </div>
      </div>

      <div className="pn-btn-row">
        <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} onClick={onStartRun}>\u25B6 Start run</button>
        <button className="pn-btn pn-btn-ghost" onClick={() => onEdit(route)}>Edit</button>
      </div>
      <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} onClick={onHistory}>Run history</button>

      <label className="pn-label" style={{ marginTop: 22 }}>Roadbook</label>
      <div className="pn-roadbook">
        {route.segments.map((s, i) => (
          <div className="pn-roadbook-row" key={s.id}>
            <div className="pn-roadbook-scale">
              <span className="pn-roadbook-tick" />
              <span className="pn-roadbook-num">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="pn-roadbook-content">
              <div className="pn-roadbook-title-row">
                <div className="pn-roadbook-title">{s.title}</div>
                <div className="pn-roadbook-times">
                  {route.gold && route.gold[i] != null && <span className="pn-bracket pn-brass-text">gold {fmt(route.gold[i], false)}</span>}
                  {pbDurations && <span className="pn-bracket">pb {fmt(pbDurations[i], false)}</span>}
                </div>
              </div>
              {s.notes && (
                <ul className="pn-note-steps">
                  {s.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        className="pn-btn pn-btn-danger-ghost pn-btn-full"
        style={{ marginTop: 22 }}
        onClick={() => { if (confirm(`Delete route "${route.name}"? This can't be undone.`)) onDelete(route); }}
      >
        Delete route
      </button>
    </div>
  );
}

// ---------- live delta graph (oscilloscope panel) ----------
function DeltaGraph({ pointsDelta, height = 72 }) {
  if (!pointsDelta || pointsDelta.length === 0) {
    return <div className="pn-scope-empty">graph engages once a pb exists to race against</div>;
  }
  const width = 400;
  const maxAbs = Math.max(2000, ...pointsDelta.map((d) => Math.abs(d)));
  const n = pointsDelta.length;
  const xFor = (i) => (n === 1 ? width / 2 : (i / (n - 1)) * width);
  const yFor = (d) => height / 2 - (d / maxAbs) * (height / 2 - 6);
  const pts = pointsDelta.map((d, i) => [xFor(i), yFor(d)]);
  const last = pointsDelta[pointsDelta.length - 1];
  return (
    <div className="pn-scope">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="pn-scope-svg">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} stroke="var(--hairline)" strokeWidth="1" />
        ))}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="2 4" />
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={last > 0 ? "var(--bad)" : "var(--good)"} strokeWidth="1.8" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.6" fill={pointsDelta[i] > 0 ? "var(--bad)" : "var(--good)"} />
        ))}
      </svg>
      <div className="pn-scope-caption">pace vs personal best</div>
    </div>
  );
}

// ---------- pace note roller (signature element) ----------
function PaceRoller({ segments, currentIdx }) {
  const itemHeight = 34;
  const visibleWindow = 3;
  const offset = -(currentIdx * itemHeight) + visibleWindow * itemHeight;

  return (
    <div className="pn-roller">
      <div className="pn-roller-window">
        <div className="pn-roller-strip" style={{ transform: `translateY(${offset}px)` }}>
          {Array.from({ length: visibleWindow }).map((_, i) => (
            <div className="pn-roller-item pn-roller-pad" key={"pad-top-" + i} />
          ))}
          {segments.map((s, i) => (
            <div
              key={s.id}
              className={
                "pn-roller-item" +
                (i === currentIdx ? " pn-roller-current" : i < currentIdx ? " pn-roller-done" : " pn-roller-upcoming")
              }
            >
              <span className="pn-roller-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pn-roller-text">{s.title}</span>
            </div>
          ))}
          {Array.from({ length: visibleWindow }).map((_, i) => (
            <div className="pn-roller-item pn-roller-pad" key={"pad-bot-" + i} />
          ))}
        </div>
        <div className="pn-roller-readline" />
      </div>
    </div>
  );
}

// ---------- run screen ----------
function RunScreen({ routeId, onExit, onFinished }) {
  const [route, setRoute] = useState(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [splits, setSplits] = useState([]);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => { (async () => setRoute(await getKey(`pn_route_${routeId}`, null)))(); }, [routeId]);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggleRun = () => {
    if (!running) {
      startRef.current = performance.now() - elapsed;
      setRunning(true);
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setRunning(false);
      cancelAnimationFrame(rafRef.current);
    }
  };

  const reset = () => {
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    setElapsed(0);
    setSegIdx(0);
    setSplits([]);
    setFinished(false);
    startRef.current = null;
  };

  const doSplit = async () => {
    if (!running || !route) return;
    const now = performance.now() - startRef.current;
    const newSplits = [...splits, now];
    setSplits(newSplits);

    if (segIdx + 1 >= route.segments.length) {
      setRunning(false);
      cancelAnimationFrame(rafRef.current);
      setFinished(true);

      const total = now;
      const durations = toDurations(newSplits);
      const prevGold = route.gold || route.segments.map(() => null);
      const newGold = prevGold.map((g, i) => (g == null || durations[i] < g ? durations[i] : g));
      const isNewPB = !route.pb || total < route.pb.total;
      const updatedRoute = { ...route, gold: newGold, pb: isNewPB ? { segments: newSplits, total } : route.pb };
      await setKey(`pn_route_${route.id}`, updatedRoute);
      setRoute(updatedRoute);

      const runs = await getKey(`pn_runs_${route.id}`, []);
      await setKey(`pn_runs_${route.id}`, [{ date: Date.now(), total, segments: newSplits }, ...runs].slice(0, 25));
      const tr = await getKey("pn_total_runs", 0);
      await setKey("pn_total_runs", tr + 1);
      onFinished();
    } else {
      setSegIdx(segIdx + 1);
    }
  };

  if (!route) return <div className="pn-view">Loading\u2026</div>;

  const pbAtSplit = (i) => (route.pb && route.pb.segments[i] != null ? route.pb.segments[i] : null);
  const currentSeg = route.segments[segIdx];
  const deltaSeries = splits.map((s, i) => (pbAtSplit(i) != null ? s - pbAtSplit(i) : null)).filter((d) => d != null);
  const lastDelta = deltaSeries.length ? deltaSeries[deltaSeries.length - 1] : null;

  return (
    <div className="pn-view">
      <BackHead
        onBack={() => { if (running && !confirm("Run in progress \u2014 leave and lose it?")) return; onExit(); }}
        eyebrow="Run"
        title={route.name}
      />

      <div className="pn-clockbox">
        <FlapClock text={fmt(elapsed)} />
        {route.target != null && (
          <div className="pn-clock-vs">
            target {fmt(route.target, false)}
            {elapsed > 0 && <span className={elapsed - route.target > 0 ? "pn-bad" : "pn-good"}> ({fmtDelta(elapsed - route.target)})</span>}
          </div>
        )}
      </div>

      {!finished ? (
        <>
          <PaceRoller segments={route.segments} currentIdx={segIdx} />

          {currentSeg.notes && (
            <ul className="pn-note-steps pn-note-steps-run">
              {currentSeg.notes.split("\n").filter(Boolean).map((line, j) => <li key={j}>{line}</li>)}
            </ul>
          )}

          {lastDelta != null && (
            <div className={"pn-delta-readout " + (lastDelta > 0 ? "pn-bad" : "pn-good")}>
              {lastDelta > 0 ? "behind pb pace \u2192 " : "ahead of pb pace \u2192 "}{fmtDelta(lastDelta)}
            </div>
          )}

          <DeltaGraph pointsDelta={deltaSeries.length ? deltaSeries : null} />

          <div className="pn-btn-row" style={{ marginTop: 14 }}>
            <button className="pn-btn pn-btn-ghost" onClick={toggleRun}>{running ? "Pause" : elapsed === 0 ? "Start" : "Resume"}</button>
            <button className="pn-btn pn-btn-primary" style={{ flex: 2 }} onClick={doSplit} disabled={!running}>
              Split \u2192 {segIdx + 1 >= route.segments.length ? "Finish" : "next"}
            </button>
          </div>
          <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 8 }} onClick={reset}>Reset run</button>
        </>
      ) : (
        <RunSummary route={route} splits={splits} onReset={reset} onExit={onExit} />
      )}
    </div>
  );
}

function RunSummary({ route, splits, onReset, onExit }) {
  const total = splits[splits.length - 1];
  const isPB = route.pb && route.pb.total === total;
  const durations = toDurations(splits);
  const bpt = computeBPT(route.gold);
  const deltaSeries = route.pb ? splits.map((s, i) => s - (isPB ? (route.pb.segments[i] ?? s) : route.pb.segments[i])) : [];

  return (
    <div>
      <div className={"pn-result-panel" + (isPB ? " pn-result-pb" : "")}>
        <div className="pn-result-label">{isPB ? "\u2605 new personal best" : "run complete"}</div>
        <FlapClock text={fmt(total, false)} size="md" />
        {bpt != null && <div className="pn-result-sub">{fmtDelta(total - bpt)} off best possible time ({fmt(bpt, false)})</div>}
      </div>

      {!isPB && deltaSeries.length > 0 && <DeltaGraph pointsDelta={deltaSeries} />}

      <table className="pn-split-table">
        <thead>
          <tr><th>#</th><th>Segment</th><th>Split</th><th>Gold</th><th>Pb\u0394</th></tr>
        </thead>
        <tbody>
          {route.segments.map((s, i) => {
            const segTime = durations[i];
            const isGold = route.gold && route.gold[i] === segTime;
            const pbCum = route.pb && !isPB ? route.pb.segments[i] : null;
            const delta = pbCum != null ? splits[i] - pbCum : null;
            return (
              <tr key={s.id}>
                <td className="pn-ink-dim">{i + 1}</td>
                <td>{s.title}</td>
                <td className={"pn-mono" + (isGold ? " pn-brass-text" : "")}>{fmt(segTime, false)}{isGold && " \u2605"}</td>
                <td className="pn-mono pn-ink-dim">{route.gold?.[i] != null ? fmt(route.gold[i], false) : "\u2014"}</td>
                <td className={"pn-mono " + (delta == null ? "" : delta > 0 ? "pn-bad" : "pn-good")}>{delta == null ? "\u2014" : fmtDelta(delta)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pn-btn-row" style={{ marginTop: 16 }}>
        <button className="pn-btn pn-btn-ghost" onClick={onReset}>Run again</button>
        <button className="pn-btn pn-btn-primary" onClick={onExit}>Done</button>
      </div>
    </div>
  );
}

// ---------- history ----------
function HistoryScreen({ routeId, onBack }) {
  const [route, setRoute] = useState(null);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    (async () => {
      setRoute(await getKey(`pn_route_${routeId}`, null));
      setRuns(await getKey(`pn_runs_${routeId}`, []));
    })();
  }, [routeId]);

  if (!route) return <div className="pn-view">Loading\u2026</div>;
  const trendVals = runs.length > 1 ? runs.slice().reverse().map((r) => r.total) : null;

  return (
    <div className="pn-view">
      <BackHead onBack={onBack} eyebrow="History" title={route.name} />
      {trendVals && (
        <div className="pn-scope" style={{ marginBottom: 18 }}>
          <svg viewBox="0 0 340 64" className="pn-scope-svg" preserveAspectRatio="none">
            {(() => {
              const min = Math.min(...trendVals);
              const max = Math.max(...trendVals);
              const range = max - min || 1;
              const pts = trendVals.map((v, i) => [
                (i / (trendVals.length - 1)) * 340,
                64 - ((v - min) / range) * 54 - 5,
              ]);
              const improving = trendVals[trendVals.length - 1] <= trendVals[0];
              return (
                <>
                  {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" y1={64 * f} x2="340" y2={64 * f} stroke="var(--hairline)" strokeWidth="1" />)}
                  <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={improving ? "var(--good)" : "var(--bad)"} strokeWidth="1.8" />
                  {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill={improving ? "var(--good)" : "var(--bad)"} />)}
                </>
              );
            })()}
          </svg>
          <div className="pn-scope-caption">total time trend, oldest \u2192 newest</div>
        </div>
      )}
      {runs.length === 0 ? (
        <div className="pn-empty">No runs logged yet. Finish a run to see it here.</div>
      ) : (
        <div className="pn-ledger">
          {runs.map((run, i) => {
            const isPB = route.pb && route.pb.total === run.total;
            return (
              <div className="pn-ledger-row pn-ledger-row-static" key={i}>
                <span className={"pn-ledger-idx" + (isPB ? " pn-brass-text" : "")}>{isPB ? "\u2605" : String(runs.length - i).padStart(2, "0")}</span>
                <span className="pn-ledger-main">
                  <span className="pn-ledger-title pn-mono">{fmt(run.total, false)}{isPB && <span className="pn-brass-text"> \u2014 PB</span>}</span>
                  <span className="pn-ledger-sub">{relTime(run.date)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- shared ----------
function BackHead({ onBack, eyebrow, title }) {
  return (
    <div className="pn-view-head">
      <button className="pn-back" onClick={onBack}>\u2039 back</button>
      <div className="pn-eyebrow">{eyebrow}</div>
      <div className="pn-h1">{title}</div>
    </div>
  );
}

// ---------- styles ----------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');

.pn-app {
  --bg: #060607;
  --panel: #0E0F11;
  --metal-1: #1A1B1E;
  --metal-2: #101113;
  --hairline: #26282C;
  --ink: #ECEDEE;
  --ink-dim: #74777D;
  --good: #3FCB86;
  --bad: #FF5A5F;
  --brass: #D8A94E;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
  background: var(--bg);
  display: flex;
  justify-content: center;
}
.pn-frame { width: 100%; max-width: 460px; min-height: 100%; padding-bottom: 24px; position: relative; }
.pn-content { padding: 20px 16px 8px; }

.pn-masthead { margin-bottom: 20px; }
.pn-masthead-mark { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 15px; letter-spacing: 0.22em; color: var(--ink); }
.pn-masthead-rule { height: 1px; background: linear-gradient(90deg, var(--hairline), transparent); margin: 10px 0 8px; }
.pn-masthead-readout { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.06em; color: var(--ink-dim); }

.pn-view-head { margin-bottom: 18px; }
.pn-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 4px; }
.pn-h1 { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 22px; line-height: 1.15; }
.pn-back { background: none; border: none; color: var(--ink-dim); font-size: 12.5px; font-family: 'JetBrains Mono', monospace; padding: 0; margin-bottom: 12px; cursor: pointer; }
.pn-back:hover { color: var(--ink); }

.pn-empty { color: var(--ink-dim); font-size: 13.5px; padding: 18px 0; line-height: 1.5; }

.pn-ledger { margin-bottom: 16px; }
.pn-ledger-row {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 4px; border-bottom: 1px solid var(--hairline);
  cursor: pointer; transition: background 0.12s, padding-left 0.12s;
}
.pn-ledger-row:hover { background: rgba(255,255,255,0.02); padding-left: 8px; }
.pn-ledger-row-static { cursor: default; }
.pn-ledger-row-static:hover { background: none; padding-left: 4px; }
.pn-ledger-row-tall { align-items: flex-start; padding: 15px 4px; }
.pn-ledger-idx { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink-dim); width: 20px; flex-shrink: 0; }
.pn-ledger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pn-ledger-title { font-weight: 600; font-size: 14.5px; }
.pn-ledger-sub { font-size: 11.5px; color: var(--ink-dim); }
.pn-ledger-wide .pn-ledger-row { align-items: center; }

.pn-x { background: none; border: none; color: var(--ink-dim); font-size: 12px; padding: 4px 6px; cursor: pointer; flex-shrink: 0; }
.pn-x:hover { color: var(--bad); }

.pn-instrument-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.pn-instrument { display: flex; flex-direction: column; gap: 1px; }
.pn-instrument-label { font-family: 'JetBrains Mono', monospace; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-dim); }
.pn-instrument-divider { width: 1px; height: 18px; background: var(--hairline); }

.pn-brass-text { color: var(--brass); }
.pn-good { color: var(--good); }
.pn-bad { color: var(--bad); }
.pn-mono { font-family: 'JetBrains Mono', monospace; }
.pn-ink-dim { color: var(--ink-dim); }
.pn-spark { display: block; flex-shrink: 0; }
.pn-spark-empty { font-size: 9.5px; color: var(--ink-dim); font-family: 'JetBrains Mono', monospace; }

.pn-label { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; color: var(--ink-dim); text-transform: uppercase; margin: 14px 0 6px; }
.pn-input, .pn-textarea {
  width: 100%; background: var(--panel); border: 1px solid var(--hairline); border-radius: 3px; color: var(--ink);
  font-family: 'Inter', sans-serif; font-size: 14px; padding: 10px 11px; box-sizing: border-box; outline: none;
}
.pn-input:focus, .pn-textarea:focus { border-color: var(--ink-dim); }
.pn-input-mono { font-family: 'JetBrains Mono', monospace; }
.pn-textarea { resize: vertical; margin-top: 6px; line-height: 1.5; }
.pn-inline-form { display: flex; gap: 8px; margin-top: 4px; }
.pn-inline-form .pn-input { flex: 1; }

.pn-btn {
  font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 13px; letter-spacing: 0.02em;
  padding: 11px 14px; border-radius: 3px; cursor: pointer; transition: transform 0.08s, opacity 0.15s, filter 0.1s;
  border: 1px solid var(--hairline);
}
.pn-btn:active { transform: scale(0.98); }
.pn-btn:disabled { opacity: 0.35; cursor: default; }
.pn-btn-full { width: 100%; }
.pn-btn-row { display: flex; gap: 8px; }
.pn-btn-row .pn-btn { flex: 1; }
.pn-btn-primary { background: linear-gradient(180deg, var(--metal-1), var(--metal-2)); color: var(--ink); border-color: #3A3C41; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
.pn-btn-primary:hover:not(:disabled) { filter: brightness(1.15); }
.pn-btn-ghost { background: var(--panel); color: var(--ink-dim); }
.pn-btn-ghost:hover { color: var(--ink); }
.pn-btn-danger-ghost { background: transparent; color: var(--bad); border-color: rgba(255,90,95,0.3); }

.pn-mini-btn { background: var(--panel); border: 1px solid var(--hairline); color: var(--ink-dim); border-radius: 3px; font-size: 11px; font-family: 'JetBrains Mono', monospace; padding: 5px 9px; cursor: pointer; }
.pn-mini-btn:disabled { opacity: 0.3; }
.pn-mini-btn-danger { color: var(--bad); margin-left: auto; }
.pn-seg-editor-actions { display: flex; gap: 6px; margin-top: 8px; }
.pn-seg-editor-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.pn-seg-editor-card { display: flex; background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; overflow: hidden; }
.pn-seg-editor-tab { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 13px; color: var(--ink-dim); width: 30px; flex-shrink: 0; display: flex; align-items: flex-start; justify-content: center; padding-top: 12px; border-right: 1px solid var(--hairline); }
.pn-seg-editor-body { flex: 1; padding: 10px; min-width: 0; }

.pn-gauge-panel { display: flex; align-items: center; background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; padding: 12px 8px; margin-bottom: 16px; }
.pn-gauge { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pn-gauge-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-dim); }
.pn-gauge-value { font-size: 15px; }
.pn-gauge-divider { width: 1px; align-self: stretch; background: var(--hairline); }

.pn-roadbook { display: flex; flex-direction: column; }
.pn-roadbook-row { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--hairline); }
.pn-roadbook-row:last-child { border-bottom: none; }
.pn-roadbook-scale { display: flex; flex-direction: column; align-items: center; width: 22px; flex-shrink: 0; padding-top: 2px; }
.pn-roadbook-tick { width: 10px; height: 1px; background: var(--ink-dim); margin-bottom: 4px; }
.pn-roadbook-num { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--ink-dim); }
.pn-roadbook-content { flex: 1; min-width: 0; }
.pn-roadbook-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.pn-roadbook-title { font-weight: 600; font-size: 15.5px; }
.pn-roadbook-times { display: flex; gap: 10px; }
.pn-bracket { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--ink-dim); border-bottom: 1px solid var(--hairline); padding-bottom: 1px; }
.pn-note-steps { margin: 7px 0 0; padding-left: 15px; font-size: 12.5px; color: var(--ink-dim); line-height: 1.65; }
.pn-note-steps li { margin-bottom: 1px; }
.pn-note-steps-run { background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; padding: 12px 14px 12px 26px; margin: 12px 0; }

.pn-clockbox { text-align: center; padding: 16px 0 6px; }
.pn-flapclock { display: inline-flex; gap: 3px; }
.pn-flap { position: relative; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #1D1E21, #0C0D0E); border: 1px solid #2E3034; border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.5); overflow: hidden; }
.pn-flapclock-lg .pn-flap { width: 34px; height: 52px; }
.pn-flapclock-md .pn-flap { width: 24px; height: 38px; }
.pn-flap-punct { background: transparent; border: none; box-shadow: none; width: 12px !important; }
.pn-flapclock-lg .pn-flap-char { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 30px; color: #F4F1E8; }
.pn-flapclock-md .pn-flap-char { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 21px; color: #F4F1E8; }
.pn-flap-seam { position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: rgba(0,0,0,0.55); }
.pn-flap-punct .pn-flap-seam { display: none; }
.pn-flap-punct .pn-flap-char { color: var(--ink-dim); font-size: 22px; }
.pn-clock-vs { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: var(--ink-dim); margin-top: 8px; }

.pn-roller { margin: 18px 0 4px; }
.pn-roller-window { position: relative; height: 238px; overflow: hidden; background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; }
.pn-roller-window::before, .pn-roller-window::after { content: ""; position: absolute; left: 0; right: 0; height: 60px; z-index: 2; pointer-events: none; }
.pn-roller-window::before { top: 0; background: linear-gradient(180deg, var(--panel), transparent); }
.pn-roller-window::after { bottom: 0; background: linear-gradient(0deg, var(--panel), transparent); }
.pn-roller-strip { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
.pn-roller-item { height: 34px; display: flex; align-items: center; gap: 10px; padding: 0 16px; }
.pn-roller-pad { height: 34px; }
.pn-roller-num { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--ink-dim); width: 18px; flex-shrink: 0; }
.pn-roller-text { font-size: 13px; }
.pn-roller-done { opacity: 0.32; text-decoration: line-through; text-decoration-color: var(--hairline); }
.pn-roller-upcoming { opacity: 0.4; }
.pn-roller-current { font-weight: 700; font-size: 16px; }
.pn-roller-current .pn-roller-text { font-size: 16px; }
.pn-roller-readline { position: absolute; left: 0; right: 0; top: 50%; height: 34px; margin-top: -17px; border-top: 1px solid var(--bad); border-bottom: 1px solid var(--bad); background: rgba(255,90,95,0.05); z-index: 1; pointer-events: none; }

.pn-delta-readout { text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; padding: 8px 0; border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); margin-bottom: 12px; }

.pn-scope { background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; padding: 10px 10px 8px; margin-bottom: 6px; }
.pn-scope-svg { width: 100%; height: 72px; display: block; }
.pn-scope-caption { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: var(--ink-dim); text-align: center; margin-top: 4px; letter-spacing: 0.04em; }
.pn-scope-empty { font-size: 11px; color: var(--ink-dim); font-family: 'JetBrains Mono', monospace; text-align: center; padding: 28px 10px; background: var(--panel); border: 1px dashed var(--hairline); border-radius: 4px; margin-bottom: 6px; }

.pn-result-panel { text-align: center; padding: 20px; background: var(--panel); border: 1px solid var(--hairline); border-radius: 4px; margin-bottom: 14px; }
.pn-result-label { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 10px; }
.pn-result-pb .pn-result-label { color: var(--brass); }
.pn-result-sub { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-dim); margin-top: 10px; }

.pn-split-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
.pn-split-table th { text-align: left; color: var(--ink-dim); font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px; border-bottom: 1px solid var(--hairline); }
.pn-split-table td { padding: 7px 6px; border-bottom: 1px solid var(--hairline); }
.pn-split-table tr:last-child td { border-bottom: none; }

.pn-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--metal-1); border: 1px solid var(--hairline); color: var(--ink); padding: 9px 16px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.5); z-index: 50; }
`;

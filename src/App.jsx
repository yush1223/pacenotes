import { useState, useEffect } from "react";
import { getKey, setKey, deleteKey, uid } from "./lib/storage";
import { toDurations } from "./lib/time";
import { SEED_ROUTE_ID, SEED_GAME_ID, seedSegments, seedFakeRuns } from "./lib/seed";
import { getSession, onAuthStateChange, signOut } from "./lib/auth";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import Library from "./screens/Library";
import GameDetail from "./screens/GameDetail";
import RouteEditor from "./screens/RouteEditor";
import RouteDetail from "./screens/RouteDetail";
import RunScreen from "./screens/RunScreen";
import HistoryScreen from "./screens/HistoryScreen";

// ---------- root ----------
export default function App() {
  // undefined = still checking for a session, null = signed out.
  // NOTE: the data below this point is still the old localStorage layer,
  // shared by whichever browser profile has it — not yet scoped per
  // account. That's the next phase (games/routes/runs moving to
  // Supabase); this phase is just the account gate in front of the app.
  const [session, setSession] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [routesByGame, setRoutesByGame] = useState({});
  const [totalRuns, setTotalRuns] = useState(0);
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
    getSession().then(setSession);
    const sub = onAuthStateChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      let g = await getKey("pn_games", null);
      if (!g) {
        g = [{ id: SEED_GAME_ID, name: "How to Fish" }];
        await setKey("pn_games", g);
        await setKey(`pn_routes_${SEED_GAME_ID}`, [{ id: SEED_ROUTE_ID, name: "Any% — skip-heavy" }]);
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
          name: "Any% — skip-heavy",
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
      setTotalRuns(await getKey("pn_total_runs", 0));
      if (g.length > 0) {
        setGameId(g[0].id);
        setScreen("game");
      }
      setLoading(false);
    })();
  }, [session]);

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
    if (gameId === gId) {
      setGameId(g[0]?.id ?? null);
      setScreen(g.length ? "game" : "library");
    }
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

  const sidebarProps = {
    games,
    activeGameId: screen === "library" ? null : gameId,
    totalRuns,
    onHome: () => setScreen("library"),
    onSelectGame: (id) => { setGameId(id); setScreen("game"); },
    onAddGame: async (name) => { const id = await addGame(name); setGameId(id); setScreen("game"); },
    onDeleteGame: deleteGame,
    userEmail: session?.user?.email,
    onSignOut: signOut,
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--ink-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (loading) {
    return (
      <Shell sidebarProps={{ games: [], activeGameId: null, totalRuns: 0, onHome() {}, onSelectGame() {}, onAddGame() {}, onDeleteGame() {} }}>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-dim)" }}>Loading…</div>
      </Shell>
    );
  }

  const wide = screen === "run" || screen === "route" || screen === "game" || screen === "library";

  return (
    <Shell toast={toast} sidebarProps={sidebarProps} wide={wide}>
      {screen === "library" && (
        <Library
          games={games}
          routesByGame={routesByGame}
          totalRuns={totalRuns}
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
        <RunScreen
          routeId={routeId}
          onExit={() => setScreen("route")}
          onFinished={() => { setTotalRuns((n) => n + 1); flash("Run saved"); }}
        />
      )}
      {screen === "history" && <HistoryScreen routeId={routeId} onBack={() => setScreen("route")} />}
    </Shell>
  );
}

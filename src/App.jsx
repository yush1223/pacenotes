import { useState, useEffect, useCallback } from "react";
import { getSession, onAuthStateChange, signOut } from "./lib/auth";
import * as db from "./lib/db";
import Shell from "./components/Shell";
import AuthScreen from "./screens/AuthScreen";
import Library from "./screens/Library";
import GameDetail from "./screens/GameDetail";
import RouteEditor from "./screens/RouteEditor";
import RouteDetail from "./screens/RouteDetail";
import RunScreen from "./screens/RunScreen";
import HistoryScreen from "./screens/HistoryScreen";
import Explore from "./screens/Explore";

// ---------- root ----------
export default function App() {
  // undefined = still checking for a session, null = signed out.
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

  const userId = session?.user?.id;

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    getSession().then(setSession);
    const sub = onAuthStateChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  const reloadLibrary = useCallback(async () => {
    if (!userId) return;
    const { games: g, routesByGame: rb } = await db.listMyGamesWithRoutes();
    setGames(g);
    setRoutesByGame(rb);
    setTotalRuns(await db.countMyRuns(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      await reloadLibrary();
      setLoading(false);
    })();
  }, [userId, reloadLibrary]);

  const addGame = async (name) => {
    const game = await db.findOrCreateGame({ name });
    setGames((prev) => (prev.some((g) => g.id === game.id) ? prev : [...prev, game]));
    setRoutesByGame((prev) => (prev[game.id] ? prev : { ...prev, [game.id]: [] }));
    return game.id;
  };

  const deleteGame = async (gId) => {
    await db.removeGameFromMyLibrary(gId, userId);
    setGames((prev) => prev.filter((g) => g.id !== gId));
    setRoutesByGame((prev) => {
      const next = { ...prev };
      delete next[gId];
      return next;
    });
    if (gameId === gId) {
      setGameId(null);
      setScreen("library");
    }
    flash("Removed from your library");
  };

  const saveRoute = async (route) => {
    const saved = await db.saveRoute(route, userId);
    setRoutesByGame((prev) => {
      const list = prev[saved.game_id] || [];
      const exists = list.some((r) => r.id === saved.id);
      const next = exists ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved];
      return { ...prev, [saved.game_id]: next };
    });
    if (!games.some((g) => g.id === saved.game_id)) {
      const game = await db.getGame(saved.game_id);
      setGames((prev) => [...prev, game]);
    }
    flash("Route saved");
    return saved;
  };

  const deleteRoute = async (route) => {
    await db.deleteRoute(route.id);
    setRoutesByGame((prev) => ({ ...prev, [route.game_id]: (prev[route.game_id] || []).filter((r) => r.id !== route.id) }));
    flash("Route deleted");
  };

  const sidebarProps = {
    games,
    activeGameId: screen === "library" || screen === "explore" ? null : gameId,
    totalRuns,
    onHome: () => setScreen("library"),
    onExplore: () => setScreen("explore"),
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
      <Shell sidebarProps={{ games: [], activeGameId: null, totalRuns: 0, onHome() {}, onExplore() {}, onSelectGame() {}, onAddGame() {}, onDeleteGame() {} }}>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-dim)" }}>Loading…</div>
      </Shell>
    );
  }

  const wide = screen === "run" || screen === "route" || screen === "game" || screen === "library" || screen === "explore";

  return (
    <Shell toast={toast} sidebarProps={sidebarProps} wide={wide}>
      {screen === "library" && (
        <Library
          games={games}
          routesByGame={routesByGame}
          totalRuns={totalRuns}
          userId={userId}
          onOpenGame={(id) => { setGameId(id); setScreen("game"); }}
          onAddGame={async (name) => { const id = await addGame(name); setGameId(id); setScreen("game"); }}
          onDeleteGame={deleteGame}
          onExplore={() => setScreen("explore")}
        />
      )}
      {screen === "explore" && (
        <Explore
          userId={userId}
          onBack={() => setScreen("library")}
          onOpenRoute={async (route) => {
            await db.addToLibrary(route.id, userId);
            await reloadLibrary();
            setRouteId(route.id);
            setScreen("route");
            flash(`Added "${route.name}" to your library`);
          }}
        />
      )}
      {screen === "game" && (
        <GameDetail
          game={games.find((g) => g.id === gameId) || { id: gameId, name: "" }}
          routes={routesByGame[gameId] || []}
          userId={userId}
          onBack={() => setScreen("library")}
          onOpenRoute={(id) => { setRouteId(id); setScreen("route"); }}
          onNewRoute={() => { setEditingRoute(null); setEditorReturn("game"); setScreen("editor"); }}
        />
      )}
      {screen === "editor" && (
        <RouteEditor
          gameId={gameId}
          initial={editingRoute}
          userId={userId}
          onCancel={() => setScreen(editorReturn === "route" ? "route" : "game")}
          onSave={async (route) => { const saved = await saveRoute(route); setRouteId(saved.id); setScreen("route"); }}
        />
      )}
      {screen === "route" && (
        <RouteDetail
          routeId={routeId}
          userId={userId}
          onBack={() => setScreen(gameId ? "game" : "explore")}
          onEdit={(route) => { setEditingRoute(route); setEditorReturn("route"); setScreen("editor"); }}
          onDelete={async (route) => { await deleteRoute(route); setScreen("game"); }}
          onStartRun={() => setScreen("run")}
          onHistory={() => setScreen("history")}
          onVisibilityChange={reloadLibrary}
        />
      )}
      {screen === "run" && (
        <RunScreen
          routeId={routeId}
          userId={userId}
          onExit={() => setScreen("route")}
          onFinished={() => { setTotalRuns((n) => n + 1); flash("Run saved"); }}
        />
      )}
      {screen === "history" && <HistoryScreen routeId={routeId} userId={userId} onBack={() => setScreen("route")} />}
    </Shell>
  );
}

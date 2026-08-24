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
import PracticeScreen from "./screens/PracticeScreen";
import HistoryScreen from "./screens/HistoryScreen";
import Explore from "./screens/Explore";
import UserProfile from "./screens/UserProfile";
import RoutePreview from "./screens/RoutePreview";
import Home from "./screens/Home";

// Screens that only make sense with an account — browsing (Explore,
// previewing a route, viewing a profile) never requires one.
const GUEST_BLOCKED = new Set(["library", "game", "editor", "route", "run", "practice", "history"]);

// ---------- root ----------
export default function App() {
  // undefined = still checking for a session, null = signed out (guest).
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
  const [profile, setProfile] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [previewReturn, setPreviewReturn] = useState("explore");
  const [profileReturn, setProfileReturn] = useState("explore");
  const [authReturn, setAuthReturn] = useState("explore");
  const [authMessage, setAuthMessage] = useState(null);
  const [pendingRoute, setPendingRoute] = useState(null);

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
    if (!userId) {
      // Signed out (or never signed in) — nothing to load, and nothing
      // stale from a previous session should linger in the sidebar/UI.
      setProfile(null);
      setGames([]);
      setRoutesByGame({});
      setTotalRuns(0);
      setLoading(false);
      return;
    }
    (async () => {
      await Promise.all([reloadLibrary(), db.getProfile(userId).then(setProfile)]);
      setLoading(false);
    })();
  }, [userId, reloadLibrary]);

  // Resume whatever a guest was trying to do once they actually sign in:
  // adding a previewed route to their library, or just landing back on
  // their (now real) library if they signed in from the sidebar directly.
  useEffect(() => {
    if (!userId) return;
    if (pendingRoute) {
      const r = pendingRoute;
      setPendingRoute(null);
      openPublicRoute(r);
    } else if (screen === "auth") {
      setScreen("library");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateUsername = async (newName) => {
    const p = await db.updateUsername(userId, newName);
    setProfile(p);
    flash("Username updated");
    return p;
  };

  const requireAuth = (fromScreen, message) => {
    setAuthReturn(fromScreen);
    setAuthMessage(message || null);
    setScreen("auth");
  };

  // Opening a public guide (from a preview) adds it to your library and
  // jumps straight to it — nothing "yours" until you say so.
  const openPublicRoute = async (route) => {
    await db.addToLibrary(route.id, userId);
    await reloadLibrary();
    setRouteId(route.id);
    setScreen("route");
    flash(`Added "${route.name}" to your library`);
  };

  const openProfile = (target, fromScreen) => {
    setProfileTarget(target);
    setProfileReturn(fromScreen || "explore");
    setScreen("profile");
  };

  const previewRouteFrom = (route, fromScreen) => {
    setPreviewRoute(route);
    setPreviewReturn(fromScreen);
    setScreen("preview");
  };

  // A route you don't own gets forked into your own new route instead of
  // edited in place — the original stays untouched and correctly
  // attributed to its owner, and your copy carries permanent credit back.
  const startRemix = (route) => {
    setEditingRoute({
      game_id: route.game_id,
      name: `${route.name} (remix)`,
      segments: route.segments,
      target_ms: route.target_ms,
      use_target: route.use_target,
      remixedFrom: route.id,
      remixedFromName: route.name,
      remixedFromOwnerId: route.owner_id,
      remixedFromOwnerUsername: route.owner?.username,
    });
    setEditorReturn("route");
    setScreen("editor");
  };

  const addGame = async (name, steamInfo) => {
    const game = await db.findOrCreateGame({ name, steamAppid: steamInfo?.appid, headerImage: steamInfo?.image, custom: steamInfo?.custom });
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

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--ink-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
        Loading…
      </div>
    );
  }

  // Full-page takeover for sign in/up, same as before — just reachable
  // from anywhere now (sidebar, or bounced here trying to publish/save)
  // instead of gating the whole app.
  if (screen === "auth" && !session) {
    return <AuthScreen onBack={() => setScreen(authReturn)} message={authMessage} />;
  }

  if (loading) {
    return (
      <Shell sidebarProps={{ games: [], activeGameId: null, totalRuns: 0, onHome() {}, onExplore() {}, onSelectGame() {}, onAddGame() {}, onDeleteGame() {} }}>
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-dim)" }}>Loading…</div>
      </Shell>
    );
  }

  // A guest landing on (or bounced back to) an account-only screen sees
  // the Home landing page instead — a proper "what is this and what can I
  // do" page, not a silent drop into the Discover grid with zero context.
  // Computed at render time so there's never a flash of the blocked
  // screen while an effect catches up.
  const effectiveScreen = !session && GUEST_BLOCKED.has(screen) ? "home" : screen;

  const sidebarProps = {
    games,
    activeGameId: effectiveScreen === "library" || effectiveScreen === "explore" || effectiveScreen === "profile" || effectiveScreen === "preview" || effectiveScreen === "home" ? null : gameId,
    activeSection: effectiveScreen === "home" ? "home" : effectiveScreen === "explore" || effectiveScreen === "profile" || effectiveScreen === "preview" ? "explore" : "library",
    totalRuns,
    // The brand logo means "go to my base" — Library if signed in, the
    // Home landing page if not (a soft landing, not a wall). The Library
    // TAB is a more explicit ask specifically for library features, so
    // for a guest it goes straight to sign-in instead.
    onHome: () => setScreen(userId ? "library" : "home"),
    onLibraryTab: () => (userId ? setScreen("library") : requireAuth("home", "Sign in to build your library")),
    onExplore: () => setScreen("explore"),
    onSelectGame: (id) => { setGameId(id); setScreen("game"); },
    onAddGame: async (name, steamInfo) => { const id = await addGame(name, steamInfo); setGameId(id); setScreen("game"); },
    onDeleteGame: deleteGame,
    username: profile?.username,
    onUpdateUsername: updateUsername,
    onViewProfile: () => { setProfileTarget({ userId, username: profile?.username }); setScreen("profile"); },
    onSignIn: () => requireAuth("explore", "Sign in to Pacenotes"),
    onSignOut: signOut,
  };

  const wide = effectiveScreen === "run" || effectiveScreen === "practice" || effectiveScreen === "route" || effectiveScreen === "game" || effectiveScreen === "library" || effectiveScreen === "explore" || effectiveScreen === "profile" || effectiveScreen === "preview" || effectiveScreen === "home";

  return (
    <Shell toast={toast} sidebarProps={sidebarProps} wide={wide}>
      {effectiveScreen === "home" && (
        <Home
          onExplore={() => setScreen("explore")}
          onSignIn={() => requireAuth("home", "Sign in to Pacenotes")}
        />
      )}
      {effectiveScreen === "library" && (
        <Library
          games={games}
          routesByGame={routesByGame}
          totalRuns={totalRuns}
          userId={userId}
          onOpenGame={(id) => { setGameId(id); setScreen("game"); }}
          onAddGame={async (name, steamInfo) => { const id = await addGame(name, steamInfo); setGameId(id); setScreen("game"); }}
          onDeleteGame={deleteGame}
          onExplore={() => setScreen("explore")}
        />
      )}
      {effectiveScreen === "explore" && (
        <Explore
          userId={userId}
          onBack={() => setScreen(userId ? "library" : "home")}
          onPreviewRoute={(r) => previewRouteFrom(r, "explore")}
          onOpenProfile={(target) => openProfile(target, "explore")}
        />
      )}
      {effectiveScreen === "profile" && profileTarget && (
        <UserProfile
          userId={profileTarget.userId}
          username={profileTarget.username}
          onBack={() => setScreen(profileReturn)}
          onPreviewRoute={(r) => previewRouteFrom(r, "profile")}
        />
      )}
      {effectiveScreen === "preview" && previewRoute && (
        <RoutePreview
          route={previewRoute}
          userId={userId}
          onBack={() => setScreen(previewReturn)}
          onAdd={openPublicRoute}
          onRequireAuth={(route) => { setPendingRoute(route); requireAuth("preview", `Sign in to add "${route.name}" to your library`); }}
          onOpenProfile={(target) => openProfile(target, "preview")}
        />
      )}
      {effectiveScreen === "game" && (
        <GameDetail
          game={games.find((g) => g.id === gameId) || { id: gameId, name: "" }}
          routes={routesByGame[gameId] || []}
          userId={userId}
          onBack={() => setScreen("library")}
          onOpenRoute={(id) => { setRouteId(id); setScreen("route"); }}
          onNewRoute={() => { setEditingRoute(null); setEditorReturn("game"); setScreen("editor"); }}
        />
      )}
      {effectiveScreen === "editor" && (
        <RouteEditor
          gameId={gameId}
          initial={editingRoute}
          userId={userId}
          onCancel={() => setScreen(editorReturn === "route" ? "route" : "game")}
          onSave={async (route) => { const saved = await saveRoute(route); setRouteId(saved.id); setScreen("route"); }}
        />
      )}
      {effectiveScreen === "route" && (
        <RouteDetail
          routeId={routeId}
          userId={userId}
          onBack={() => setScreen(gameId ? "game" : "explore")}
          onEdit={(route) => { setEditingRoute(route); setEditorReturn("route"); setScreen("editor"); }}
          onRemix={startRemix}
          onDelete={async (route) => { await deleteRoute(route); setScreen("game"); }}
          onStartRun={() => setScreen("run")}
          onPractice={() => setScreen("practice")}
          onHistory={() => setScreen("history")}
          onVisibilityChange={reloadLibrary}
          onOpenProfile={(target) => openProfile(target, "route")}
          flash={flash}
        />
      )}
      {effectiveScreen === "run" && (
        <RunScreen
          routeId={routeId}
          userId={userId}
          onExit={() => setScreen("route")}
          onFinished={() => { setTotalRuns((n) => n + 1); flash("Run saved"); }}
        />
      )}
      {effectiveScreen === "practice" && (
        <PracticeScreen routeId={routeId} userId={userId} onExit={() => setScreen("route")} />
      )}
      {effectiveScreen === "history" && <HistoryScreen routeId={routeId} userId={userId} onBack={() => setScreen("route")} />}
    </Shell>
  );
}

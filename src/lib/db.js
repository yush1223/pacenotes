import { supabase } from "./supabaseClient";

// ---------- games (shared catalog) ----------

// Find an existing game by steam_appid, else create one. A steamAppid is
// required UNLESS the caller explicitly opts into `custom` — an escape
// hatch for niche/homebrew stuff that isn't on Steam. Custom games have no
// steam_appid, which is also exactly what setRouteVisibility() checks
// before allowing a publish, so "can't be published" falls straight out
// of "isn't a verified Steam game" with no extra flag to keep in sync.
// Games are shared across everyone — nobody owns a game row, so there's
// no delete-game here on purpose.
export async function findOrCreateGame({ name, steamAppid, headerImage, custom }) {
  if (steamAppid == null && !custom) {
    throw new Error('Pick a game from the Steam search results, or choose "Add a custom game" for something niche.');
  }
  if (steamAppid != null) {
    const { data: existing } = await supabase.from("games").select("*").eq("steam_appid", steamAppid).maybeSingle();
    if (existing) return existing;
  } else {
    // Custom games dedupe by exact name among other custom games only —
    // never against a real Steam game of the same name, since that would
    // silently smuggle a route onto a publishable game.
    const { data: existing } = await supabase.from("games").select("*").is("steam_appid", null).eq("name", name).maybeSingle();
    if (existing) return existing;
  }
  const { data, error } = await supabase
    .from("games")
    .insert({ name, steam_appid: steamAppid ?? null, header_image: headerImage ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGame(gameId) {
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (error) throw error;
  return data;
}

// ---------- my library (owned + followed routes) ----------

// One call, via the my_routes() RPC (owned UNION library, RLS-safe).
export async function listMyRoutes() {
  const { data, error } = await supabase.rpc("my_routes");
  if (error) throw error;
  return data || [];
}

// Games I have at least one route in (owned or followed), each with the
// routes grouped underneath — this is what the sidebar/home dashboard walk.
export async function listMyGamesWithRoutes() {
  const routes = await listMyRoutes();
  if (routes.length === 0) return { games: [], routesByGame: {} };
  const gameIds = [...new Set(routes.map((r) => r.game_id))];
  const { data: games, error } = await supabase.from("games").select("*").in("id", gameIds);
  if (error) throw error;
  const routesByGame = {};
  for (const r of routes) (routesByGame[r.game_id] ||= []).push(r);
  // Keep game order stable-ish (oldest-added first) by sorting on the
  // earliest route in each group.
  const order = games
    .slice()
    .sort((a, b) => {
      const at = Math.min(...routesByGame[a.id].map((r) => new Date(r.created_at).getTime()));
      const bt = Math.min(...routesByGame[b.id].map((r) => new Date(r.created_at).getTime()));
      return at - bt;
    });
  return { games: order, routesByGame };
}

export async function removeGameFromMyLibrary(gameId, userId) {
  const { data: myRoutesInGame } = await supabase.from("routes").select("id, owner_id").eq("game_id", gameId);
  const ids = (myRoutesInGame || []).map((r) => r.id);
  if (ids.length === 0) return;
  const ownedIds = myRoutesInGame.filter((r) => r.owner_id === userId).map((r) => r.id);
  if (ownedIds.length) await supabase.from("routes").delete().in("id", ownedIds);
  await supabase.from("library").delete().eq("user_id", userId).in("route_id", ids);
}

// ---------- routes ----------

// Joins the game's steam_appid (so the UI knows whether this route can
// ever be published) and, if this route is a remix, the original author's
// live username (falls back to the remixed_from_name/owner_id snapshot on
// the row itself if their profile is gone).
export async function getRoute(routeId) {
  const { data, error } = await supabase
    .from("routes")
    .select("*, games(steam_appid), owner:profiles!owner_id(username), remix_owner:profiles!remixed_from_owner_id(username)")
    .eq("id", routeId)
    .single();
  if (error) throw error;
  return data;
}

// route: { id?, game_id, name, segments, target_ms, use_target, visibility?,
//          remixedFrom?, remixedFromName?, remixedFromOwnerId? }
// The remix* fields only ever apply on insert (creating a new route from
// someone else's) — lineage doesn't change on later edits.
export async function saveRoute(route, userId) {
  if (route.id) {
    const { data, error } = await supabase
      .from("routes")
      .update({
        name: route.name,
        segments: route.segments,
        target_ms: route.target_ms,
        use_target: route.use_target,
      })
      .eq("id", route.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("routes")
    .insert({
      game_id: route.game_id,
      owner_id: userId,
      name: route.name,
      segments: route.segments,
      target_ms: route.target_ms,
      use_target: route.use_target,
      visibility: "private",
      remixed_from: route.remixedFrom ?? null,
      remixed_from_name: route.remixedFromName ?? null,
      remixed_from_owner_id: route.remixedFromOwnerId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Publishing is restricted to routes whose game is a verified Steam title
// (games.steam_appid set) — this is enforced at creation time too (games
// can only be created from a picked Steam search result), but this is the
// hard backstop so nothing unverifiable can ever go public even via an
// older/orphaned game row.
export async function setRouteVisibility(routeId, visibility) {
  if (visibility === "public") {
    const { data: route, error: rErr } = await supabase.from("routes").select("game_id, games(steam_appid)").eq("id", routeId).single();
    if (rErr) throw rErr;
    if (!route.games?.steam_appid) throw new Error("Only routes for verified Steam games can be published.");
  }
  const { error } = await supabase.from("routes").update({ visibility }).eq("id", routeId);
  if (error) throw error;
}

export async function deleteRoute(routeId) {
  const { error } = await supabase.from("routes").delete().eq("id", routeId);
  if (error) throw error;
}

// ---------- personal bests ----------

export async function getPB(routeId, userId) {
  const { data, error } = await supabase
    .from("personal_bests")
    .select("*")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function resetPB(routeId, userId) {
  const { error } = await supabase.from("personal_bests").delete().eq("route_id", routeId).eq("user_id", userId);
  if (error) throw error;
}

async function upsertPBIfBetter(routeId, userId, totalMs, splits) {
  const current = await getPB(routeId, userId);
  const isNewPB = !current || totalMs < current.total_ms;
  if (isNewPB) {
    const { error } = await supabase
      .from("personal_bests")
      .upsert({ route_id: routeId, user_id: userId, total_ms: totalMs, splits, achieved_at: new Date().toISOString() });
    if (error) throw error;
  }
  return isNewPB;
}

// ---------- practice (segment drilling) ----------
// Deliberately separate from runs/personal_bests: practice reps are scratch
// data for improving one segment at a time, never a route-wide timed
// attempt, so they never touch the PB table. The fastest rep per segment
// is surfaced to the UI as a *suggested* target, not a record.

export async function logPracticeSplit(routeId, userId, segmentId, durationMs) {
  const { data, error } = await supabase
    .from("practice_splits")
    .insert({ route_id: routeId, user_id: userId, segment_id: segmentId, duration_ms: Math.round(durationMs) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePracticeSplit(id) {
  const { error } = await supabase.from("practice_splits").delete().eq("id", id);
  if (error) throw error;
}

// Recent reps for one segment, newest first — this session's working log.
export async function listPracticeSplits(routeId, userId, segmentId, limit = 20) {
  const { data, error } = await supabase
    .from("practice_splits")
    .select("*")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .eq("segment_id", segmentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Best (fastest) practice rep per segment for this route — the map the UI
// reads to show "suggested target" hints, in the roadbook and the editor.
export async function getPracticeBests(routeId, userId) {
  const { data, error } = await supabase
    .from("practice_splits")
    .select("segment_id, duration_ms")
    .eq("route_id", routeId)
    .eq("user_id", userId);
  if (error) throw error;
  const best = {};
  for (const row of data || []) {
    if (best[row.segment_id] == null || row.duration_ms < best[row.segment_id]) best[row.segment_id] = row.duration_ms;
  }
  return best;
}

// ---------- runs ----------

export async function listRuns(routeId, userId, limit = 25) {
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("route_id", routeId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function countMyRuns(userId) {
  const { count, error } = await supabase.from("runs").select("*", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw error;
  return count || 0;
}

// Logs the run and updates the PB if it beats (or is the first for) this
// route+user. Returns { isNewPB }.
// performance.now() carries sub-millisecond precision (e.g. 39896.1999...)
// but total_ms is a Postgres bigint column, which rejects non-integers
// outright — round here, at the one place everything funnels through, so
// no caller has to remember to.
export async function finishRun(routeId, userId, totalMs, splits) {
  const total = Math.round(totalMs);
  const roundedSplits = splits.map((s) => Math.round(s));
  const { error } = await supabase.from("runs").insert({ route_id: routeId, user_id: userId, total_ms: total, splits: roundedSplits });
  if (error) throw error;
  const isNewPB = await upsertPBIfBetter(routeId, userId, total, roundedSplits);
  return { isNewPB };
}

// ---------- explore (public guides) ----------

export async function listPublicRoutes({ gameId } = {}) {
  let query = supabase
    .from("routes")
    .select("*, games(id,name,header_image), profiles!owner_id(username)")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });
  if (gameId) query = query.eq("game_id", gameId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listPublicGames() {
  const { data, error } = await supabase
    .from("routes")
    .select("game_id, games(id,name,header_image,steam_appid)")
    .eq("visibility", "public");
  if (error) throw error;
  const byId = {};
  for (const row of data || []) {
    const g = row.games;
    if (!g) continue;
    if (!byId[g.id]) byId[g.id] = { ...g, routeCount: 0 };
    byId[g.id].routeCount += 1;
  }
  return Object.values(byId);
}

export async function getGameBySteamAppid(steamAppid) {
  const { data, error } = await supabase.from("games").select("*").eq("steam_appid", steamAppid).maybeSingle();
  if (error) throw error;
  return data;
}

// Guides for a Steam game, looked up by appid rather than our internal
// game id — works even if nobody's created a `games` row for it yet
// (just returns []), which is what lets Explore browse popular Steam
// titles that have zero guides so far.
export async function listPublicRoutesBySteamAppid(steamAppid) {
  const { data, error } = await supabase
    .from("routes")
    .select("*, games!inner(id,name,header_image,steam_appid), profiles!owner_id(username)")
    .eq("games.steam_appid", steamAppid)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- profiles (usernames, public author pages) ----------

export async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("id, username, created_at").eq("id", userId).single();
  if (error) throw error;
  return data;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function updateUsername(userId, username) {
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    throw new Error("Usernames are 3-20 characters: letters, numbers, underscores only.");
  }
  const { data, error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", userId).select().single();
  if (error) {
    if (error.code === "23505") throw new Error(`"${trimmed}" is already taken.`);
    throw error;
  }
  return data;
}

// Every public route a given user owns, with game info for visuals — the
// data behind a clickable author's public profile page.
export async function listPublicRoutesByUser(userId) {
  const { data, error } = await supabase
    .from("routes")
    .select("*, games(id,name,header_image,steam_appid)")
    .eq("visibility", "public")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addToLibrary(routeId, userId) {
  const { error } = await supabase.from("library").upsert({ user_id: userId, route_id: routeId });
  if (error) throw error;
}

export async function isInLibrary(routeId, userId) {
  const { data, error } = await supabase.from("library").select("route_id").eq("user_id", userId).eq("route_id", routeId).maybeSingle();
  if (error) throw error;
  return !!data;
}

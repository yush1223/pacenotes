import { supabase } from "./supabaseClient";

// ---------- games (shared catalog) ----------

// Find an existing game by steam_appid, else create one. A steamAppid is
// required — games are only ever created from a picked Steam search
// result, never freeform text, so nothing unverifiable ever lands in the
// shared catalog (and therefore can never be published). Games are shared
// across everyone — nobody owns a game row, so there's no delete-game here
// on purpose.
export async function findOrCreateGame({ name, steamAppid, headerImage }) {
  if (steamAppid == null) throw new Error("Pick a game from the Steam search results — typed names alone can't be added.");
  const { data: existing } = await supabase.from("games").select("*").eq("steam_appid", steamAppid).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("games")
    .insert({ name, steam_appid: steamAppid, header_image: headerImage ?? null })
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

export async function getRoute(routeId) {
  const { data, error } = await supabase.from("routes").select("*").eq("id", routeId).single();
  if (error) throw error;
  return data;
}

// route: { id?, game_id, name, segments, target_ms, use_target, visibility? }
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

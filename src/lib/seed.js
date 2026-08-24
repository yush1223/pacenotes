import { uid } from "./storage";

// ---------- seed ----------
// Demo content only — see pacenotes-intent.md pillar #1: nothing in the data
// model should assume anything about this specific game.
export const SEED_ROUTE_ID = "seed-htf-any";
export const SEED_GAME_ID = "seed-htf";

export function seedSegments() {
  return [
    { id: uid(), title: "Crash Site", notes: "Get to shore, head straight for Lighthouse Island\nDon't backtrack for stray items" },
    { id: uid(), title: "Lighthouse Island", notes: "Collect clams, feed the guard\nGet to $60\nBuy Crab-Fishing Rod, Knife, Beer\nGive Beer to guard for the keys\nLeave immediately" },
    { id: uid(), title: "Islands 2–4", notes: "Only talk to quest-relevant NPCs\nComplete only the unlock quest per island\nBuy the minimum weapon + engine upgrade\nSkip: casino, Drip hunting, rare variants" },
    { id: uid(), title: "Volcano Island", notes: "Grab Footsnail en route to camp\nFeed Footsnail + Crab-Fishing Rod to NPC\nBuy inventory slot, Fishing Rod, Standard Lure\nCook-and-feed loop to $50 for Professional Lure\nFight and kill the whale boss" },
    { id: uid(), title: "Ending", notes: "Return Whale Fin to the scientist\nGet RHIB keys\nStart the RHIB → credits roll" },
  ];
}

export function seedFakeRuns() {
  const base = [172000, 165000, 151000, 148000, 143000, 134000];
  const now = Date.now();
  return base.map((total, i) => {
    const cuts = [0.06, 0.28, 0.55, 0.82, 1].map((f) => Math.round(total * f));
    return { date: now - (base.length - i) * 86400000, total, segments: cuts };
  });
}

/**
 * HF-1 (v25.4 launch hotfix): honest weak-opener rewrite.
 * Rev 6 §5 #4: the tailor may tighten a weak verb but must not invent.
 * "Responsible for cleaning X" → "Cleaned X". We never insert a verb that
 * is not already in the user's bullet (no "Led", no "Delivered").
 */
const IRREGULAR: Record<string, string> = {
  running: "ran", building: "built", leading: "led", writing: "wrote", making: "made",
  teaching: "taught", selling: "sold", bringing: "brought", buying: "bought",
  sending: "sent", spending: "spent", holding: "held", meeting: "met", setting: "set",
  cutting: "cut", putting: "put", giving: "gave", taking: "took", driving: "drove",
  overseeing: "oversaw", drawing: "drew", speaking: "spoke", choosing: "chose",
  keeping: "kept", finding: "found", getting: "got", understanding: "understood",
  undertaking: "undertook", rebuilding: "rebuilt", rewriting: "rewrote", seeing: "saw",
  thinking: "thought", winning: "won", beginning: "began", growing: "grew",
  shooting: "shot", leaving: "left", paying: "paid", laying: "laid", saying: "said",
  feeding: "fed", reading: "read", forecasting: "forecast", broadcasting: "broadcast",
  telling: "told", standing: "stood", hiring: "hired",
};

/** Opener → how to treat the remainder. */
const GERUND_OPENERS = /^(responsible for|worked on|tasked with|in charge of)\s+(\w+ing)\b(.*)$/i;
const SUPPORT_OPENERS = /^(helped with|assisted with|assisted in)\s+(.+)$/i;

export const WEAK_OPENER =
  /^(responsible for|worked on|helped with|assisted with|assisted in|tasked with|in charge of)\s+/i;

export function pastTense(gerund: string): string {
  const g = gerund.toLowerCase();
  if (IRREGULAR[g]) return IRREGULAR[g];
  if (!g.endsWith("ing") || g.length < 5) return g;
  const stem = g.slice(0, -3);
  if (/[^aeiou]y$/.test(stem)) return stem.slice(0, -1) + "ied";
  if (stem.endsWith("e")) return stem + "d";
  return stem + "ed";
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Returns the bullet with an honest opener, or the bullet unchanged when no
 * honest rewrite exists (e.g. "Responsible for the quarterly budget").
 */
export function honestOpener(bullet: string): string {
  const raw = bullet.trim();
  const g = raw.match(GERUND_OPENERS);
  if (g) return cap(pastTense(g[2])) + g[3];
  const s = raw.match(SUPPORT_OPENERS);
  if (s) return "Supported " + s[2];
  return bullet;
}

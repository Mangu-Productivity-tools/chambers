import { honestOpener } from "./honest-opener";

export function localVariants(bullet: string): string[] {
  const raw = bullet.trim();
  if (raw.length < 8) return [];
  const base = raw.replace(/\.$/, "");
  // HF-1: only honest transforms — never insert a verb the user did not write.
  const honest = honestOpener(base);
  const tight = base
    .replace(/\s+in order to\s+/gi, " to ")
    .replace(/\s+that were\s+/gi, " ")
    .replace(/\s+that was\s+/gi, " ")
    .replace(/\s{2,}/g, " ");
  const out = [period(honest), period(tight), period(honestOpener(tight)), period(base)];
  return [...new Set(out)].filter((v) => v.length > 8).slice(0, 3);
}

function period(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

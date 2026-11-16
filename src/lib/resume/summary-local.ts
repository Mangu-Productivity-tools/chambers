import type { Resume } from "./types";
import { actionVerb, findEvidence, uniqueKeywords } from "./text";

/**
 * Local (no-AI) summary.
 *
 * FR-HON-107: built only from the sheet. The role, its first bullet and the
 * skills are the user's own words; the only connective text is "who",
 * "Skills:" and "Background includes", none of which asserts anything the
 * sheet does not. No track record, seniority, years or outcomes are implied.
 * With nothing to ground a new summary, the existing one is returned as is.
 */
export function writeSummaryLocal(resume: Resume, jobDescription = ""): string {
  // The first non-empty bullet and the role it was written under. They are
  // only ever paired with each other, and the role is used exactly as written.
  const job = resume.experience.find((j) => j.bullets.some((b) => b.trim()));
  const proof = stripPeriod(job?.bullets.find((b) => b.trim()) ?? "");
  const role = job?.role.trim() ?? "";
  const headline = resume.identity.title.split("·")[0]?.trim() ?? "";
  const skills = resume.skills.map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const hay = [
    resume.summary,
    ...resume.experience.flatMap((j) => [j.role, j.org, ...j.bullets]),
    ...resume.skills,
  ].join("\n");
  // Posting terms that appear in the sheet as whole words, in the user's casing,
  // and are not already named in the skills sentence.
  const evidenced = uniqueKeywords(jobDescription)
    .map((k) => findEvidence(hay, k))
    .filter((k): k is string => k !== null)
    .filter((k, i, all) => all.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)
    .filter((k) => !skills.some((s) => s.toLowerCase() === k.toLowerCase()))
    .slice(0, 3);

  if (!proof && !skills.length) return resume.summary.trim();

  const parts: string[] = [];
  if (proof) {
    // "<Role> who shipped X." only reads as a sentence when the bullet opens
    // with a past-tense action verb. Otherwise the bullet is kept as its own
    // sentence, unaltered.
    if (role && actionVerb(proof)) parts.push(`${role} who ${lcFirstWord(proof)}.`);
    else parts.push(...(role ? [`${role}.`] : []), `${proof}.`);
  } else if (headline) {
    parts.push(`${headline}.`);
  }
  if (skills.length) parts.push(`Skills: ${skills.join(", ")}.`);
  if (evidenced.length) parts.push(`Background includes ${evidenced.join(", ")}.`);
  return parts.join(" ");
}

function stripPeriod(s: string): string {
  return s.trim().replace(/\.$/, "");
}

/** Lower-cases the leading verb only when it is an ordinary capitalised word. */
function lcFirstWord(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

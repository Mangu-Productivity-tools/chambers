import type { Resume, TailorNotes } from "./types";
import { cloneResume } from "./normalize";
import { evidencedIn, resumePlainText, tokenize, uniqueKeywords } from "./text";
import { rewriteOpener } from "./honest-opener";

/**
 * Local (no-AI) tailoring. It may only:
 *   - reorder roles, bullets and skills the user already wrote, and
 *   - rewrite a weak opener into a verb already in that bullet.
 * It never adds a fact, number, tool, title or bullet.
 *
 * FR-HON-105: every note says what was done and why in neutral terms
 * ("Moved", "Reordered", "Rewrote ... became ..."). Notes never claim the
 * resume got better, and never describe a change that did not happen.
 */
export function tailorLocal(
  resume: Resume,
  jobDescription: string,
): {
  resume: Resume;
  notes: TailorNotes;
} {
  const next = cloneResume(resume);
  const keywords = uniqueKeywords(jobDescription);
  const jdTokens = new Set(tokenize(jobDescription));

  const shared = (text: string) => [...new Set(tokenize(text).filter((t) => jdTokens.has(t)))];
  const overlap = (text: string) =>
    tokenize(text).reduce((n, t) => n + (jdTokens.has(t) ? 1 : 0), 0);

  const moved: string[] = [];
  const rewrote: string[] = [];

  const originalJobIds = next.experience.map((j) => j.id);
  const rankedJobs = [...next.experience].sort((a, b) => {
    const sa = overlap([a.role, a.org, ...a.bullets].join(" "));
    const sb = overlap([b.role, b.org, ...b.bullets].join(" "));
    return sb - sa;
  });
  if (rankedJobs.some((j, i) => j.id !== originalJobIds[i])) {
    moved.push(
      `Reordered your roles by how many words each shares with the posting. ${jobLabel(rankedJobs[0])} is now first. Dates were not changed.`,
    );
  }
  for (const job of rankedJobs) {
    const original = job.bullets.slice();
    job.bullets = [...job.bullets].sort((a, b) => overlap(b) - overlap(a));
    if (job.bullets.some((b, i) => b !== original[i])) {
      moved.push(
        `Reordered bullets under ${jobLabel(job)} so the ones sharing words with the posting come first.`,
      );
    }
    job.bullets = job.bullets.map((b) => {
      const result = rewriteOpener(b);
      if (!result.changed) return b;
      rewrote.push(
        `Rewrote a bullet opener under ${jobLabel(job)}: “${result.before}” became “${result.after}”. The verb is the one you wrote.`,
      );
      return result.text;
    });
  }
  next.experience = rankedJobs;

  const originalSkills = next.skills.slice();
  const skillRanked = [...next.skills].sort((a, b) => overlap(b) - overlap(a));
  const raised = skillRanked.filter((skill, i) => {
    const was = originalSkills.indexOf(skill);
    return was > i && overlap(skill) > 0;
  });
  const NAMED = 4;
  for (const skill of raised.slice(0, NAMED)) {
    const words = shared(skill)
      .map((w) => `“${w}”`)
      .join(", ");
    moved.push(`Moved skill “${skill}” up because the posting uses ${words}.`);
  }
  if (raised.length > NAMED) {
    moved.push(
      `Moved ${raised.length - NAMED} more skill${raised.length - NAMED === 1 ? "" : "s"} up for the same reason.`,
    );
  }
  next.skills = skillRanked;

  const plain = resumePlainText(next);
  const missing = keywords.filter((k) => !evidencedIn(plain, k));

  const movedNotes = [...new Set(moved)];
  const rewroteNotes = [...new Set(rewrote)];

  return {
    resume: next,
    notes: {
      summary: summaryNote(movedNotes.length, rewroteNotes.length, keywords.length, missing.length),
      moved: movedNotes,
      rewrote: rewroteNotes,
      missing,
    },
  };
}

function jobLabel(job: { role: string; org: string } | undefined): string {
  if (!job) return "your first role";
  const role = job.role.trim();
  const org = job.org.trim();
  if (role && org) return `${role} at ${org}`;
  return role || org || "an untitled role";
}

function summaryNote(moved: number, rewrote: number, checked: number, missing: number): string {
  const did: string[] = [];
  if (moved > 0) did.push("Reordered what you already wrote to follow the posting’s wording");
  if (rewrote > 0) {
    did.push(
      `${did.length ? "rewrote" : "Rewrote"} ${rewrote} bullet opener${rewrote === 1 ? "" : "s"} using your own verb${rewrote === 1 ? "" : "s"}`,
    );
  }
  const first = did.length
    ? `${did.join(" and ")}. Nothing was added: no new facts, numbers, titles or skills.`
    : checked === 0
      ? "No changes made."
      : "No changes made: nothing needed reordering for this posting’s wording.";
  const gap =
    checked === 0
      ? "There is no posting text to compare against."
      : missing === 0
        ? `All ${checked} posting terms checked appear in your resume.`
        : `${missing} of ${checked} posting terms checked are not in your resume and were not added. Add one only if it is true.`;
  return `${first} ${gap}`;
}

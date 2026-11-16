import type { CoverLetter, LetterTone, Resume } from "./types";
import { inferCompany, inferRole } from "./infer";
import { findEvidence, uniqueKeywords } from "./text";

/**
 * Local (no-AI) cover letter.
 *
 * FR-HON-107: every sentence is either (a) text the user wrote, quoted as
 * written, (b) a statement that something appears in their resume, or
 * (c) a plain statement of intent ("I'm applying for ..."). The letter never
 * asserts fit, seniority, years, outcomes or recency that the sheet does not
 * state. When the sheet has nothing to ground a paragraph, the paragraph is
 * omitted instead of filled with a template claim.
 */
export function writeLetterLocal(
  resume: Resume,
  jobDescription: string,
  company: string,
  role: string,
  tone: LetterTone = "calm",
): CoverLetter {
  const name = resume.identity.name.trim();
  const first = name.split(/\s+/)[0] ?? "";
  // The user's own headline, exactly as written. A role from the experience
  // list is never used as "I'm a ...": it may be a past role.
  const headline = resume.identity.title.split("·")[0]?.trim() ?? "";

  // First role that has a non-empty bullet. The sheet order may have been
  // changed by tailoring, so this is never described as "most recent".
  const job = resume.experience.find((j) => j.bullets.some((b) => b.trim()));
  const bullet = job?.bullets.find((b) => b.trim())?.trim() ?? "";
  const summary = resume.summary.trim();

  const hay = [
    resume.summary,
    ...resume.experience.flatMap((j) => [j.role, j.org, ...j.bullets]),
    ...resume.skills,
  ].join("\n");
  // Posting terms that appear in the sheet as whole words, in the user's casing.
  const keywords = uniqueKeywords(jobDescription)
    .map((k) => findEvidence(hay, k))
    .filter((k): k is string => k !== null)
    .filter((k, i, all) => all.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i)
    .slice(0, 3);

  const knownCompany = company.trim() || inferCompany(jobDescription);
  const knownRole = role.trim() || inferRole(jobDescription);
  const companyName = knownCompany || "your team";
  const roleName = knownRole || "this role";

  const intro =
    tone === "direct"
      ? [name, headline].filter(Boolean).map((s) => sentence(s)).join(" ")
      : name
        ? `I’m ${name}${headline ? ` (${headline})` : ""}.`
        : "";
  const target = knownRole
    ? `${tone === "direct" ? "" : "the "}${knownRole}${tone === "direct" ? "" : " role"}${knownCompany ? ` at ${knownCompany}` : ""}`
    : knownCompany
      ? `a role at ${knownCompany}`
      : "this role";
  const intent =
    tone === "direct"
      ? `Applying for ${target}.`
      : tone === "warm"
        ? `I’m writing about ${target}.`
        : `I’m applying for ${target}.`;
  const open = [intro, intent].filter(Boolean).join(" ");

  let middle = "";
  if (bullet && job) {
    const where = [job.role.trim(), job.org.trim()].filter(Boolean);
    const lead =
      where.length === 2
        ? `From my time as ${where[0]} at ${where[1]}`
        : where.length === 1
          ? `From my time ${job.role.trim() ? "as" : "at"} ${where[0]}`
          : "From my resume";
    middle = `${lead}: ${sentence(bullet)}`;
  } else if (summary) {
    middle = sentence(summary);
  }

  const keywordLine = keywords.length
    ? tone === "direct"
      ? `The posting asks for ${list(keywords)}. ${keywords.length === 1 ? "It is" : "Each is"} in my resume.`
      : tone === "warm"
        ? `I noticed the posting asks for ${list(keywords)}. You’ll find ${keywords.length === 1 ? "it" : "each of them"} in my resume.`
        : `The posting asks for ${list(keywords)}. ${keywords.length === 1 ? "It appears" : "Each appears"} in my resume.`
    : "";

  const closing =
    tone === "direct"
      ? `Happy to walk through the work. Thank you for reading.`
      : tone === "warm"
        ? `I’d be glad to talk about the role. Thank you for your time.`
        : `I’d welcome a conversation about the role. Thank you for reading.`;

  return {
    company: companyName,
    role: roleName,
    greeting: !knownCompany
      ? "Hiring team"
      : tone === "warm"
        ? `${knownCompany} team`
        : `Hiring team at ${knownCompany}`,
    paragraphs: [open, middle, keywordLine].filter(Boolean),
    closing,
    signoff: first ? `Sincerely,\n${first}` : "Sincerely",
  };
}

/** The user's text as written, with a closing period if it lacks one. */
function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

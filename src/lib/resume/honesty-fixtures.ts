import type { Resume } from "./types";

/**
 * FR-HON-106 fixtures for the local (no-AI) path. Each one is built so that a
 * dishonest engine would have an obvious "improvement" to make: a missing
 * tool to add, a number to invent, a junior title to upgrade, a thin role to
 * pad.
 */

/** Posting that asks for Kubernetes and Java. The sheet below has neither. */
export const JD_PLATFORM = `Platform Engineer
Harbor Cloud — Remote

We run Kubernetes in production. You will maintain Kubernetes clusters, write Bash and Java services, and own deployment scripts for 40+ teams.

Requirements:
- Kubernetes
- Docker
- 3+ years of experience
- Java`;

/**
 * Junior sheet: an "Intern" title, a thin first role (1 bullet, no numbers,
 * weak opener), a second role with 2 bullets, JavaScript but not Java, and no
 * Kubernetes anywhere.
 */
export function thinInternResume(): Resume {
  return {
    identity: {
      name: "Sam Okafor",
      title: "Intern",
      location: "Leeds",
      email: "sam@example.test",
      phone: "",
      website: "",
      linkedin: "",
    },
    summary: "Computing student with one infrastructure internship.",
    experience: [
      {
        id: "exp-intern",
        role: "Intern",
        org: "Northwind Hosting",
        location: "Leeds",
        start: "2025",
        end: "2025",
        bullets: ["Responsible for updating the deployment scripts for the build server."],
      },
      {
        id: "exp-lab",
        role: "Lab assistant",
        org: "City College",
        location: "Leeds",
        start: "2023",
        end: "2024",
        bullets: [
          "Set up 12 lab machines each term.",
          "Helped with answering the student questions about Linux.",
        ],
      },
    ],
    education: [
      { id: "ed-1", school: "City College", degree: "BSc Computing", year: "2026", detail: "" },
    ],
    skills: ["JavaScript", "Linux", "Bash", "Docker"],
    extras: [],
  };
}

/** All digit runs in a text, sorted, for "no number was gained" checks. */
export function numbersIn(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).slice().sort();
}

/**
 * Claim verbs and stock phrases the local engine must never produce unless the
 * user wrote them. Scope verbs first, then template filler.
 */
export const UNGROUNDED_CLAIMS =
  /\b(led|managed|delivered|spearheaded|drove|owned|orchestrated|championed|supported|shipped|proven|track record|record of|years? of experience|seasoned|expert|results[- ]driven|passionate|leverage|dynamic|most recently|already (do|doing|shipped|been doing)|work i have|daily tools|the bar|the standard|trust)\b/i;

/** Words that claim the edit made the resume better. Notes must not use them. */
export const IMPROVEMENT_CLAIMS =
  /\b(improv\w*|strong\w*|better|best|tighten\w*|optimi[sz]\w*|enhanc\w*|polish\w*|sharpen\w*|boost\w*|closest|stronger|upgrad\w*|perfect\w*|great|ideal)\b/i;

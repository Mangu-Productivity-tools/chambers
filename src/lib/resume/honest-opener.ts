/**
 * Honest weak-opener rewrite (HF-1 launch hotfix, completed for v26
 * FR-HON-103/104).
 *
 * First law: truth outranks everything. A weak opener is only ever rewritten
 * into a verb the user already wrote in that bullet:
 *
 *   "Responsible for managing a team of 4" -> "Managed a team of 4"
 *   "Helped with onboarding new analysts"  -> "Helped onboard new analysts"
 *
 * We never insert a verb that is not in the bullet (no "Led", "Delivered",
 * "Supported", "Spearheaded"), and we never drop a qualifier that limits the
 * user's scope ("Helped with managing" never becomes "Managed"). When there is
 * any doubt the bullet is returned unchanged. A missed rewrite costs nothing;
 * a wrong one puts a false statement on someone's resume.
 *
 * Every rewrite needs a *supported verb*: an -ing word found in VERBS below.
 * Unknown -ing words ("morning", "existing", "string") are never treated as
 * verbs, so nothing is derived by guesswork.
 */

/**
 * Supported verbs, as base forms.
 *   word        regular:   clean -> cleaning / cleaned
 *                          manage -> managing / managed   (silent e)
 *                          study -> studying / studied    (consonant + y)
 *   word*       doubles the final consonant: ship -> shipping / shipped
 *   word~       doubling optional (US/UK): cancel -> canceling|cancelling
 *   a:b:c       irregular, spelled out: run:running:ran
 */
const VERBS = `
accelerate accept access accompany accomplish account achieve acquire act adapt add address adjust
administer adopt advance advertise advise advocate align allocate allow amend analyse analyze
announce answer apply appoint approach approve arrange assemble assess assign assist attend audit
augment author automate award balance benchmark bill book boost brief budget calculate call
capture carry catalog categorize chair challenge change charge check clarify classify clean clear
close coach code collaborate collect combine communicate compare compile complete compose compute
conduct configure confirm connect consolidate construct consult contact contribute convert convey
cook coordinate copy correct count cover craft create curate customize debate decide decrease
define delegate delete deliver demonstrate deploy design detect determine develop devise diagnose
direct discover discuss dispatch display distribute document draft drill earn edit educate
eliminate email employ enable encourage enforce engage engineer enhance enroll ensure enter
establish estimate evaluate examine exceed execute exhibit expand expedite experiment explain
explore extend extract facilitate file fill filter finalize finance finish fix focus follow
formulate foster found fund gather generate greet guide handle harvest help hire host identify
illustrate implement improve include increase index inform initiate inspect install instruct
integrate interview introduce invent invest investigate invoice issue join judge launch
learn license lift link list listen load locate maintain manage manufacture mark market match
measure mediate mentor merge migrate moderate modify monitor motivate move name navigate
negotiate note notify observe obtain offer onboard open operate optimize order organise organize
outline own pack package paint participate partner pass perform pick pilot pioneer place play
post practice prepare present preserve prevent price print prioritize process procure produce
profile promote propose protect prototype prove provide publish pull purchase pursue push qualify
quantify query raise rank reach receive recommend reconcile record recover recruit redesign reduce
refactor refine register regulate reinforce release remove render renew reorganize repair replace
reply report represent request research reserve resolve respond restore restructure retain
retrieve return reveal review revise route sample save scale schedule score screen script search
secure select serve service shape share shorten simplify simulate sketch solve sort source specify
sponsor staff stage standardize start stock store streamline strengthen structure study style
summarize supervise supply support survey sustain switch tailor target test tidy trace track
trade train transcribe transform translate transport treat triage tune tutor type unify update
upgrade upload use utilize validate verify view visit volunteer wash watch weld wire work
cancel~ channel~ counsel~ fuel~ label~ level~ model~ signal~ total~ travel~
admit* blog* commit* compel* control* debug* defer* drop* embed* equip* excel* fit* flag* format*
grab* infer* log* map* occur* omit* patrol* permit* pin* plan* plot* plug* prefer* program*
propel* refer* reformat* rig* scan* scrub* ship* shop* shred* skim* slot* spot* step* stop*
submit* swap* tag* transfer* transmit* trim* vet* wrap*
tie:tying:tied
agree:agreeing:agreed free:freeing:freed guarantee:guaranteeing:guaranteed
begin:beginning:began bid:bidding:bid bind:binding:bound break:breaking:broke
bring:bringing:brought broadcast:broadcasting:broadcast build:building:built buy:buying:bought
cast:casting:cast catch:catching:caught choose:choosing:chose come:coming:came
cut:cutting:cut deal:dealing:dealt dig:digging:dug do:doing:did draw:drawing:drew
drive:driving:drove feed:feeding:fed find:finding:found fly:flying:flew
forecast:forecasting:forecast get:getting:got give:giving:gave go:going:went
grow:growing:grew hear:hearing:heard hold:holding:held input:inputting:input keep:keeping:kept
know:knowing:knew lay:laying:laid lead:leading:led leave:leaving:left lend:lending:lent
make:making:made meet:meeting:met offset:offsetting:offset outgrow:outgrowing:outgrew
output:outputting:output overcome:overcoming:overcame override:overriding:overrode
oversee:overseeing:oversaw pay:paying:paid proofread:proofreading:proofread put:putting:put
read:reading:read rebuild:rebuilding:rebuilt redo:redoing:redid repay:repaying:repaid
rerun:rerunning:reran resell:reselling:resold reset:resetting:reset rethink:rethinking:rethought
rewrite:rewriting:rewrote ride:riding:rode rise:rising:rose run:running:ran say:saying:said
see:seeing:saw seek:seeking:sought sell:selling:sold send:sending:sent set:setting:set
shoot:shooting:shot show:showing:showed sit:sitting:sat speak:speaking:spoke
speed:speeding:sped spend:spending:spent spin:spinning:spun split:splitting:split
spread:spreading:spread stand:standing:stood stick:sticking:stuck strike:striking:struck
sweep:sweeping:swept take:taking:took teach:teaching:taught tell:telling:told
think:thinking:thought throw:throwing:threw troubleshoot:troubleshooting:troubleshot
undergo:undergoing:underwent understand:understanding:understood
undertake:undertaking:undertook underwrite:underwriting:underwrote upsell:upselling:upsold
uphold:upholding:upheld win:winning:won withdraw:withdrawing:withdrew write:writing:wrote
`;

type VerbForms = { base: string; past: string };

function regularGerund(base: string, double: boolean): string {
  if (double) return base + base.slice(-1) + "ing";
  if (base.endsWith("e") && !/(ee|ye|oe)$/.test(base)) return base.slice(0, -1) + "ing";
  return base + "ing";
}

function regularPast(base: string, double: boolean): string {
  if (double) return base + base.slice(-1) + "ed";
  if (base.endsWith("e")) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  return base + "ed";
}

/** gerund -> { base, past } for every supported verb. */
const BY_GERUND: Map<string, VerbForms> = (() => {
  const map = new Map<string, VerbForms>();
  for (const entry of VERBS.split(/\s+/).filter(Boolean)) {
    if (entry.includes(":")) {
      const [base, gerund, past] = entry.split(":");
      map.set(gerund, { base, past });
    } else if (entry.endsWith("*")) {
      const base = entry.slice(0, -1);
      map.set(regularGerund(base, true), { base, past: regularPast(base, true) });
    } else if (entry.endsWith("~")) {
      const base = entry.slice(0, -1);
      map.set(regularGerund(base, false), { base, past: regularPast(base, false) });
      map.set(regularGerund(base, true), { base, past: regularPast(base, true) });
    } else {
      map.set(regularGerund(entry, false), { base: entry, past: regularPast(entry, false) });
    }
  }
  return map;
})();

/**
 * Supported gerunds that are just as often a noun or a modifier
 * ("building maintenance", "marketing campaigns", "meeting minutes").
 * They only count as verbs when the next word is not a typical head noun.
 */
const NOUN_LIKE = new Set(
  `accounting advertising auditing billing booking budgeting building buying checking cleaning
   closing coaching coding computing consulting cooking counseling counselling cutting dispatching
   drafting drawing drilling editing engineering filing financing forecasting funding handling
   hiring holding hosting indexing invoicing learning lending licensing listing loading logging
   manufacturing mapping marketing meeting mentoring modeling modelling onboarding opening
   operating ordering packaging packing painting planning posting pricing printing processing
   programming publishing purchasing reading receiving recruiting rendering reporting routing
   running sampling scaling scanning scheduling screening scripting selling serving setting
   shipping sorting sourcing spending staffing staging standing stocking styling tagging
   teaching testing tracking trading training tutoring underwriting upselling welding wiring
   working writing leading founding winning getting`.split(/\s+/),
);

const HEAD_NOUNS = new Set(
  `activities agencies agency analytics automation budget budgets calendar campaign campaigns
   center centre classes committee committees coordinator costs course
   channels collateral courses crew curriculum department departments desk director directors
   documentation duties efforts environments expenses
   equipment facilities facility firm floor framework frameworks functions group groups hours
   infrastructure initiatives lab labs logistics maintenance manager managers materials minutes
   needs office operations personnel pipeline pipelines plan plans platform platforms policies
   policy procedures process processes program programs purposes requirements room rooms
   schedule schedules services sessions shift shifts site sites software specialist specialists
   staff standards strategies strategy supplies system systems tasks team teams tool tools
   workshops security indicators management data analysis company companies quality`.split(/\s+/),
);

const LEAD_IN = String.raw`(?:i\s+)?(?:(?:was|am|were)\s+)?(?:also\s+)?`;
const DUTY_OPENER = String.raw`(?:my\s+)?(?:(?:main|key|primary|daily|core)\s+)?(?:duties|responsibilities|tasks)\s+(?:included?|includes|were|are)\s*:?`;
// Only openers that state the work was the user's own are rewritten. "Tasked with",
// "worked on", "in charge of", "charged with" and "accountable for" describe an
// assignment or partial involvement, not an outcome, so they are kept as written.
const FULL_OPENER = String.raw`responsible\s+for|${DUTY_OPENER}`;
const HELP_OPENER = String.raw`helped\s+(?:with|in)`;
/** Recognised as weak, but already honest verbs of limited scope: never rewritten. */
const KEEP_OPENER = String.raw`worked\s+on|tasked\s+with|in\s+charge\s+of|charged\s+with|accountable\s+for|assisted\s+(?:with|in)|involved\s+(?:with|in)|participated\s+in|contributed\s+to|exposure\s+to`;

const FULL_RE = new RegExp(String.raw`^${LEAD_IN}(?:${FULL_OPENER})(?=[\s:]|$)\s*`, "i");
const HELP_RE = new RegExp(String.raw`^${LEAD_IN}(?:${HELP_OPENER})(?=\s|$)\s*`, "i");

/** Matches any opener this module recognises as weak (rewritable or not). */
export const WEAK_OPENER = new RegExp(
  String.raw`^${LEAD_IN}(?:${FULL_OPENER}|${HELP_OPENER}|${KEEP_OPENER})(?=[\s:]|$)\s*`,
  "i",
);

export type OpenerOutcome =
  /** Not a weak opener at all. */
  | "not-weak"
  /** "Responsible for managing X" -> "Managed X". */
  | "past-tense"
  /** "Helped with managing X" -> "Helped manage X" (the limiting verb is kept). */
  | "helped"
  /** Weak opener, but no supported verb follows it ("Responsible for the budget"). */
  | "no-verb"
  /** A supported -ing word follows, but it may be a noun, or the grammar is unclear. */
  | "ambiguous"
  /** Opener is already an honest verb of limited scope ("Assisted with ..."). */
  | "kept";

export type OpenerResult = {
  text: string;
  changed: boolean;
  outcome: OpenerOutcome;
  /** The words removed from the front, e.g. "Responsible for managing". */
  before?: string;
  /** The words now at the front, e.g. "Managed". Built only from verbs in the bullet. */
  after?: string;
};

/** True when the word is an -ing form of a supported verb. */
export function isSupportedGerund(word: string): boolean {
  return BY_GERUND.has(word.toLowerCase());
}

/** Base form of a supported gerund ("managing" -> "manage"), else null. */
export function baseForm(gerund: string): string | null {
  return BY_GERUND.get(gerund.toLowerCase())?.base ?? null;
}

/**
 * Past tense of a gerund. Supported verbs come from the lexicon (covers
 * doubling, silent e, y -> ied and irregulars). For anything else a plain
 * spelling rule is applied; honestOpener never relies on that fallback.
 */
export function pastTense(gerund: string): string {
  const g = gerund.toLowerCase();
  const known = BY_GERUND.get(g);
  if (known) return known.past;
  if (!g.endsWith("ing") || g.length < 5) return g;
  const stem = g.slice(0, -3);
  if (/[^aeiou]y$/.test(stem)) return stem.slice(0, -1) + "ied";
  if (stem.endsWith("e")) return stem + "d";
  return stem + "ed";
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

type VerbChain = { gerunds: string[]; joiners: string[]; consumed: number };

/** Reads "managing", "managing and training", "building, testing and shipping". */
function readVerbChain(rest: string): VerbChain | null {
  const first = rest.match(/^([A-Za-z]+ing)\b/);
  if (!first || !isSupportedGerund(first[1])) return null;
  const gerunds = [first[1]];
  const joiners: string[] = [];
  let consumed = first[0].length;
  for (;;) {
    const more = rest
      .slice(consumed)
      .match(/^(\s*,\s*(?:and\s+|or\s+)?|\s+(?:and|or|&)\s+)([A-Za-z]+ing)\b/i);
    if (!more || !isSupportedGerund(more[2])) break;
    joiners.push(more[1]);
    gerunds.push(more[2]);
    consumed += more[0].length;
  }
  return { gerunds, joiners, consumed };
}

/** Why a verb chain cannot be safely rewritten, or null when it can. */
function chainProblem(chain: VerbChain, tail: string): OpenerOutcome | null {
  // "Responsible for testing." - nothing was acted on; the -ing word is the noun.
  if (!/^\s+[A-Za-z0-9$#"'(“‘]/.test(tail)) return "ambiguous";
  // "billing and collections", "shipping/receiving": joined to a non-verb.
  if (/^\s*(?:,|\/|&|and\b|or\b)/i.test(tail)) return "ambiguous";
  const next = (tail.match(/^\s+([A-Za-z]+)/)?.[1] ?? "").toLowerCase();
  // "building maintenance", "marketing campaigns", "meeting minutes".
  if (HEAD_NOUNS.has(next)) return "ambiguous";
  // "Managing Director relations": a capitalised word right after the -ing word
  // suggests a title or name, not an object. Acronyms ("AWS") are fine.
  const nextRaw = tail.match(/^\s+([A-Za-z]+)/)?.[1] ?? "";
  if (/^[A-Z][a-z]/.test(nextRaw)) return "ambiguous";
  // The -ing word is only read as a verb when what follows is plainly its object:
  // a determiner, possessive, number or amount ("managing a team", "training 5 hires").
  // "marketing emails", "managing partner relations", "building permits" stay as written.
  if (!/^\s+(?:(?:the|a|an|our|their|its|his|her|my|all|each|every|both|new)\b|\d|\$|\u00a3|\u20ac)/i.test(tail)) {
    return "ambiguous";
  }
  // The bullet qualifies or negates the outcome ("(round failed)", "; hired 2",
  // "but fell short", "which was shelved"): a bare past-tense verb would overstate it.
  if (
    /[;(]|n['\u2019]t\b|\b(?:not|never|no|none|failed|lost|missed|unsuccessful|attempt(?:ed)?|cancell?ed|target|goal|but|although|though|however|which|without|before|until|once|shelved|scrapped|short)\b/i.test(
      tail,
    )
  ) {
    return "ambiguous";
  }
  // A later "... and presenting findings" would be left in the wrong tense, and
  // "... and networking gear" may not be a verb at all. Leave the bullet alone.
  for (const m of tail.matchAll(/(?:,|&|\band|\bor)\s+([A-Za-z]+ing)\b/gi)) {
    if (isSupportedGerund(m[1])) return "ambiguous";
  }
  return null;
}

function joinChain(chain: VerbChain, form: (gerund: string) => string): string {
  return chain.gerunds.map((g, i) => (i === 0 ? "" : chain.joiners[i - 1]) + form(g)).join("");
}

/** Full account of what happened to a bullet's opener. */
export function rewriteOpener(bullet: string): OpenerResult {
  const raw = bullet.trim();
  const same = (outcome: OpenerOutcome): OpenerResult => ({ text: bullet, changed: false, outcome });
  if (!WEAK_OPENER.test(raw)) return same("not-weak");

  const full = raw.match(FULL_RE);
  const help = full ? null : raw.match(HELP_RE);
  const opener = full ?? help;
  if (!opener) return same("kept");

  const rest = raw.slice(opener[0].length);
  const chain = readVerbChain(rest);
  if (!chain) return same("no-verb");
  const tail = rest.slice(chain.consumed);
  const problem = chainProblem(chain, tail);
  if (problem) return same(problem);

  const after = full
    ? cap(joinChain(chain, pastTense))
    : "Helped " + joinChain(chain, (g) => baseForm(g) ?? g);
  return {
    text: after + tail,
    changed: true,
    outcome: full ? "past-tense" : "helped",
    before: (opener[0] + rest.slice(0, chain.consumed)).replace(/\s+/g, " "),
    after,
  };
}

/**
 * Returns the bullet with an honest opener, or the bullet unchanged when no
 * honest rewrite exists (e.g. "Responsible for the quarterly budget").
 */
export function honestOpener(bullet: string): string {
  return rewriteOpener(bullet).text;
}

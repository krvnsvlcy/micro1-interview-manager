export const MAX_SKILLS = 20;
export const MAX_TITLE_LENGTH = 120;

// A skill is a line, taken as typed: it is never split apart or rewritten.
const LINE_BREAKS = /[\r\n]+/;

// Micro1 links separate skills with a semicolon, so one inside a skill would be
// read as two. Rather than splitting it (which would change what was typed),
// validation rejects it. Commas are fine: URL encoding keeps them intact.
const RESERVED_CHARACTERS = /;/;

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** One skill per line: trims each line and skips the blank ones. */
export function parseSkills(text: string): string[] {
  return text.split(LINE_BREAKS).map(collapseWhitespace).filter(Boolean);
}

/**
 * Cleans a list of skills: one per line, whitespace collapsed, and
 * case-insensitive repeats dropped (the first spelling and position win).
 */
export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills.flatMap(parseSkills)) {
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(skill);
  }

  return result;
}

/**
 * Identity of a set of skills for duplicate detection: case-insensitive,
 * whitespace-normalized and independent of order.
 */
export function skillsKey(skills: string[]): string {
  return JSON.stringify(
    normalizeSkills(skills)
      .map((skill) => skill.toLowerCase())
      .sort(),
  );
}

/**
 * Which skills are switched off after clicking a chip. A plain click flips that
 * one skill; a shift-click keeps only that skill (it is on, all others are off).
 */
export function toggleOff(
  off: ReadonlySet<string>,
  skills: string[],
  skill: string,
  only: boolean,
): Set<string> {
  if (only) return new Set(skills.filter((s) => s !== skill));

  const next = new Set(off);
  if (next.has(skill)) next.delete(skill);
  else next.add(skill);
  return next;
}

export function defaultTitle(skills: string[]): string {
  const shown = skills.slice(0, 3).join(", ");
  const rest = skills.length - 3;

  return `Mock Interview: ${shown}${rest > 0 ? ` +${rest} more` : ""}`;
}

function preview(skill: string): string {
  return skill.length > 24 ? `${skill.slice(0, 24)}…` : skill;
}

type Validation =
  | { ok: true; title: string; skills: string[] }
  | { ok: false; error: string };

/**
 * Validates the raw form input. Takes `unknown`-ish fields because the server
 * runs it on data that arrived over the wire, not on trusted client state.
 */
export function validateInterviewInput(input: {
  title?: unknown;
  skills?: unknown;
}): Validation {
  const rawSkills = Array.isArray(input.skills)
    ? input.skills.filter((skill): skill is string => typeof skill === "string")
    : [];
  const skills = normalizeSkills(rawSkills);

  if (skills.length === 0) {
    return { ok: false, error: "Add at least one skill." };
  }
  if (skills.length > MAX_SKILLS) {
    return { ok: false, error: `Use at most ${MAX_SKILLS} skills.` };
  }
  const reserved = skills.find((skill) => RESERVED_CHARACTERS.test(skill));
  if (reserved) {
    return {
      ok: false,
      error: `"${preview(reserved)}" has a semicolon, which separates skills in a Micro1 link. Put each skill on its own line.`,
    };
  }
  const title = typeof input.title === "string" ? collapseWhitespace(input.title) : "";
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Title is too long (max ${MAX_TITLE_LENGTH} characters).`,
    };
  }

  return { ok: true, title: title || defaultTitle(skills), skills };
}

export const MAX_SKILLS = 20;
// Notion rejects multi-select option names longer than 100 characters.
export const MAX_SKILL_LENGTH = 100;
export const MAX_TITLE_LENGTH = 120;

// Commas can't appear in Notion multi-select option names and semicolons
// separate skills in the Micro1 URL, so both always split a skill apart.
const DELIMITERS = /[,;\r\n]+/;

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Splits free-form text (e.g. a pasted list) into trimmed, non-empty skills. */
export function parseSkills(text: string): string[] {
  return text.split(DELIMITERS).map(collapseWhitespace).filter(Boolean);
}

/**
 * Cleans a list of skills: splits on delimiters, collapses whitespace, and
 * drops case-insensitive repeats (the first spelling and position win).
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

export function defaultTitle(skills: string[]): string {
  const shown = skills.slice(0, 3).join(", ");
  const rest = skills.length - 3;

  return `Mock Interview: ${shown}${rest > 0 ? ` +${rest} more` : ""}`;
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
  const tooLong = skills.find((skill) => skill.length > MAX_SKILL_LENGTH);
  if (tooLong) {
    return {
      ok: false,
      error: `"${tooLong.slice(0, 24)}…" is too long (max ${MAX_SKILL_LENGTH} characters).`,
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

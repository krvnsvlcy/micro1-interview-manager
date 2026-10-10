import { describe, expect, it } from "vitest";
import {
  MAX_SKILLS,
  MAX_SKILL_LENGTH,
  MAX_TITLE_LENGTH,
  collapseWhitespace,
  defaultTitle,
  normalizeSkills,
  parseSkills,
  skillsKey,
  validateInterviewInput,
} from "./skills";

describe("collapseWhitespace", () => {
  it("trims and collapses runs of whitespace", () => {
    expect(collapseWhitespace("  Database \t  Design \n")).toBe("Database Design");
  });
});

describe("parseSkills", () => {
  it("splits a pasted comma-separated list", () => {
    expect(parseSkills("PostgreSQL, Database Design,Redis")).toEqual([
      "PostgreSQL",
      "Database Design",
      "Redis",
    ]);
  });

  it("also splits on semicolons and newlines", () => {
    expect(parseSkills("a;b\nc\r\nd")).toEqual(["a", "b", "c", "d"]);
  });

  it("drops empty entries", () => {
    expect(parseSkills(" , ,a,, ;")).toEqual(["a"]);
    expect(parseSkills("   ")).toEqual([]);
  });
});

describe("normalizeSkills", () => {
  it("normalizes whitespace within and around skills", () => {
    expect(normalizeSkills(["  REST   API  Design "])).toEqual(["REST API Design"]);
  });

  it("removes case-insensitive duplicates, keeping the first spelling", () => {
    expect(normalizeSkills(["PostgreSQL", "postgresql", "Redis", "POSTGRESQL"])).toEqual([
      "PostgreSQL",
      "Redis",
    ]);
  });

  it("treats whitespace differences as the same skill", () => {
    expect(normalizeSkills(["Database Design", "database   design"])).toEqual([
      "Database Design",
    ]);
  });

  it("splits entries that contain delimiters so they cannot corrupt the URL", () => {
    expect(normalizeSkills(["a;b", "c, d"])).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps the order of first appearance", () => {
    expect(normalizeSkills(["b", "a", "B"])).toEqual(["b", "a"]);
  });

  it("cleans up a one-skill-per-line text area", () => {
    const text = "PostgreSQL\r\n\r\n  Database   Design  \nredis\n\npostgresql\n";

    expect(normalizeSkills([text])).toEqual(["PostgreSQL", "Database Design", "redis"]);
    expect(normalizeSkills(["   \n \n"])).toEqual([]);
  });
});

describe("skillsKey", () => {
  it("ignores case, whitespace and order", () => {
    expect(skillsKey(["PostgreSQL", "Database  Design"])).toBe(
      skillsKey([" database design", "postgresql "]),
    );
  });

  it("ignores repeated skills", () => {
    expect(skillsKey(["a", "A", "b"])).toBe(skillsKey(["b", "a"]));
  });

  it("differs when the set of skills differs", () => {
    expect(skillsKey(["a", "b"])).not.toBe(skillsKey(["a", "b", "c"]));
    expect(skillsKey(["a"])).not.toBe(skillsKey(["b"]));
  });

  it("does not confuse one skill with two", () => {
    expect(skillsKey(["ab"])).not.toBe(skillsKey(["a", "b"]));
  });
});

describe("defaultTitle", () => {
  it("lists up to three skills", () => {
    expect(defaultTitle(["PostgreSQL"])).toBe("Mock Interview: PostgreSQL");
    expect(defaultTitle(["a", "b", "c"])).toBe("Mock Interview: a, b, c");
  });

  it("summarizes the rest", () => {
    expect(defaultTitle(["a", "b", "c", "d", "e"])).toBe("Mock Interview: a, b, c +2 more");
  });
});

describe("validateInterviewInput", () => {
  it("returns normalized skills and a generated title when none is given", () => {
    expect(validateInterviewInput({ skills: [" Redis ", "redis", "Kafka"] })).toEqual({
      ok: true,
      title: "Mock Interview: Redis, Kafka",
      skills: ["Redis", "Kafka"],
    });
  });

  it("keeps a provided title, normalizing whitespace", () => {
    expect(validateInterviewInput({ title: "  My   warm-up ", skills: ["Go"] })).toEqual({
      ok: true,
      title: "My warm-up",
      skills: ["Go"],
    });
  });

  it("falls back to the generated title for a blank title", () => {
    expect(validateInterviewInput({ title: "   ", skills: ["Go"] })).toMatchObject({
      ok: true,
      title: "Mock Interview: Go",
    });
  });

  it("requires at least one skill", () => {
    expect(validateInterviewInput({ skills: [] })).toEqual({
      ok: false,
      error: "Add at least one skill.",
    });
    expect(validateInterviewInput({ skills: [" ", ","] })).toMatchObject({ ok: false });
  });

  it("rejects malformed input that did not come from the form", () => {
    expect(validateInterviewInput({})).toMatchObject({ ok: false });
    expect(validateInterviewInput({ skills: "Go" })).toMatchObject({ ok: false });
    expect(validateInterviewInput({ skills: [1, null, {}] })).toMatchObject({ ok: false });
    expect(validateInterviewInput({ title: 5, skills: ["Go"] })).toMatchObject({
      ok: true,
      title: "Mock Interview: Go",
    });
  });

  it("enforces the skill count limit after de-duplication", () => {
    const many = Array.from({ length: MAX_SKILLS + 1 }, (_, i) => `skill ${i}`);

    expect(validateInterviewInput({ skills: many })).toMatchObject({ ok: false });
    expect(validateInterviewInput({ skills: many.slice(0, MAX_SKILLS) })).toMatchObject({
      ok: true,
    });
    expect(validateInterviewInput({ skills: [...many.slice(0, MAX_SKILLS), "SKILL 0"] })).toMatchObject({
      ok: true,
    });
  });

  it("enforces the skill and title length limits", () => {
    expect(
      validateInterviewInput({ skills: ["x".repeat(MAX_SKILL_LENGTH + 1)] }),
    ).toMatchObject({ ok: false });
    expect(validateInterviewInput({ skills: ["x".repeat(MAX_SKILL_LENGTH)] })).toMatchObject({
      ok: true,
    });
    expect(
      validateInterviewInput({ title: "t".repeat(MAX_TITLE_LENGTH + 1), skills: ["Go"] }),
    ).toMatchObject({ ok: false });
  });
});

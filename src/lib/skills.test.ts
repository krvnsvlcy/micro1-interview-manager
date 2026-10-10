import { describe, expect, it } from "vitest";
import {
  MAX_SKILLS,
  MAX_TITLE_LENGTH,
  collapseWhitespace,
  defaultTitle,
  normalizeSkills,
  parseSkills,
  skillsKey,
  toggleOff,
  validateInterviewInput,
} from "./skills";

describe("collapseWhitespace", () => {
  it("trims and collapses runs of whitespace", () => {
    expect(collapseWhitespace("  Database \t  Design \n")).toBe("Database Design");
  });
});

describe("parseSkills", () => {
  it("takes one skill per line, whatever the line ending", () => {
    expect(parseSkills("PostgreSQL\nDatabase Design\r\nRedis\rKafka")).toEqual([
      "PostgreSQL",
      "Database Design",
      "Redis",
      "Kafka",
    ]);
  });

  it("never splits a line on commas or semicolons", () => {
    expect(parseSkills("Node.js, Express\nC++; C#")).toEqual(["Node.js, Express", "C++; C#"]);
  });

  it("drops blank lines", () => {
    expect(parseSkills("\n\n a \n  \n\nb\n")).toEqual(["a", "b"]);
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

  it("leaves commas and semicolons inside a skill alone (validation rejects them)", () => {
    expect(normalizeSkills(["a;b", "c, d"])).toEqual(["a;b", "c, d"]);
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
    expect(validateInterviewInput({ skills: [" ", "\n"] })).toMatchObject({ ok: false });
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

  it("accepts well-formatted skills exactly as written", () => {
    expect(
      validateInterviewInput({ skills: ["C++", "Node.js", "REST API Design", "CI/CD", "Next.js (App Router)"] }),
    ).toMatchObject({
      ok: true,
      skills: ["C++", "Node.js", "REST API Design", "CI/CD", "Next.js (App Router)"],
    });
  });

  it("accepts commas inside a skill, untouched", () => {
    expect(validateInterviewInput({ skills: ["Go", "Node.js, Express", "a,b"] })).toMatchObject({
      ok: true,
      skills: ["Go", "Node.js, Express", "a,b"],
    });
  });

  it("rejects a skill with a semicolon instead of splitting it", () => {
    expect(validateInterviewInput({ skills: ["Go", "C++; C#"] })).toEqual({
      ok: false,
      error: '"C++; C#" has a semicolon, which separates skills in a Micro1 link. Put each skill on its own line.',
    });
    // The same skills, one per line, are fine.
    expect(validateInterviewInput({ skills: ["C++", "C#"] })).toMatchObject({ ok: true });
  });

  it("shortens long skills in the error message but not short ones", () => {
    const long = validateInterviewInput({ skills: ["x".repeat(60) + "; y"] });
    expect(long).toMatchObject({ ok: false });
    expect(long.ok === false && long.error).toContain(`"${"x".repeat(24)}…"`);
    expect(validateInterviewInput({ skills: ["a;b"] })).toMatchObject({
      error: expect.stringContaining('"a;b" has a semicolon'),
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

  it("has no limit on how long a single skill is", () => {
    const long = "x".repeat(1500);

    expect(validateInterviewInput({ skills: [long] })).toMatchObject({ ok: true, skills: [long] });
    expect(validateInterviewInput({ skills: ["Go", `${"word ".repeat(300)}end`] })).toMatchObject({ ok: true });
  });

  it("still limits the title length", () => {
    expect(
      validateInterviewInput({ title: "t".repeat(MAX_TITLE_LENGTH + 1), skills: ["Go"] }),
    ).toMatchObject({ ok: false });
    expect(
      validateInterviewInput({ title: "t".repeat(MAX_TITLE_LENGTH), skills: ["Go"] }),
    ).toMatchObject({ ok: true });
  });
});

describe("toggleOff", () => {
  const skills = ["PostgreSQL", "Redis", "Kafka", "Go"];
  const none = new Set<string>();

  it("a plain click switches one skill off and back on", () => {
    const off = toggleOff(none, skills, "Redis", false);
    expect([...off]).toEqual(["Redis"]);

    expect([...toggleOff(off, skills, "Redis", false)]).toEqual([]);
  });

  it("a plain click leaves the other skills as they were", () => {
    const off = new Set(["Kafka"]);

    expect([...toggleOff(off, skills, "Go", false)].sort()).toEqual(["Go", "Kafka"]);
  });

  it("a shift-click keeps only that skill", () => {
    expect([...toggleOff(none, skills, "Kafka", true)].sort()).toEqual(["Go", "PostgreSQL", "Redis"]);
  });

  it("a shift-click switches the skill on even if it was off, whatever else was off", () => {
    const off = new Set(["Kafka", "Go"]);
    const result = toggleOff(off, skills, "Kafka", true);

    expect(result.has("Kafka")).toBe(false);
    expect([...result].sort()).toEqual(["Go", "PostgreSQL", "Redis"]);
  });

  it("shift-clicking the only skill left on changes nothing", () => {
    const solo = toggleOff(none, skills, "Go", true);

    expect([...toggleOff(solo, skills, "Go", true)].sort()).toEqual([...solo].sort());
  });

  it("does not modify the set it is given", () => {
    const off = new Set(["Redis"]);
    toggleOff(off, skills, "Go", false);
    toggleOff(off, skills, "Go", true);

    expect([...off]).toEqual(["Redis"]);
  });
});

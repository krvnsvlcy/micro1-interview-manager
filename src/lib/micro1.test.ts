import { describe, expect, it } from "vitest";
import { generateInterviewUrl, skillsFromInterviewUrl } from "./micro1";

describe("generateInterviewUrl", () => {
  it("matches the documented Micro1 format", () => {
    expect(
      generateInterviewUrl([
        "PostgreSQL",
        "Database Design",
        "Distributed Systems",
        "REST API Design",
      ]),
    ).toBe(
      "https://interview.micro1.ai/mock-interview/?skills=PostgreSQL%3BDatabase+Design%3BDistributed+Systems%3BREST+API+Design",
    );
  });

  it("handles a single skill without a separator", () => {
    expect(generateInterviewUrl(["Go"])).toBe(
      "https://interview.micro1.ai/mock-interview/?skills=Go",
    );
  });

  it("percent-encodes characters that would break the query string", () => {
    const url = new URL(generateInterviewUrl(["C++", "R&D", "Node.js"]));

    expect(url.search).toBe("?skills=C%2B%2B%3BR%26D%3BNode.js");
    expect(url.searchParams.get("skills")).toBe("C++;R&D;Node.js");
  });

  it("preserves the order it is given", () => {
    const url = new URL(generateInterviewUrl(["b", "a"]));

    expect(url.searchParams.get("skills")).toBe("b;a");
  });
});

describe("commas in skills", () => {
  it("are percent-encoded as provided", () => {
    expect(generateInterviewUrl(["Node.js, Express", "Go"])).toBe(
      "https://interview.micro1.ai/mock-interview/?skills=Node.js%2C+Express%3BGo",
    );
  });
});

describe("skillsFromInterviewUrl", () => {
  it("reads back exactly the skills that built the link", () => {
    const skills = ["Node.js, Express", "C++", "REST API Design", "CI/CD", "Next.js (App Router)", "100%"];

    expect(skillsFromInterviewUrl(generateInterviewUrl(skills))).toEqual(skills);
  });

  it("returns null for anything that is not a Micro1 mock interview link", () => {
    expect(skillsFromInterviewUrl("https://example.com/?skills=a%3Bb")).toBeNull();
    expect(skillsFromInterviewUrl("https://interview.micro1.ai/mock-interview/")).toBeNull();
    expect(skillsFromInterviewUrl("https://interview.micro1.ai/other/?skills=a")).toBeNull();
    expect(skillsFromInterviewUrl("not a url")).toBeNull();
    expect(skillsFromInterviewUrl("")).toBeNull();
  });
});

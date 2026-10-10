import { describe, expect, it } from "vitest";
import { generateInterviewUrl } from "./micro1";

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

const MOCK_INTERVIEW_URL = "https://interview.micro1.ai/mock-interview/";

/**
 * Builds a Micro1 mock interview link for the given skills. Pure and local:
 * no Micro1 API is involved, the skills just travel in the query string.
 */
export function generateInterviewUrl(skills: string[]): string {
  const url = new URL(MOCK_INTERVIEW_URL);

  url.searchParams.set("skills", skills.join(";"));

  return url.toString();
}

/**
 * The skills a Micro1 mock interview link was built from, or null if `link`
 * isn't one. The inverse of generateInterviewUrl.
 */
export function skillsFromInterviewUrl(link: string): string[] | null {
  try {
    const url = new URL(link);
    const skills = url.searchParams.get("skills");

    if (url.origin + url.pathname !== MOCK_INTERVIEW_URL || !skills) return null;
    return skills.split(";");
  } catch {
    return null;
  }
}

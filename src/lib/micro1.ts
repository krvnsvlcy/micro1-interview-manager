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

"use server";

import { refresh } from "next/cache";
import { generateInterviewUrl } from "@/lib/micro1";
import { NotionError, deleteInterview, saveInterview } from "@/lib/notion";
import { validateInterviewInput } from "@/lib/skills";
import type { ActionResult, Interview } from "@/lib/types";

// Notion rejects URL property values longer than this.
const MAX_URL_LENGTH = 2000;

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof NotionError) return { ok: false, error: error.message };

  console.error(error);
  return { ok: false, error: "Something went wrong. Try again." };
}

export async function createInterviewAction(input: {
  title?: string;
  skills: string[];
}): Promise<ActionResult<{ interview: Interview; existing: boolean }>> {
  // Server actions are public endpoints, so re-validate what the client sent.
  const parsed = validateInterviewInput(input);
  if (!parsed.ok) return parsed;

  const url = generateInterviewUrl(parsed.skills);
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, error: "That's too many skills for one link. Remove a few." };
  }

  try {
    const { interview, created } = await saveInterview({
      title: parsed.title,
      skills: parsed.skills,
      url,
    });

    if (created) refresh();
    return { ok: true, interview, existing: !created };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteInterviewAction(id: string): Promise<ActionResult> {
  if (typeof id !== "string" || !id) return { ok: false, error: "Missing interview id." };

  try {
    await deleteInterview(id);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

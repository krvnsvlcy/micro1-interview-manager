import "server-only";

import {
  APIErrorCode,
  Client,
  ClientErrorCode,
  collectPaginatedAPI,
  isFullPage,
  isNotionClientError,
  type PageObjectResponse,
} from "@notionhq/client";
import { generateInterviewUrl } from "./micro1";
import { skillsKey } from "./skills";
import type { Interview } from "./types";

// Property names the Notion database must have (see README).
const PROPERTY = { title: "Name", skills: "Skills", url: "URL" } as const;

/** An error whose message is safe to show to the user. */
export class NotionError extends Error {}

type Context = { notion: Client; dataSourceId: string };

let client: Client | undefined;

function getContext(): Context {
  const token = process.env.NOTION_TOKEN?.trim();
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID?.trim();

  if (!token || !dataSourceId) {
    throw new NotionError(
      "Notion isn't configured. Set NOTION_TOKEN and NOTION_DATA_SOURCE_ID in .env.local (see the README).",
    );
  }

  client ??= new Client({ auth: token });
  return { notion: client, dataSourceId };
}

function toNotionError(error: unknown): NotionError {
  if (error instanceof NotionError) return error;

  if (isNotionClientError(error)) {
    switch (error.code) {
      case APIErrorCode.Unauthorized:
        return new NotionError("Notion rejected NOTION_TOKEN. Check that it is correct.");
      case APIErrorCode.ObjectNotFound:
      case APIErrorCode.RestrictedResource:
        return new NotionError(
          `Notion can't find that: ${error.message} Check NOTION_DATA_SOURCE_ID and that the database is shared with your integration.`,
        );
      case APIErrorCode.ValidationError:
        return new NotionError(
          `Notion rejected the request: ${error.message} Make sure the database has the properties Name (title), Skills (multi-select) and URL (URL).`,
        );
      case APIErrorCode.RateLimited:
        return new NotionError("Notion is rate limiting requests. Try again in a moment.");
      case ClientErrorCode.RequestTimeout:
        return new NotionError("Notion took too long to respond. Try again.");
    }
  }

  console.error("Unexpected Notion error:", error);
  return new NotionError("Couldn't reach Notion. Try again in a moment.");
}

async function withNotion<T>(run: (context: Context) => Promise<T>): Promise<T> {
  const context = getContext();

  try {
    return await run(context);
  } catch (error) {
    throw toNotionError(error);
  }
}

function toInterview(page: PageObjectResponse): Interview {
  const title = page.properties[PROPERTY.title];
  const skills = page.properties[PROPERTY.skills];
  const url = page.properties[PROPERTY.url];

  const skillNames = skills?.type === "multi_select" ? skills.multi_select.map((o) => o.name) : [];

  return {
    id: page.id,
    title:
      (title?.type === "title" ? title.title.map((t) => t.plain_text).join("").trim() : "") ||
      "Untitled interview",
    skills: skillNames,
    // Rows added by hand in Notion may lack a URL; derive it from the skills.
    url: (url?.type === "url" && url.url) || generateInterviewUrl(skillNames),
    createdAt: page.created_time,
  };
}

/** All saved interviews, newest first. */
export function listInterviews(): Promise<Interview[]> {
  return withNotion(async ({ notion, dataSourceId }) => {
    const results = await collectPaginatedAPI(notion.dataSources.query, {
      data_source_id: dataSourceId,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 100,
    });

    return results.filter(isFullPage).map(toInterview);
  });
}

/**
 * Saves the interview unless one with the same skills already exists, in which
 * case the existing one is returned and nothing is written.
 */
export async function saveInterview(
  input: Pick<Interview, "title" | "skills" | "url">,
): Promise<{ interview: Interview; created: boolean }> {
  const key = skillsKey(input.skills);
  const existing = (await listInterviews()).find((i) => skillsKey(i.skills) === key);
  if (existing) return { interview: existing, created: false };

  return withNotion(async ({ notion, dataSourceId }) => {
    const page = await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties: {
        [PROPERTY.title]: { title: [{ text: { content: input.title } }] },
        [PROPERTY.skills]: { multi_select: input.skills.map((name) => ({ name })) },
        [PROPERTY.url]: { url: input.url },
      },
    });

    return {
      interview: {
        id: page.id,
        ...input,
        createdAt: isFullPage(page) ? page.created_time : new Date().toISOString(),
      },
      created: true,
    };
  });
}

const stripDashes = (id: string) => id.replaceAll("-", "").toLowerCase();

/**
 * Moves an interview to Notion's trash (the API can't delete permanently, and
 * trashed pages stay restorable from Notion for 30 days).
 */
export function deleteInterview(pageId: string): Promise<void> {
  return withNotion(async ({ notion, dataSourceId }) => {
    // Server actions are public endpoints: only touch pages of our database,
    // not any other page the integration happens to have access to.
    const page = await notion.pages.retrieve({ page_id: pageId });
    const inDatabase =
      isFullPage(page) &&
      page.parent.type === "data_source_id" &&
      stripDashes(page.parent.data_source_id) === stripDashes(dataSourceId);

    if (!inDatabase) throw new NotionError("That page isn't one of your saved interviews.");

    await notion.pages.update({ page_id: pageId, in_trash: true });
  });
}

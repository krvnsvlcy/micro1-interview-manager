import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The SDK captures the global `fetch` when its client is first created, so the
// stub has to be in place before the module under test creates that client.
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

const DATA_SOURCE_ID = "11111111-2222-3333-4444-555555555555";

type NotionModule = typeof import("./notion");
let notion: NotionModule;

beforeAll(async () => {
  process.env.NOTION_TOKEN = "secret_test";
  process.env.NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID;
  notion = await import("./notion");
});

beforeEach(() => {
  fetchMock.mockReset();
  process.env.NOTION_TOKEN = "secret_test";
  process.env.NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID;
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function page(
  id: string,
  skills: string[],
  { title = `Title ${id}`, url = `https://interview.micro1.ai/mock-interview/?skills=${id}`, parent = DATA_SOURCE_ID } = {},
) {
  return {
    object: "page",
    id,
    url: `https://www.notion.so/${id}`, // the SDK's isFullPage() keys off this
    created_time: "2026-10-01T12:00:00.000Z",
    parent: { type: "data_source_id", data_source_id: parent, database_id: "db" },
    properties: {
      Name: { type: "title", title: [{ plain_text: title }] },
      Skills: { type: "multi_select", multi_select: skills.map((name) => ({ name })) },
      URL: { type: "url", url },
    },
  };
}

const list = (results: unknown[], next: string | null = null) =>
  json({ object: "list", results, has_more: next !== null, next_cursor: next });

function request(call: number) {
  const [url, init] = fetchMock.mock.calls[call];
  return {
    url: new URL(url),
    method: init.method,
    body: init.body ? JSON.parse(init.body as string) : undefined,
    headers: Object.fromEntries(
      Object.entries(init.headers as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
    ),
  };
}

describe("listInterviews", () => {
  it("queries the data source newest-first and maps pages to interviews", async () => {
    fetchMock.mockResolvedValueOnce(list([page("a", ["PostgreSQL", "Redis"], { title: "Backend" })]));

    const interviews = await notion.listInterviews();

    const req = request(0);
    expect(req.method).toBe("POST");
    expect(req.url.pathname).toBe(`/v1/data_sources/${DATA_SOURCE_ID}/query`);
    expect(req.headers["authorization"]).toBe("Bearer secret_test");
    expect(req.headers["notion-version"]).toBe("2025-09-03"); // data sources API
    expect(req.body.sorts).toEqual([{ timestamp: "created_time", direction: "descending" }]);
    expect(interviews).toEqual([
      {
        id: "a",
        title: "Backend",
        skills: ["PostgreSQL", "Redis"],
        url: "https://interview.micro1.ai/mock-interview/?skills=a",
        createdAt: "2026-10-01T12:00:00.000Z",
      },
    ]);
  });

  it("follows pagination", async () => {
    fetchMock
      .mockResolvedValueOnce(list([page("a", ["x"])], "cursor-1"))
      .mockResolvedValueOnce(list([page("b", ["y"])]));

    const interviews = await notion.listInterviews();

    expect(interviews.map((i) => i.id)).toEqual(["a", "b"]);
    expect(request(1).body.start_cursor).toBe("cursor-1");
  });

  it("falls back for rows added by hand in Notion", async () => {
    const bare = page("c", ["Go", "Rust"], { title: "", url: "" });
    bare.properties.URL = { type: "url", url: null as unknown as string };
    fetchMock.mockResolvedValueOnce(list([bare]));

    const [interview] = await notion.listInterviews();

    expect(interview.title).toBe("Untitled interview");
    expect(interview.url).toBe("https://interview.micro1.ai/mock-interview/?skills=Go%3BRust");
  });
});

describe("saveInterview", () => {
  const input = {
    title: "My interview",
    skills: ["PostgreSQL", "Redis"],
    url: "https://interview.micro1.ai/mock-interview/?skills=PostgreSQL%3BRedis",
  };

  it("returns the existing interview instead of creating a duplicate", async () => {
    fetchMock.mockResolvedValueOnce(list([page("existing", ["redis", "  postgresql "])]));

    const result = await notion.saveInterview(input);

    expect(result.created).toBe(false);
    expect(result.interview.id).toBe("existing");
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the query, no page creation
  });

  it("creates a page in the data source when there is no match", async () => {
    fetchMock
      .mockResolvedValueOnce(list([page("other", ["Kafka"])]))
      .mockResolvedValueOnce(json(page("new-page", input.skills, { title: input.title, url: input.url })));

    const result = await notion.saveInterview(input);

    const create = request(1);
    expect(create.method).toBe("POST");
    expect(create.url.pathname).toBe("/v1/pages");
    expect(create.body.parent).toEqual({ type: "data_source_id", data_source_id: DATA_SOURCE_ID });
    expect(create.body.properties).toEqual({
      Name: { title: [{ text: { content: "My interview" } }] },
      Skills: { multi_select: [{ name: "PostgreSQL" }, { name: "Redis" }] },
      URL: { url: input.url },
    });
    expect(result).toEqual({
      created: true,
      interview: { id: "new-page", ...input, createdAt: "2026-10-01T12:00:00.000Z" },
    });
  });
});

describe("deleteInterview", () => {
  it("trashes a page that belongs to the data source", async () => {
    fetchMock
      .mockResolvedValueOnce(json(page("p1", ["x"])))
      .mockResolvedValueOnce(json(page("p1", ["x"])));

    await notion.deleteInterview("p1");

    expect(request(0).method).toBe("GET");
    expect(request(1).method).toBe("PATCH");
    expect(request(1).url.pathname).toBe("/v1/pages/p1");
    expect(request(1).body).toEqual({ in_trash: true });
  });

  it("matches the data source id regardless of dashes", async () => {
    process.env.NOTION_DATA_SOURCE_ID = DATA_SOURCE_ID.replaceAll("-", "");
    fetchMock
      .mockResolvedValueOnce(json(page("p1", ["x"])))
      .mockResolvedValueOnce(json(page("p1", ["x"])));

    await expect(notion.deleteInterview("p1")).resolves.toBeUndefined();
  });

  it("refuses to trash pages outside the data source", async () => {
    fetchMock.mockResolvedValueOnce(json(page("p2", ["x"], { parent: "some-other-data-source" })));

    await expect(notion.deleteInterview("p2")).rejects.toThrow("isn't one of your saved interviews");
    expect(fetchMock).toHaveBeenCalledTimes(1); // never reached the PATCH
  });
});

describe("error handling", () => {
  it("reports missing configuration without calling Notion", async () => {
    delete process.env.NOTION_TOKEN;

    await expect(notion.listInterviews()).rejects.toThrow("NOTION_TOKEN and NOTION_DATA_SOURCE_ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns Notion API errors into friendly messages", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ object: "error", status: 401, code: "unauthorized", message: "API token is invalid." }, 401),
    );

    const error = await notion.listInterviews().catch((e) => e);

    expect(error).toBeInstanceOf(notion.NotionError);
    expect(error.message).toBe("Notion rejected NOTION_TOKEN. Check that it is correct.");
  });

  it("explains an unshared or wrong data source, quoting Notion's own message", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { object: "error", status: 404, code: "object_not_found", message: "Could not find data source with ID: abc." },
        404,
      ),
    );

    const error = await notion.listInterviews().catch((e) => e);

    expect(error).toBeInstanceOf(notion.NotionError);
    expect(error.message).toContain("Could not find data source with ID: abc.");
    expect(error.message).toContain("NOTION_DATA_SOURCE_ID");
    expect(error.message).toContain("shared with your integration");
  });

  it("passes Notion's validation message through with a hint about properties", async () => {
    fetchMock.mockResolvedValueOnce(list([])).mockResolvedValueOnce(
      json(
        { object: "error", status: 400, code: "validation_error", message: "Skills is not a property that exists." },
        400,
      ),
    );

    const error = await notion
      .saveInterview({ title: "t", skills: ["a"], url: "u" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(notion.NotionError);
    expect(error.message).toContain("Skills is not a property that exists.");
    expect(error.message).toContain("Name (title), Skills (multi-select) and URL (URL)");
  });
});

# Micro1 Interview Builder

A small local dashboard for building [Micro1](https://interview.micro1.ai) **mock interview** links and keeping them in a Notion database.

Type in the skills you want to practice, get a link like

```
https://interview.micro1.ai/mock-interview/?skills=PostgreSQL%3BDatabase+Design%3BDistributed+Systems
```

and the app saves it to Notion so you can find it again. Notion is the only storage: there is no other database.

> The links are Micro1 *mock* interviews, not official candidate certification interviews. The app never talks to Micro1: it only builds the URL locally.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · the official Notion SDK (`@notionhq/client`).

## Setup

You need Node.js 22.12 or newer (developed on Node 24) and a Notion account. The app itself runs on Node 20.9+; the test runner (Vitest 5) needs 22.12+.

### 1. Create the Notion database

Create a new **database** (a full-page database or an inline one) with exactly these properties. Names are case-sensitive:

| Property  | Type         |
| --------- | ------------ |
| `Name`    | Title        |
| `Skills`  | Multi-select |
| `URL`     | URL          |
| `Created` | Created time |

`Name` is the title column every database starts with. Add the other three. The app fills in `Name`, `Skills` and `URL`; Notion fills in `Created` by itself. Any other columns you add are ignored.

### 2. Create a Notion integration and share the database with it

1. Open Notion's developer portal and create a new **internal** connection (integration) for your workspace. See [Notion's authorization guide](https://developers.notion.com/docs/authorization). Notion's documentation calls these "connections"; older docs and UI call them "integrations".
2. Make sure it can **read, insert and update content**. Deleting an interview moves its page to the trash, which counts as an update.
3. Copy the token from the connection's **Configuration** tab. This is `NOTION_TOKEN`.
4. Open your database in Notion, click **•••** (top right) → **Add connections**, and choose your integration. Until you do this, the API cannot see the database and the app will say so.

### 3. Find the data source ID

Notion's current API (version `2025-09-03`) works with a database's **data source**, which has a different ID from the database itself. In Notion:

> database settings → **Manage data sources** → **Copy data source ID**

This is `NOTION_DATA_SOURCE_ID`. Using the database ID here will not work.

You can also get it from the API: `GET /v1/databases/{database_id}` returns a `data_sources` array whose entries have an `id`.

### 4. Set the environment variables

```bash
cp .env.example .env.local
```

Then fill in `.env.local`:

```
NOTION_TOKEN=ntn_...
NOTION_DATA_SOURCE_ID=...
```

`.env.local` is git-ignored. Both values are read on the server only; nothing is sent to the browser.

### 5. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

If the variables are missing or wrong, the *Saved Interviews* section shows what to fix instead of crashing.

## Scripts

| Command             | What it does                      |
| ------------------- | --------------------------------- |
| `npm run dev`       | Start the dev server              |
| `npm run build`     | Production build                  |
| `npm start`         | Serve the production build        |
| `npm run lint`      | ESLint                            |
| `npm run typecheck` | `tsc --noEmit`                    |
| `npm test`          | Unit tests (Vitest)               |

## How it works

- **Generating:** enter one skill per line. Skills are trimmed, whitespace-collapsed and de-duplicated (case-insensitively). Commas and semicolons also separate skills (they can't appear in a Notion option name or the Micro1 URL), so pasting `PostgreSQL, Redis; Kafka` adds three. The URL comes from the pure function `generateInterviewUrl` in [`src/lib/micro1.ts`](src/lib/micro1.ts).
- **Titles:** if you leave the title blank, one is generated, e.g. `Mock Interview: PostgreSQL, Redis, Kafka +2 more`.
- **Duplicates:** before saving, the app compares the new skills with every saved interview, ignoring case, spacing and order. On a match it shows the existing interview and creates nothing.
- **Deleting:** asks for confirmation, then moves the page to Notion's **trash**. The Notion API cannot delete permanently, and you can restore trashed pages from Notion for about 30 days. The server refuses to trash any page that is not in the configured data source.
- **Server only:** every Notion call lives in [`src/lib/notion.ts`](src/lib/notion.ts) (marked `server-only`) and is reached through the server actions in [`src/app/actions.ts`](src/app/actions.ts). Actions re-validate their input because they are public endpoints.
- **Limits:** at most 20 skills per interview, 100 characters per skill (Notion's limit for multi-select option names), and a 2000-character URL (Notion's limit for URL properties).

## Project layout

```
src/
  app/            page, layout, styles, server actions
  components/     form, saved-interview cards, dialog, toasts
  lib/
    micro1.ts     URL generation (pure)
    skills.ts     skill normalization, duplicate key, validation (pure)
    notion.ts     list / save / delete against Notion (server-only)
```

## Notes

- **No authentication.** This is a local-only tool: anyone who can reach the running app can read and change the database it points at. Do not deploy it publicly as is.
- Next.js `cacheComponents` is on (the scaffold default), so the page is a prerendered shell and the interview list streams in fresh from Notion on each request.

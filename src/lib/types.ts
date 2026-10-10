export type Interview = {
  id: string;
  title: string;
  skills: string[];
  url: string;
  /** ISO timestamp of the Notion page's creation. */
  createdAt: string;
};

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

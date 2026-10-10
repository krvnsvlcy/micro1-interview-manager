import { connection } from "next/server";
import { listInterviews, NotionError } from "@/lib/notion";
import { AlertIcon } from "./icons";
import { InterviewCard } from "./interview-card";

// Pinned so dates read the same wherever the page is rendered.
const formatDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export async function SavedInterviews() {
  // Reading env vars doesn't make a component dynamic. Without this, a build
  // without Notion credentials would bake the "not configured" error into the
  // prerendered shell.
  await connection();

  let interviews;

  try {
    interviews = await listInterviews();
  } catch (error) {
    const message = error instanceof NotionError ? error.message : "Couldn't load interviews.";

    return (
      <div role="alert" className="flex items-start gap-3 border-b border-line px-5 py-4 text-sm sm:px-8 lg:px-6">
        <AlertIcon className="mt-0.5 text-danger" />
        <div>
          <p className="font-semibold">Couldn&apos;t load your interviews</p>
          <p className="mt-1 font-light text-muted">{message}</p>
        </div>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center text-muted">
        <span className="size-14 rounded-full border border-current/40" />
        <div>
          <p className="font-semibold text-ink">No interviews yet</p>
          <p className="mt-1 max-w-xs text-sm font-light">
            Generate your first interview and it will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul>
      {interviews.map((interview) => (
        <InterviewCard
          key={interview.id}
          interview={interview}
          createdLabel={formatDate.format(new Date(interview.createdAt))}
        />
      ))}
    </ul>
  );
}

export function SavedInterviewsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading interviews">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-3 border-b border-line px-5 py-4 sm:px-8 lg:px-6">
          <div className="h-2.5 w-24 bg-subtle" />
          <div className="h-5 w-2/3 bg-subtle" />
          <div className="flex gap-1.5">
            <div className="h-6 w-16 bg-subtle" />
            <div className="h-6 w-20 bg-subtle" />
          </div>
          <div className="h-8 w-40 rounded-full bg-subtle" />
        </div>
      ))}
    </div>
  );
}

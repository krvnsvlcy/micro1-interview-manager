import { Suspense } from "react";
import { InterviewForm } from "@/components/interview-form";
import { SavedInterviews, SavedInterviewsSkeleton } from "@/components/saved-interviews";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    // From `lg` up the app fills the screen and only the panes scroll; below
    // that the panes stack and the page scrolls normally.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <main className="flex min-w-0 flex-1 flex-col px-5 py-8 sm:px-8 lg:overflow-y-auto lg:px-10 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl leading-[0.95] font-black tracking-tighter lowercase sm:text-6xl xl:text-7xl">
            Micro1<span className="sr-only"> Interview Builder</span>
          </h1>
          <ThemeToggle />
        </div>
        <p className="mt-4 max-w-xl text-lg font-light text-ink/75">
          Add the skills you want to practice and get a mock interview link.
        </p>

        <InterviewForm />

        <p className="mt-8 text-xs text-muted">
          Links open Micro1 mock interviews, not official certification interviews.
        </p>
      </main>

      <aside
        aria-labelledby="saved-interviews"
        className="flex shrink-0 flex-col border-t border-line bg-surface lg:min-h-0 lg:w-[26rem] lg:border-t-0 lg:border-l xl:w-[30rem]"
      >
        <h2
          id="saved-interviews"
          className="shrink-0 border-b border-line px-5 py-4 text-2xl leading-none font-black tracking-tight lowercase sm:px-8 lg:px-6"
        >
          Saved Interviews
        </h2>
        {/* No padding here: rows run edge to edge and carry their own inset. */}
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {/* Fresh from Notion on every request; the shell is prerendered. */}
          <Suspense fallback={<SavedInterviewsSkeleton />}>
            <SavedInterviews />
          </Suspense>
        </div>
      </aside>
    </div>
  );
}

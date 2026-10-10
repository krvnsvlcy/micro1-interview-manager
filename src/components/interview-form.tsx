"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { createInterviewAction } from "@/app/actions";
import { MAX_SKILLS, MAX_TITLE_LENGTH, normalizeSkills, validateInterviewInput } from "@/lib/skills";
import type { Interview } from "@/lib/types";
import { CheckIcon, ExternalLinkIcon, InfoIcon, SpinnerIcon } from "./icons";
import { CopyButton } from "./copy-button";
import { SkillTags } from "./skill-tags";
import { useToast } from "./toast";

type Result = { interview: Interview; existing: boolean };

export function InterviewForm() {
  const [title, setTitle] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isPending, startTransition] = useTransition();
  // A ref (not state) so a fast double-click is blocked before React re-renders.
  const submitting = useRef(false);
  const toast = useToast();
  // One skill per line; the same cleanup the server applies.
  const skills = normalizeSkills([skillsText]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;

    const input = { title, skills };
    const validation = validateInterviewInput(input);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    submitting.current = true;
    startTransition(async () => {
      try {
        const response = await createInterviewAction(input);

        if (!response.ok) {
          toast.error(response.error);
          return;
        }

        setResult({ interview: response.interview, existing: response.existing });
        if (response.existing) {
          toast.info("You already have an interview with these skills.");
        } else {
          toast.success("Interview saved to Notion.");
          setTitle("");
          setSkillsText("");
        }
      } catch {
        toast.error("Couldn't reach the server. Try again.");
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    // `flex-1` all the way down lets the skills field soak up whatever height
    // the pane has left.
    <section aria-label="New interview" className="mt-10 flex flex-1 flex-col">
      {/* Below `2xl` the generated link sits under the form (row 2); on very wide
          screens it gets its own column beside it. */}
      <div className="grid flex-1 grid-rows-[1fr_auto] gap-x-12 2xl:grid-cols-[minmax(0,1fr)_26rem] 2xl:grid-rows-[1fr]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label htmlFor="title" className="label block">
              Title <span className="opacity-70">(optional)</span>
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Generated from your skills if left blank"
              autoComplete="off"
              disabled={isPending}
              className="field"
            />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label htmlFor="skills" className="label block">
              Skills
            </label>
            <textarea
              id="skills"
              value={skillsText}
              onChange={(event) => setSkillsText(event.target.value)}
              // Tidy up when leaving: a pasted "a, b, c" becomes one skill per line.
              onBlur={() => setSkillsText(skills.join("\n"))}
              rows={8}
              placeholder={"PostgreSQL\nDatabase Design\nDistributed Systems"}
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
              aria-describedby="skills-hint"
              className="field min-h-48 flex-1 resize-none"
            />
            <div id="skills-hint" className="flex justify-between gap-3 text-xs text-muted">
              <p>One skill per line. A pasted comma-separated list works too.</p>
              <span className={`shrink-0 tabular-nums ${skills.length > MAX_SKILLS ? "text-danger" : ""}`}>
                {skills.length}/{MAX_SKILLS}
              </span>
            </div>
          </div>

          {/* The form is a flex column, so opt out of stretching above phone width. */}
          <button type="submit" disabled={isPending} className="btn btn-primary w-full sm:w-auto sm:self-start">
            {isPending && <SpinnerIcon />}
            {isPending ? "Generating…" : "Generate Interview"}
          </button>
        </form>

        <ResultPanel result={result} />
      </div>
    </section>
  );
}

function ResultPanel({ result }: { result: Result | null }) {
  // The live region always exists, so a new result is announced when it appears.
  return (
    <div aria-live="polite">
      {result ? <GeneratedLink {...result} /> : <NoLinkYet />}
    </div>
  );
}

function NoLinkYet() {
  // Only worth the space when it has its own column.
  return (
    <div className="hidden h-full min-h-72 flex-col items-center justify-center gap-4 px-6 text-center text-muted 2xl:flex">
      <span className="size-14 rounded-full border border-current/40" />
      <div>
        <p className="font-semibold text-ink">No link yet</p>
        <p className="mt-1 text-sm font-light">Add some skills and press generate.</p>
      </div>
    </div>
  );
}

function GeneratedLink({ interview, existing }: Result) {
  return (
    <div className="mt-10 bg-tile p-6 text-tile-ink 2xl:mt-0">
      <p className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.1em] uppercase opacity-80">
        {existing ? <InfoIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
        {existing ? "Already saved, showing existing" : "Saved to Notion"}
      </p>
      <h3 className="mt-4 text-2xl leading-tight font-black tracking-tight break-words">{interview.title}</h3>
      <div className="mt-3">
        <SkillTags skills={interview.skills} tone="tile" />
      </div>
      <p className="mt-5 border border-current/25 p-3 font-mono text-xs break-all select-all">{interview.url}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={interview.url} target="_blank" rel="noopener noreferrer" className="btn">
          <ExternalLinkIcon />
          Open
        </a>
        <CopyButton text={interview.url} />
      </div>
    </div>
  );
}

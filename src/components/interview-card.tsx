"use client";

import { useState, useTransition } from "react";
import { deleteInterviewAction } from "@/app/actions";
import type { Interview } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";
import { CopyButton } from "./copy-button";
import { ExternalLinkIcon, TrashIcon } from "./icons";
import { SkillTags } from "./skill-tags";
import { useToast } from "./toast";

type Props = {
  interview: Interview;
  /** Formatted on the server so the text can't differ between server and browser. */
  createdLabel: string;
};

export function InterviewCard({ interview, createdLabel }: Props) {
  const [confirming, setConfirming] = useState(false);
  // Hide the card right away; the refreshed list streams in a moment later.
  const [deleted, setDeleted] = useState(false);
  const [isDeleting, startTransition] = useTransition();
  const toast = useToast();

  function remove() {
    startTransition(async () => {
      try {
        const response = await deleteInterviewAction(interview.id);

        if (response.ok) {
          setDeleted(true);
          toast.success("Interview deleted.");
        } else {
          toast.error(response.error);
        }
      } catch {
        toast.error("Couldn't reach the server. Try again.");
      } finally {
        setConfirming(false);
      }
    });
  }

  if (deleted) return null;

  return (
    // Flat row: no box, just a hairline. The inset matches the pane title.
    <li className="border-b border-line px-5 py-4 sm:px-8 lg:px-6">
      <p className="label flex items-center justify-between gap-3">
        <time dateTime={interview.createdAt}>{createdLabel}</time>
        <span>
          {interview.skills.length} {interview.skills.length === 1 ? "skill" : "skills"}
        </span>
      </p>

      <h3 className="mt-3 line-clamp-2 text-lg leading-snug font-semibold break-words" title={interview.title}>
        {interview.title}
      </h3>

      <div className="mt-3">
        <SkillTags skills={interview.skills} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <a href={interview.url} target="_blank" rel="noopener noreferrer" className="btn">
          <ExternalLinkIcon />
          Open
        </a>
        <CopyButton text={interview.url} />
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger">
          <TrashIcon />
          Delete
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete this interview?"
          description={
            <>
              <span className="font-semibold text-ink">{interview.title}</span> will be moved to the trash in
              Notion.
            </>
          }
          confirmLabel="Delete"
          pending={isDeleting}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
    </li>
  );
}

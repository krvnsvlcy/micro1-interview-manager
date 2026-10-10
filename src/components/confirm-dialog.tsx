"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SpinnerIcon } from "./icons";

type Props = {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A destructive-action confirmation built on the native modal <dialog>. */
export function ConfirmDialog({ title, description, confirmLabel, pending, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Mounted only while open, so opening it is just showing it on mount.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      // Escape fires `cancel`; keep the dialog up while the request is running.
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      // A click on the backdrop lands on the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-2xl leading-none font-black tracking-tight lowercase">
          {title}
        </h2>
        <div id="confirm-description" className="mt-3 text-sm font-light text-muted">
          {description}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
        <button type="button" onClick={onCancel} disabled={pending} autoFocus className="btn">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="btn border-transparent bg-danger text-canvas hover:bg-danger/85"
        >
          {pending && <SpinnerIcon />}
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

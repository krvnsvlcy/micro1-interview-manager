"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "./icons";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };

type Toaster = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<Toaster | null>(null);

const DISMISS_AFTER_MS = 4500;

const STYLE: Record<Kind, { icon: ReactNode; className: string }> = {
  success: { icon: <CheckIcon />, className: "text-success" },
  error: { icon: <AlertIcon />, className: "text-danger" },
  info: { icon: <InfoIcon />, className: "text-ring" },
};

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toaster = useMemo<Toaster>(() => {
    const show = (kind: Kind) => (message: string) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    };

    return { success: show("success"), error: show("error"), info: show("info") };
  }, [dismiss]);

  return (
    <ToastContext value={toaster}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
      >
        {toasts.map(({ id, kind, message }) => (
          <div
            key={id}
            role={kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-2.5 border border-line bg-surface p-3.5 text-sm font-medium shadow-2xl"
          >
            <span className={`mt-0.5 ${STYLE[kind].className}`}>{STYLE[kind].icon}</span>
            <p className="min-w-0 flex-1 break-words">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label="Dismiss notification"
              className="-m-1 cursor-pointer rounded-full p-1 text-muted hover:text-ink"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): Toaster {
  const toaster = useContext(ToastContext);
  if (!toaster) throw new Error("useToast must be used inside <ToastProvider>");
  return toaster;
}

"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";
import { useToast } from "./toast";

export function CopyButton({ text, disabled = false }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
      return;
    }

    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={copy} disabled={disabled} className="btn">
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

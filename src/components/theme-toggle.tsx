"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Both icons are rendered and swapped with CSS, so the server-rendered HTML
  // matches the client regardless of the theme the browser resolves.
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light and dark mode"
      className="btn size-9 p-0"
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="hidden size-4 dark:block" />
    </button>
  );
}

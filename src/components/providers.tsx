"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

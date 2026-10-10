import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Cairo is a variable font: Black for display, SemiBold for UI, Light for body.
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Micro1 Interview Builder",
  description: "Generate Micro1 mock interview links and keep them in Notion.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

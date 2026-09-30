import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionPreferences } from "@/lib/session-preferences";

import "./globals.css";

// Self-hosted (next/font/local), not next/font/google: Turbopack's build-time
// Google Fonts fetch is intermittently flaky (Google occasionally returns a
// multi-query-param URL shape Turbopack's resolver rejects with "queries have
// exactly one entry"), which broke a Vercel deploy though the same commit
// built fine locally. See docs/DECISIONS.md ADR-034.
const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const notoSansTamil = localFont({
  src: [
    { path: "./fonts/noto-sans-tamil-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-tamil-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-sans-tamil-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-sans-tamil-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kaasu",
  description: "Personal finance OS",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, theme } = await getSessionPreferences();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-locale={locale}
      className={`${inter.variable} ${notoSansTamil.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider attribute="class" defaultTheme={theme} enableSystem>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster richColors />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

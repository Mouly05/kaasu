import type { Metadata } from "next";
import { Inter, Noto_Sans_Tamil } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSessionPreferences } from "@/lib/session-preferences";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
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

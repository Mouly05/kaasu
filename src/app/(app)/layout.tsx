import Link from "next/link";
import { Settings } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { requirePageUser } from "@/lib/auth-helpers";

// Minimal frame until Module 3 builds the real shell (sidebar, bottom nav, ⌘K).
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requirePageUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/60 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link
            href="/"
            className="focus-visible:ring-ring/50 rounded-lg focus-visible:ring-3 focus-visible:outline-none"
          >
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href="/settings">
              <Settings />
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <Toaster richColors />
    </div>
  );
}

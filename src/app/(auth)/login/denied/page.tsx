import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Access denied · Kaasu" };

export default function DeniedPage() {
  return (
    <Card className="border-border/60 ring-border/60 rounded-2xl py-10 shadow-none">
      <CardContent className="flex flex-col items-center gap-6 px-8 text-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400"
        >
          <ShieldX className="size-7" />
        </span>
        <div className="space-y-2">
          <h1 className="text-lg font-medium">This Kaasu is private</h1>
          <p className="text-muted-foreground text-sm">
            You signed in with GitHub, but that account’s email isn’t on the invite list. Nothing
            was saved.
          </p>
        </div>
        <div className="bg-muted/50 text-muted-foreground w-full space-y-2 rounded-xl p-4 text-left text-sm">
          <p className="text-foreground font-medium">What you can do</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Try again with the GitHub account you were invited with.</li>
            <li>
              Signed in to the wrong account?{" "}
              <a
                href="https://github.com/logout"
                target="_blank"
                rel="noreferrer"
                className="text-foreground font-medium underline underline-offset-4"
              >
                Sign out of GitHub
              </a>{" "}
              first.
            </li>
            <li>Ask the owner to add your primary GitHub email.</li>
          </ul>
        </div>
        <Button asChild variant="outline" size="lg" className="h-11 w-full rounded-xl">
          <Link href="/login">
            <ArrowLeft />
            Back to sign in
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

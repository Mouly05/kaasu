"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-border/60 mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border p-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-medium">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          We couldn’t load this page. Your data is safe. Please try again.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

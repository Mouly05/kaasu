"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useShell } from "./shell-shortcuts";

export function CommandPaletteTrigger({ label }: { label: string }) {
  const { openCommandPalette } = useShell();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={openCommandPalette}
      className="text-muted-foreground h-9 w-full max-w-xs justify-start gap-2 sm:w-64"
    >
      <Search className="size-4" />
      <span className="truncate">{label}</span>
      <kbd className="bg-muted ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
    </Button>
  );
}

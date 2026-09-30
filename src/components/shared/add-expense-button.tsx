"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useShell } from "./shell-shortcuts";

/** Desktop-only Quick Add entry point in the header — mobile already has BottomNav's floating "+". */
export function AddExpenseButton({ label }: { label: string }) {
  const { openQuickAdd } = useShell();

  return (
    <Button type="button" size="sm" onClick={openQuickAdd} className="hidden md:inline-flex">
      <Plus />
      {label}
    </Button>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { MerchantRuleSummary } from "@/features/expenses/queries";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";

import { CommandPalette } from "./command-palette";
import { QuickAddSheet } from "./quick-add-sheet";

interface ShellContextValue {
  openQuickAdd: () => void;
  openCommandPalette: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

/** Opens the global Quick Add sheet / Command Palette from anywhere in the shell (sidebar, bottom nav, etc). */
export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used within ShellShortcuts");
  return context;
}

export interface ShellShortcutsProps {
  children: ReactNode;
  categories: CategorySummary[];
  accounts: AccountSummary[];
  merchantRules: MerchantRuleSummary[];
}

/** Owns Quick Add / Command Palette open state and the ⌘K / ⌘N global shortcuts. */
export function ShellShortcuts({
  children,
  categories,
  accounts,
  merchantRules,
}: ShellShortcutsProps) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      } else if (key === "n") {
        event.preventDefault();
        setQuickAddOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      openQuickAdd: () => setQuickAddOpen(true),
      openCommandPalette: () => setCommandOpen(true),
    }),
    [],
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        categories={categories}
        accounts={accounts}
        merchantRules={merchantRules}
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onAddExpense={() => {
          setCommandOpen(false);
          setQuickAddOpen(true);
        }}
      />
    </ShellContext.Provider>
  );
}

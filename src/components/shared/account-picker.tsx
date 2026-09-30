"use client";

import { useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import type { AccountSummary } from "@/features/settings/queries";
import { cn } from "@/lib/utils";

export interface AccountPickerProps {
  accounts: AccountSummary[];
  value?: string | null;
  onChange: (accountId: string) => void;
}

export function AccountPicker({ accounts, value, onChange }: AccountPickerProps) {
  const t = useTranslations("shared.accountPicker");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q));
  }, [accounts, query]);

  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder={t("search")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t("search")}
      />
      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">{t("empty")}</p>
      ) : (
        <div role="listbox" className="flex flex-col gap-1">
          {filtered.map((account) => {
            const active = account.id === value;
            return (
              <button
                key={account.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onChange(account.id)}
                className={cn(
                  "focus-visible:ring-ring/50 flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Landmark className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{account.name}</span>
                {account.last4 && (
                  <span className="text-muted-foreground text-xs">•••• {account.last4}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

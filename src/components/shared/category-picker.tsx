"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import type { CategorySummary } from "@/features/settings/queries";
import { cn } from "@/lib/utils";

export interface CategoryPickerProps {
  categories: CategorySummary[];
  value?: string | null;
  onChange: (categoryId: string) => void;
  /** Category ids to show first, most-recent first. */
  recentIds?: string[];
}

function resolveIcon(name: string): Icons.LucideIcon {
  const icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  return icon ?? Icons.Circle;
}

export function CategoryPicker({ categories, value, onChange, recentIds = [] }: CategoryPickerProps) {
  const t = useTranslations("shared.categoryPicker");
  const [query, setQuery] = useState("");

  const ordered = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const recent = recentIds.map((id) => byId.get(id)).filter((c): c is CategorySummary => !!c);
    const recentIdSet = new Set(recent.map((c) => c.id));
    const rest = categories.filter((c) => !recentIdSet.has(c.id));
    return [...recent, ...rest];
  }, [categories, recentIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (c) => c.name.toLowerCase().includes(q) || c.nameTa.toLowerCase().includes(q),
    );
  }, [ordered, query]);

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
        <div role="listbox" aria-label={t("all")} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {filtered.map((category) => {
            const Icon = resolveIcon(category.icon);
            const active = category.id === value;
            return (
              <button
                key={category.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onChange(category.id)}
                className={cn(
                  "focus-visible:ring-ring/50 flex min-h-11 flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs transition-colors focus-visible:ring-3 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-5" style={{ color: category.color }} aria-hidden />
                <span className="line-clamp-2 leading-tight">{category.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

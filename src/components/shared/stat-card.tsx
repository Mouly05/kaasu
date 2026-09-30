import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

/** A rounded-2xl stat tile: label, big value (usually a MoneyText), optional icon and hint. */
export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card flex flex-col gap-2 rounded-2xl border p-5",
        className,
      )}
    >
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {Icon && <Icon className="size-4" aria-hidden />}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

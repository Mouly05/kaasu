import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

import type { Nudge } from "../guidance";

const SEVERITY_ICON = { critical: OctagonAlert, warning: AlertTriangle, info: Info } as const;
const SEVERITY_CLASS = {
  critical: "text-negative",
  warning: "text-warning",
  info: "text-muted-foreground",
} as const;

export interface DailyGuidanceCardProps {
  nudges: Nudge[];
}

/** 1–3 plain-language nudges, most severe first. Renders nothing if there's nothing to say. */
export async function DailyGuidanceCard({ nudges }: DailyGuidanceCardProps) {
  const t = await getTranslations("expenses.guidance");
  if (nudges.length === 0) return null;

  return (
    <div className="border-border/60 bg-card space-y-3 rounded-2xl border p-4">
      <p className="text-sm font-medium">{t("title")}</p>
      <ul className="space-y-2">
        {nudges.map((nudge) => {
          const Icon = SEVERITY_ICON[nudge.severity];
          return (
            <li key={nudge.id} className="flex items-start gap-2 text-sm">
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", SEVERITY_CLASS[nudge.severity])}
                aria-hidden
              />
              <span>{nudge.message}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

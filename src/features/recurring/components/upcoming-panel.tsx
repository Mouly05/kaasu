import { useTranslations } from "next-intl";

import { EmptyState, MoneyText } from "@/components/shared";

import type { UpcomingDue } from "../queries";

export interface UpcomingPanelProps {
  items: UpcomingDue[];
}

/** The next 7 days of dues — presentational only, so the Dashboard module can reuse it as-is. */
export function UpcomingPanel({ items }: UpcomingPanelProps) {
  const t = useTranslations("recurring.upcoming");

  return (
    <div className="border-border/60 bg-card space-y-3 rounded-2xl border p-5">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="divide-border/60 divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="text-muted-foreground shrink-0">
                {item.daysUntilDue === 0 ? t("dueToday") : t("dueInDays", { days: item.daysUntilDue })}
              </span>
              <MoneyText paise={item.amountPaise} className="shrink-0" colorBySign={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

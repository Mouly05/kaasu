import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TrendInsightsListProps {
  insights: string[];
}

/** Rule-based trend observations from recent months. Nothing renders when there's too little history. */
export function TrendInsightsList({ insights }: TrendInsightsListProps) {
  const t = useTranslations("salary.insights");
  if (insights.length === 0) return null;

  return (
    <section className="border-border/60 space-y-2 rounded-2xl border p-4">
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li key={insight} className="text-muted-foreground flex gap-2 text-sm">
            <Lightbulb className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
            {insight}
          </li>
        ))}
      </ul>
    </section>
  );
}

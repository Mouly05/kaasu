"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useTranslations } from "next-intl";

import { formatMonthLabel, type MonthKey } from "@/lib/dates";
import { formatINR } from "@/lib/money";

export interface IncomeHistoryChartProps {
  history: { monthKey: MonthKey; incomePaise: number }[];
}

interface TooltipPayloadItem {
  value: number;
}

function IncomeTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border-border/60 rounded-lg border px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium tabular-nums">{formatINR(payload[0]!.value)}</p>
    </div>
  );
}

/** Single-series monthly income history — a title names the series, so no legend is needed. */
export function IncomeHistoryChart({ history }: IncomeHistoryChartProps) {
  const t = useTranslations("salary.incomeHistory");
  const data = history.map((point) => ({
    month: formatMonthLabel(point.monthKey),
    incomePaise: point.incomePaise,
  }));

  return (
    <section className="border-border/60 space-y-3 rounded-2xl border p-4 text-positive">
      <h2 className="text-foreground text-sm font-semibold">{t("title")}</h2>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Tooltip content={<IncomeTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="incomePaise" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

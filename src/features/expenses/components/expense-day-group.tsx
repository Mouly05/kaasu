import type { ReactNode } from "react";

import { MoneyText } from "@/components/shared";
import { formatDay } from "@/lib/dates";

export interface ExpenseDayGroupProps {
  date: Date;
  totalPaise: number;
  children: ReactNode;
}

/** A day's transactions under a sticky header showing the date and day total. */
export function ExpenseDayGroup({ date, totalPaise, children }: ExpenseDayGroupProps) {
  return (
    <div>
      <div className="bg-background/95 sticky top-14 z-1 flex items-center justify-between border-b py-2 backdrop-blur">
        <span className="text-sm font-medium">{formatDay(date, "long")}</span>
        <MoneyText paise={totalPaise} colorBySign={false} className="text-sm font-medium" />
      </div>
      <div className="divide-border/60 divide-y">{children}</div>
    </div>
  );
}

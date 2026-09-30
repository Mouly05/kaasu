import { useTranslations } from "next-intl";

import { EmptyState, MoneyText } from "@/components/shared";
import type { RecurringKind } from "@/lib/db/models/recurring";

import { computeMonthlyTotal } from "../service";
import type { RecurringWithStatus } from "../queries";
import { RecurringCard, type EmiAction } from "./recurring-card";

export interface RecurringKindGroupProps {
  kind: RecurringKind;
  items: RecurringWithStatus[];
  emiActionsByRecurringId?: Map<string, EmiAction>;
}

/** One kind section (Rent, SIP, EMIs, …): a subtotal header and its cards. */
export function RecurringKindGroup({ kind, items, emiActionsByRecurringId }: RecurringKindGroupProps) {
  const t = useTranslations("recurring");

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{t(`kinds.${kind}`)}</h2>
        {items.length > 0 && (
          <MoneyText paise={computeMonthlyTotal(items)} className="text-muted-foreground text-sm" colorBySign={false} />
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("emptyKind")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RecurringCard key={item.id} item={item} emiAction={emiActionsByRecurringId?.get(item.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

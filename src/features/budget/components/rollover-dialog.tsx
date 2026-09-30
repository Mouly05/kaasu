"use client";

import { useState } from "react";
import { PiggyBank } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { MoneyText } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyRollover } from "@/features/budget/actions";
import type { RolloverCandidate } from "@/features/budget/service";
import { formatINR } from "@/lib/money";

export interface RolloverDialogProps {
  monthKey: string;
  candidates: RolloverCandidate[];
  totalPaise: number;
  goals: { id: string; title: string }[];
}

const NEXT_MONTH_BUFFER = "next_month_buffer";

/** Month-end prompt: send this month's unspent total to next month's buffer, or into a chosen goal. */
export function RolloverDialog({ monthKey, candidates, totalPaise, goals }: RolloverDialogProps) {
  const t = useTranslations("budget.rollover");
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<string>(NEXT_MONTH_BUFFER);
  const [pending, setPending] = useState(false);

  if (totalPaise <= 0) return null;

  async function handleApply() {
    setPending(true);
    const result = await applyRollover({
      monthKey,
      destination:
        destination === NEXT_MONTH_BUFFER ? { type: "next_month_buffer" } : { type: "goal", goalId: destination },
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("applied", { amount: formatINR(totalPaise) }));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <PiggyBank /> {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <ul className="space-y-1 text-sm">
            {candidates.map((candidate) => (
              <li key={candidate.label} className="flex justify-between">
                <span>{candidate.label}</span>
                <MoneyText paise={candidate.unspentPaise} colorBySign={false} />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>{t("total")}</span>
            <MoneyText paise={totalPaise} colorBySign={false} />
          </div>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("destination")}</span>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEXT_MONTH_BUFFER}>{t("nextMonthBuffer")}</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={() => void handleApply()} disabled={pending}>
            {t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

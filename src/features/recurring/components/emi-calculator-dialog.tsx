"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { AccountPicker, AmountInput, CategoryPicker, DatePickerIST, MoneyText } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatDay, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";

import { createEmi } from "../actions";
import { calculateEmi, type EmiCalculatorResult } from "../emi";
import { buildEmiInstallments } from "../service";

export interface EmiCalculatorDialogProps {
  categories: CategorySummary[];
  accounts: AccountSummary[];
}

interface FormValue {
  title: string;
  pricePaise: number | null;
  downPaymentPaise: number | null;
  tenureMonths: number;
  interestRatePct: number;
  processingFeePaise: number | null;
  gstOnFeePercent: number;
  dayOfMonth: number;
  startDate: Date;
  categoryId: string | null;
  accountId: string | null;
  lender: string;
}

function emptyForm(accountId: string | null): FormValue {
  return {
    title: "",
    pricePaise: null,
    downPaymentPaise: 0,
    tenureMonths: 9,
    interestRatePct: 0,
    processingFeePaise: 0,
    gstOnFeePercent: 18,
    dayOfMonth: 1,
    startDate: todayIST(),
    categoryId: null,
    accountId,
    lender: "",
  };
}

function tryCalculate(form: FormValue): EmiCalculatorResult | null {
  if (!form.pricePaise || form.pricePaise <= 0) return null;
  try {
    return calculateEmi({
      pricePaise: form.pricePaise,
      downPaymentPaise: form.downPaymentPaise ?? 0,
      tenureMonths: form.tenureMonths,
      interestRatePct: form.interestRatePct,
      processingFeePaise: form.processingFeePaise ?? 0,
      gstOnFeePercent: form.gstOnFeePercent,
    });
  } catch {
    return null; // mid-typing invalid combos (e.g. down payment briefly exceeding price)
  }
}

export function EmiCalculatorDialog({ categories, accounts }: EmiCalculatorDialogProps) {
  const t = useTranslations("recurring.calculator");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormValue>(() => emptyForm(accounts[0]?.id ?? null));
  const [pending, setPending] = useState(false);

  const calc = useMemo(() => tryCalculate(form), [form]);
  const installments = useMemo(
    () => (calc ? buildEmiInstallments(calc, form.startDate, form.dayOfMonth) : []),
    [calc, form.startDate, form.dayOfMonth],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setForm(emptyForm(accounts[0]?.id ?? null));
  }

  async function handleSubmit() {
    if (!calc || !form.title.trim() || !form.categoryId || !form.accountId) return;
    setPending(true);
    const result = await createEmi({
      title: form.title,
      pricePaise: form.pricePaise,
      downPaymentPaise: form.downPaymentPaise ?? 0,
      tenureMonths: form.tenureMonths,
      interestRatePct: form.interestRatePct,
      processingFeePaise: form.processingFeePaise ?? 0,
      gstOnFeePercent: form.gstOnFeePercent,
      categoryId: form.categoryId,
      accountId: form.accountId,
      dayOfMonth: form.dayOfMonth,
      startDate: form.startDate,
      lender: form.lender || undefined,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("created"));
    handleOpenChange(false);
  }

  const canSave = !!calc && !!form.title.trim() && !!form.categoryId && !!form.accountId;

  const body = (
    <div className="flex flex-col gap-4 px-4 pb-4 sm:px-0">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="emi-title">
          {t("itemTitle")}
        </label>
        <Input id="emi-title" value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("price")}</span>
          <AmountInput value={form.pricePaise} onChangePaise={(paise) => setForm((f) => ({ ...f, pricePaise: paise }))} aria-label={t("price")} />
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("downPayment")}</span>
          <AmountInput
            value={form.downPaymentPaise}
            onChangePaise={(paise) => setForm((f) => ({ ...f, downPaymentPaise: paise ?? 0 }))}
            aria-label={t("downPayment")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emi-tenure">
            {t("tenure")}
          </label>
          <Input
            id="emi-tenure"
            type="number"
            min={1}
            max={60}
            value={form.tenureMonths}
            onChange={(event) => setForm((f) => ({ ...f, tenureMonths: Number(event.target.value) || 1 }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emi-rate">
            {t("interestRate")}
          </label>
          <Input
            id="emi-rate"
            type="number"
            min={0}
            step="0.1"
            value={form.interestRatePct}
            onChange={(event) => setForm((f) => ({ ...f, interestRatePct: Number(event.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("processingFee")}</span>
          <AmountInput
            value={form.processingFeePaise}
            onChangePaise={(paise) => setForm((f) => ({ ...f, processingFeePaise: paise ?? 0 }))}
            aria-label={t("processingFee")}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emi-gst">
            {t("gst")}
          </label>
          <Input
            id="emi-gst"
            type="number"
            min={0}
            step="0.1"
            value={form.gstOnFeePercent}
            onChange={(event) => setForm((f) => ({ ...f, gstOnFeePercent: Number(event.target.value) || 0 }))}
          />
        </div>
      </div>

      {form.interestRatePct === 0 && <p className="text-muted-foreground text-xs">{t("paymentMethodNote")}</p>}

      {calc && (
        <div className="border-border/60 bg-muted/30 space-y-2 rounded-xl border p-4">
          {calc.isNoCostEmi && calc.noCostGapPaise > 0 && (
            <p className="text-warning text-xs font-medium">
              {t("noCostWarning", { amount: formatINR(calc.noCostGapPaise) })}
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-muted-foreground">{t("monthlyEmi")}</span>
            <MoneyText paise={calc.monthlyEmiPaise} className="text-right font-semibold" colorBySign={false} />
            <span className="text-muted-foreground">{t("totalPaid")}</span>
            <MoneyText paise={calc.totalPaidPaise} className="text-right" colorBySign={false} />
            <span className="text-muted-foreground">{t("extraCost")}</span>
            <MoneyText paise={calc.extraCostVsCashPaise} className="text-right" colorBySign={false} />
            <span className="text-muted-foreground">{t("effectiveCost")}</span>
            <span className="text-right tabular-nums">{calc.effectiveAnnualCostPercent.toFixed(2)}%</span>
          </div>
          <div className="max-h-40 overflow-y-auto pt-1">
            <table className="w-full text-xs">
              <tbody>
                {installments.map((row, index) => (
                  <tr key={index} className="border-border/40 border-t">
                    <td className="text-muted-foreground py-1">{formatDay(row.dueDate)}</td>
                    <td className="py-1 text-right tabular-nums">{formatINR(row.amountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="emi-day-of-month">
            {t("dayOfMonth")}
          </label>
          <Input
            id="emi-day-of-month"
            type="number"
            min={1}
            max={31}
            value={form.dayOfMonth}
            onChange={(event) => setForm((f) => ({ ...f, dayOfMonth: Number(event.target.value) || 1 }))}
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("startDate")}</span>
          <DatePickerIST value={form.startDate} onChange={(date) => setForm((f) => ({ ...f, startDate: date }))} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="emi-lender">
          {t("lender")}
        </label>
        <Input id="emi-lender" value={form.lender} onChange={(event) => setForm((f) => ({ ...f, lender: event.target.value }))} />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("category")}</span>
        <CategoryPicker categories={categories} value={form.categoryId} onChange={(categoryId) => setForm((f) => ({ ...f, categoryId }))} />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">{t("account")}</span>
        <AccountPicker accounts={accounts} value={form.accountId} onChange={(accountId) => setForm((f) => ({ ...f, accountId }))} />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
        {t("cancel")}
      </Button>
      <Button type="button" disabled={pending || !canSave} onClick={() => void handleSubmit()}>
        {t("create")}
      </Button>
    </>
  );

  const trigger = (
    <Button type="button" onClick={() => setOpen(true)}>
      <Calculator /> {t("trigger")}
    </Button>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </DialogHeader>
            {body}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{t("title")}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">{body}</div>
          <DrawerFooter className="flex-row">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

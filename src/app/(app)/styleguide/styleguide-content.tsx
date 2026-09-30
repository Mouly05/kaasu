"use client";

import { useState, type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useTranslations } from "next-intl";

import { AccountPicker } from "@/components/shared/account-picker";
import { AmountInput } from "@/components/shared/amount-input";
import { CategoryPicker } from "@/components/shared/category-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DatePickerIST } from "@/components/shared/date-picker-ist";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyText } from "@/components/shared/money-text";
import { MonthSwitcher } from "@/components/shared/month-switcher";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressRing } from "@/components/shared/progress-ring";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import type { AccountSummary, CategorySummary } from "@/features/settings/queries";
import { monthKey } from "@/lib/dates";

interface StyleguideContentProps {
  categories: CategorySummary[];
  accounts: AccountSummary[];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="border-border/60 bg-card rounded-2xl border p-5">{children}</div>
    </section>
  );
}

export function StyleguideContent({ categories, accounts }: StyleguideContentProps) {
  const t = useTranslations("styleguide.sections");
  const [amount, setAmount] = useState<number | null>(150000);
  const [categoryId, setCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const [date, setDate] = useState<Date>(new Date());
  const [month, setMonth] = useState(monthKey());

  return (
    <div className="space-y-8">
      <Section title={t("amountInput")}>
        <div className="max-w-xs">
          <AmountInput value={amount} onChangePaise={setAmount} />
        </div>
      </Section>

      <Section title={t("moneyText")}>
        <div className="flex flex-wrap gap-6 text-lg">
          <MoneyText paise={150000} />
          <MoneyText paise={-45000} />
          <MoneyText paise={0} />
          <MoneyText paise={12345600} compact />
        </div>
      </Section>

      <Section title={t("categoryPicker")}>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </Section>

      <Section title={t("accountPicker")}>
        <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
      </Section>

      <Section title={t("datePicker")}>
        <div className="max-w-xs">
          <DatePickerIST value={date} onChange={setDate} />
        </div>
      </Section>

      <Section title={t("monthSwitcher")}>
        <MonthSwitcher value={month} onChange={setMonth} />
      </Section>

      <Section title={t("statCard")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Spent this month" value={<MoneyText paise={4523400} />} />
          <StatCard label="Remaining" value={<MoneyText paise={1976600} />} hint="of ₹65,000" />
          <StatCard label="Over budget" value={<MoneyText paise={-320000} />} />
        </div>
      </Section>

      <Section title={t("progressRing")}>
        <div className="flex flex-wrap gap-6">
          <ProgressRing percent={35} tone="positive" />
          <ProgressRing percent={72} tone="warning" />
          <ProgressRing percent={104} tone="negative" />
        </div>
      </Section>

      <Section title={t("emptyState")}>
        <EmptyState
          icon={Inbox}
          title="Nothing here yet"
          description="Once you add something, it'll show up here."
          action={<Button variant="outline">Add something</Button>}
        />
      </Section>

      <Section title={t("pageHeader")}>
        <PageHeader
          title="Screen title"
          description="A short description of this screen."
          actions={<Button size="sm">Action</Button>}
        />
      </Section>

      <Section title={t("confirmDialog")}>
        <ConfirmDialog
          trigger={<Button variant="destructive">Delete something</Button>}
          title="Are you sure?"
          description="This can't be undone."
          onConfirm={() => {}}
        />
      </Section>
    </div>
  );
}

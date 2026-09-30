/**
 * Seeds one demo user with fake data for local dev. Never touches real
 * personal data: every value below is invented, and every write is scoped to
 * a single fixed demo user id, so this is safe to run against a shared
 * cluster. Idempotent — safe to run repeatedly (`pnpm seed:demo`).
 */
import type { Model } from "mongoose";

import { connectDb } from "@/lib/db/connection";
import { Account } from "@/lib/db/models/account";
import { AdvisorMessage } from "@/lib/db/models/advisor-message";
import { Category } from "@/lib/db/models/category";
import { Connection } from "@/lib/db/models/connection";
import { Debt } from "@/lib/db/models/debt";
import { Emi } from "@/lib/db/models/emi";
import { Goal } from "@/lib/db/models/goal";
import { HoldingSnapshot } from "@/lib/db/models/holding-snapshot";
import { Income } from "@/lib/db/models/income";
import { Insight } from "@/lib/db/models/insight";
import { MerchantRule } from "@/lib/db/models/merchant-rule";
import { MonthlyPlan } from "@/lib/db/models/monthly-plan";
import { Recurring } from "@/lib/db/models/recurring";
import { StatementImport } from "@/lib/db/models/statement-import";
import { Task } from "@/lib/db/models/task";
import { Transaction } from "@/lib/db/models/transaction";
import { User } from "@/lib/db/models/user";
import { encrypt } from "@/lib/crypto";
import { monthKey } from "@/lib/dates";
import { toPaise } from "@/lib/money";
import { computeDedupeHash } from "@/features/expenses/service";
import { ensureDefaultCategories } from "@/features/settings/service";

// A clearly-fake domain, never derived from any env var, so this script can
// never accidentally touch a real user's data even on a shared cluster.
const DEMO_EMAIL = "demo@kaasu.local";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous model list, only used for a userId-scoped deleteMany
const NON_USER_MODELS: Model<any>[] = [
  Account,
  Category,
  Transaction,
  Recurring,
  Emi,
  MonthlyPlan,
  Income,
  Debt,
  Goal,
  StatementImport,
  MerchantRule,
  Connection,
  HoldingSnapshot,
  Task,
  AdvisorMessage,
  Insight,
];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  await connectDb();

  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: "Demo User",
        locale: "en",
        currency: "INR",
        timezone: "Asia/Kolkata",
        theme: "system",
        onboardingDone: true,
        payday: 1,
        salaryMinPaise: toPaise("45000"),
        salaryMaxPaise: toPaise("55000"),
        dailyReminderTime: "20:00",
        telegramChatId: encrypt("123456789"),
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  );
  const userId = String(user._id);

  // Wipe only this demo user's own data — never a bare deleteMany({}) — so
  // the script is both idempotent and structurally incapable of touching
  // another user's documents.
  await Promise.all(NON_USER_MODELS.map((Model) => Model.deleteMany({ userId })));

  await ensureDefaultCategories(userId);
  const categories = await Category.find({ userId }).lean();
  const categoryIdByName = new Map(categories.map((c) => [c.name, String(c._id)]));
  const categoryId = (name: string): string => {
    const id = categoryIdByName.get(name);
    if (!id) throw new Error(`Seed category "${name}" not found — did ensureDefaultCategories run?`);
    return id;
  };

  const accounts = await Account.create([
    { userId, name: "HDFC Savings", type: "bank", institution: "HDFC Bank", openingBalancePaise: toPaise("25000") },
    { userId, name: "Cash Wallet", type: "cash", openingBalancePaise: toPaise("2000") },
    { userId, name: "ICICI Credit Card", type: "credit_card", institution: "ICICI Bank", last4: "4321" },
  ]);
  const hdfcSavings = accounts[0]!;
  const iciciCard = accounts[2]!;

  await Recurring.create([
    {
      userId,
      title: "Rent",
      amountPaise: toPaise("18000"),
      categoryId: categoryId("Rent"),
      accountId: hdfcSavings._id,
      frequency: "monthly",
      dayOfMonth: 1,
      startDate: daysAgo(180),
      kind: "fixed",
      autoLog: true,
    },
    {
      userId,
      title: "Netflix",
      amountPaise: toPaise("649"),
      categoryId: categoryId("Subscriptions"),
      accountId: iciciCard._id,
      frequency: "monthly",
      dayOfMonth: 5,
      startDate: daysAgo(180),
      kind: "subscription",
      autoLog: true,
    },
    {
      userId,
      title: "Index Fund SIP",
      amountPaise: toPaise("5000"),
      categoryId: categoryId("Investments/SIP"),
      accountId: hdfcSavings._id,
      frequency: "monthly",
      dayOfMonth: 3,
      startDate: daysAgo(180),
      kind: "sip",
      autoLog: true,
    },
    {
      userId,
      title: "Parents Support",
      amountPaise: toPaise("8000"),
      categoryId: categoryId("Family Support"),
      accountId: hdfcSavings._id,
      frequency: "monthly",
      dayOfMonth: 2,
      startDate: daysAgo(180),
      kind: "support",
      autoLog: true,
    },
  ]);

  await Emi.create({
    userId,
    title: "Phone EMI",
    principalPaise: toPaise("36000"),
    tenureMonths: 6,
    interestRatePct: 0,
    startDate: daysAgo(60),
    lender: "ICICI Bank",
    installments: Array.from({ length: 6 }, (_, i) => ({
      dueDate: daysAgo(60 - i * 30),
      amountPaise: toPaise("6000"),
      ...(i < 2 ? { paidAt: daysAgo(58 - i * 30) } : {}),
    })),
  });

  const statementImport = await StatementImport.create({
    userId,
    fileName: "HDFC_Sep2026.pdf",
    bank: "HDFC Bank",
    period: { from: daysAgo(30), to: daysAgo(1) },
    rowCount: 8,
    importedCount: 7,
    duplicateCount: 1,
    status: "completed",
  });

  const manualMerchants = ["Swiggy", "Zomato", "Big Bazaar", "Amazon", "Local Store", "Petrol Pump"];
  const manualTransactions = Array.from({ length: 44 }, (_, i) => {
    const merchant = manualMerchants[i % manualMerchants.length]!;
    return {
      userId,
      date: daysAgo(i),
      amountPaise: toPaise(String(150 + (i % 12) * 75)),
      direction: "debit" as const,
      categoryId: categoryId(i % 3 === 0 ? "Food & Groceries" : "Shopping"),
      accountId: (i % 2 === 0 ? hdfcSavings : iciciCard)._id,
      merchant,
      source: "manual" as const,
      isReviewed: true,
    };
  });

  const statementTransactions = Array.from({ length: 6 }, (_, i) => {
    const merchant = manualMerchants[i % manualMerchants.length]!;
    const date = daysAgo(2 + i * 3);
    const amountPaise = toPaise(String(200 + i * 50));
    return {
      userId,
      date,
      amountPaise,
      direction: "debit" as const,
      accountId: hdfcSavings._id,
      merchant,
      source: "statement" as const,
      statementImportId: statementImport._id,
      dedupeHash: computeDedupeHash({ date, amountPaise, merchant, direction: "debit" }),
      isReviewed: false,
    };
  });

  await Transaction.create([...manualTransactions, ...statementTransactions]);

  await Income.create([
    { userId, date: daysAgo(29), amountPaise: toPaise("50000"), source: "salary" },
    { userId, date: daysAgo(1), amountPaise: toPaise("52000"), source: "salary" },
  ]);

  await MonthlyPlan.create([
    {
      userId,
      monthKey: monthKey(),
      expectedIncomePaise: toPaise("52000"),
      actualIncomePaise: toPaise("52000"),
      lines: [
        { categoryId: categoryId("Rent"), label: "Rent", plannedPaise: toPaise("18000"), priority: 1, bucket: "must", status: "paid" },
        { categoryId: categoryId("Food & Groceries"), label: "Groceries", plannedPaise: toPaise("6000"), priority: 2, bucket: "must", status: "planned" },
        { categoryId: categoryId("Debt Repayment"), label: "Credit card", plannedPaise: toPaise("3000"), priority: 2, bucket: "debt", status: "planned" },
        { categoryId: categoryId("Investments/SIP"), label: "SIP", plannedPaise: toPaise("5000"), priority: 3, bucket: "save", status: "paid" },
        { categoryId: categoryId("EMI"), label: "Phone EMI", plannedPaise: toPaise("6000"), priority: 2, bucket: "emi", status: "paid" },
        { categoryId: categoryId("Entertainment"), label: "Fun money", plannedPaise: toPaise("2000"), priority: 4, bucket: "want", status: "planned" },
        { categoryId: null, label: "Buffer", plannedPaise: toPaise("2000"), priority: 5, bucket: "buffer", status: "planned" },
      ],
    },
    {
      userId,
      monthKey: monthKey(daysAgo(35)),
      expectedIncomePaise: toPaise("50000"),
      actualIncomePaise: toPaise("50000"),
      lines: [
        { categoryId: categoryId("Rent"), label: "Rent", plannedPaise: toPaise("18000"), priority: 1, bucket: "must", status: "paid" },
        { categoryId: categoryId("Food & Groceries"), label: "Groceries", plannedPaise: toPaise("6000"), priority: 2, bucket: "must", status: "paid" },
        { categoryId: categoryId("Debt Repayment"), label: "Credit card", plannedPaise: toPaise("3000"), priority: 2, bucket: "debt", status: "paid" },
        { categoryId: categoryId("Investments/SIP"), label: "SIP", plannedPaise: toPaise("5000"), priority: 3, bucket: "save", status: "paid" },
        { categoryId: categoryId("EMI"), label: "Phone EMI", plannedPaise: toPaise("6000"), priority: 2, bucket: "emi", status: "paid" },
        { categoryId: categoryId("Entertainment"), label: "Fun money", plannedPaise: toPaise("2000"), priority: 4, bucket: "want", status: "deferred", deferredTo: monthKey() },
        { categoryId: null, label: "Buffer", plannedPaise: toPaise("2000"), priority: 5, bucket: "buffer", status: "planned" },
      ],
    },
  ]);

  await Debt.create([
    {
      userId,
      counterparty: "Arun (friend)",
      type: "person",
      direction: "i_owe",
      originalPaise: toPaise("10000"),
      priority: 2,
      repayments: [{ date: daysAgo(10), amountPaise: toPaise("4000") }],
      status: "open",
    },
    {
      userId,
      counterparty: "Priya",
      type: "person",
      direction: "owed_to_me",
      originalPaise: toPaise("5000"),
      priority: 3,
      repayments: [{ date: daysAgo(5), amountPaise: toPaise("2000") }],
      status: "open",
    },
  ]);

  await Goal.create([
    {
      userId,
      title: "Emergency Fund",
      kind: "emergency_fund",
      targetPaise: toPaise("150000"),
      savedPaise: toPaise("60000"),
      priority: 1,
      status: "active",
    },
    {
      userId,
      title: "New Laptop",
      kind: "purchase",
      targetPaise: toPaise("80000"),
      savedPaise: toPaise("20000"),
      targetDate: daysAgo(-90),
      priority: 3,
      status: "active",
      linkedCategoryId: categoryId("Gadgets"),
    },
  ]);

  await MerchantRule.create([
    { userId, pattern: "swiggy*", categoryId: categoryId("Food & Groceries"), confidence: 0.9, hits: 12 },
    { userId, pattern: "zomato*", categoryId: categoryId("Food & Groceries"), confidence: 0.9, hits: 9 },
    { userId, pattern: "netflix*", categoryId: categoryId("Subscriptions"), confidence: 0.95, hits: 6 },
  ]);

  await Connection.create({
    userId,
    provider: "indstocks",
    encryptedToken: encrypt("fake-demo-token"),
    status: "active",
    lastSyncAt: daysAgo(1),
  });

  await HoldingSnapshot.create({
    userId,
    takenAt: daysAgo(1),
    source: "manual",
    holdings: [
      { symbol: "TCS", name: "Tata Consultancy Services", assetType: "stock", qty: 5, avgCostPaise: toPaise("3400"), ltpPaise: toPaise("3650"), valuePaise: toPaise("18250") },
      { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", assetType: "etf", qty: 40, avgCostPaise: toPaise("220"), ltpPaise: toPaise("245"), valuePaise: toPaise("9800") },
      { symbol: "PPFAS_FLEXI", name: "Parag Parikh Flexi Cap Fund", assetType: "mf", qty: 120.5, avgCostPaise: toPaise("62"), ltpPaise: toPaise("70"), valuePaise: toPaise("8435") },
    ],
    totals: { investedPaise: toPaise("33000"), currentValuePaise: toPaise("36485"), pnlPaise: toPaise("3485") },
  });

  await Task.create([
    { userId, title: "Review this month's budget", status: "todo", source: "assistant", priority: 2 },
    { userId, title: "Pay credit card bill", dueDate: daysAgo(-3), status: "todo", source: "manual", priority: 1 },
    { userId, title: "Link INDstocks account", status: "done", source: "manual", priority: 3 },
  ]);

  await AdvisorMessage.create([
    { userId, role: "user", content: "How much did I spend on food this month?", toolCalls: [] },
    { userId, role: "assistant", content: "You've spent about ₹4,200 on Food & Groceries so far this month.", toolCalls: [] },
    { userId, role: "user", content: "Am I on track for my emergency fund goal?", toolCalls: [] },
  ]);

  await Insight.create([
    {
      userId,
      type: "overspend_category",
      periodKey: monthKey(),
      title: "Shopping is above plan",
      body: "You've spent 20% more on Shopping than planned this month.",
      severity: "warning",
    },
    {
      userId,
      type: "emi_no_cost",
      periodKey: monthKey(),
      title: "Phone EMI is interest-free",
      body: "Your Phone EMI has 0% interest — no rush to prepay it.",
      severity: "info",
    },
  ]);

  const counts = await Promise.all([
    Account.countDocuments({ userId }),
    Category.countDocuments({ userId }),
    Transaction.countDocuments({ userId }),
    Recurring.countDocuments({ userId }),
    Emi.countDocuments({ userId }),
    MonthlyPlan.countDocuments({ userId }),
    Income.countDocuments({ userId }),
    Debt.countDocuments({ userId }),
    Goal.countDocuments({ userId }),
    StatementImport.countDocuments({ userId }),
    MerchantRule.countDocuments({ userId }),
    Connection.countDocuments({ userId }),
    HoldingSnapshot.countDocuments({ userId }),
    Task.countDocuments({ userId }),
    AdvisorMessage.countDocuments({ userId }),
    Insight.countDocuments({ userId }),
  ]);
  const labels = [
    "Account",
    "Category",
    "Transaction",
    "Recurring",
    "Emi",
    "MonthlyPlan",
    "Income",
    "Debt",
    "Goal",
    "StatementImport",
    "MerchantRule",
    "Connection",
    "HoldingSnapshot",
    "Task",
    "AdvisorMessage",
    "Insight",
  ];
  console.log(`Seeded demo user ${DEMO_EMAIL} (${userId})`);
  labels.forEach((label, i) => console.log(`  ${label}: ${counts[i] ?? 0}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, ok } from "@/lib/action-result";
import { requireUser, withAction } from "@/lib/auth-helpers";
import { connectDb } from "@/lib/db/connection";
import { Emi } from "@/lib/db/models/emi";
import { Recurring } from "@/lib/db/models/recurring";
import { Transaction } from "@/lib/db/models/transaction";

import { calculateEmi } from "./emi";
import {
  deleteRecurringSchema,
  emiCreateInputSchema,
  markEmiInstallmentPaidSchema,
  markRecurringPaidSchema,
  recurringInputSchema,
  toggleAutoLogSchema,
  updateRecurringSchema,
  type DeleteRecurringInput,
  type ToggleAutoLogInput,
  type UpdateRecurringInput,
} from "./schema";
import { buildEmiInstallments } from "./service";

export const createRecurring = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = recurringInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ id: string }>({
      code: "validation",
      message: "Check the recurring item's details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }
  await connectDb();
  const recurring = await Recurring.create({ ...parsed.data, userId });
  revalidatePath("/recurring");
  return ok({ id: String(recurring._id) });
});

export const updateRecurring = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = updateRecurringSchema.safeParse(input);
  if (!parsed.success) {
    return fail<UpdateRecurringInput>({
      code: "validation",
      message: "Check the recurring item's details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }
  const { id, ...fields } = parsed.data;
  await connectDb();
  const result = await Recurring.updateOne({ _id: id, userId }, { $set: fields });
  if (result.matchedCount === 0) {
    return fail<UpdateRecurringInput>({ code: "not_found", message: "That recurring item wasn't found." });
  }
  revalidatePath("/recurring");
  return ok(parsed.data);
});

export const deleteRecurring = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = deleteRecurringSchema.safeParse(input);
  if (!parsed.success) {
    return fail<DeleteRecurringInput>({ code: "validation", message: "Invalid recurring item id." });
  }
  await connectDb();
  await Recurring.deleteOne({ _id: parsed.data.id, userId });
  revalidatePath("/recurring");
  return ok(parsed.data);
});

export const toggleAutoLog = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = toggleAutoLogSchema.safeParse(input);
  if (!parsed.success) {
    return fail<ToggleAutoLogInput>({ code: "validation", message: "Invalid input." });
  }
  await connectDb();
  const result = await Recurring.updateOne(
    { _id: parsed.data.id, userId },
    { $set: { autoLog: parsed.data.autoLog } },
  );
  if (result.matchedCount === 0) {
    return fail<ToggleAutoLogInput>({ code: "not_found", message: "That recurring item wasn't found." });
  }
  revalidatePath("/recurring");
  return ok(parsed.data);
});

/**
 * The write behind "mark as paid": creates the linked Transaction. Not
 * wrapped in withAction — both the user-triggered `markRecurringPaid` action
 * below and the daily autolog cron route call this directly, so the write
 * exists in exactly one place.
 */
export async function logRecurringPayment(
  userId: string,
  recurringId: string,
  date: Date,
): Promise<{ transactionId: string } | null> {
  await connectDb();
  const recurring = await Recurring.findOne({ _id: recurringId, userId }).lean();
  if (!recurring) return null;
  const transaction = await Transaction.create({
    userId,
    date,
    amountPaise: recurring.amountPaise,
    direction: "debit",
    categoryId: recurring.categoryId,
    accountId: recurring.accountId,
    merchant: recurring.title,
    source: "recurring",
    recurringId: recurring._id,
  });
  return { transactionId: String(transaction._id) };
}

export const markRecurringPaid = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = markRecurringPaidSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ transactionId: string }>({ code: "validation", message: "Invalid recurring item id." });
  }
  const result = await logRecurringPayment(userId, parsed.data.recurringId, new Date());
  if (!result) {
    return fail<{ transactionId: string }>({
      code: "not_found",
      message: "That recurring item wasn't found.",
    });
  }
  revalidatePath("/recurring");
  return ok(result);
});

export const createEmi = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = emiCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ recurringId: string; emiId: string }>({
      code: "validation",
      message: "Check the EMI details.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    });
  }
  const data = parsed.data;
  const calc = calculateEmi({
    pricePaise: data.pricePaise,
    downPaymentPaise: data.downPaymentPaise,
    tenureMonths: data.tenureMonths,
    interestRatePct: data.interestRatePct,
    processingFeePaise: data.processingFeePaise,
    gstOnFeePercent: data.gstOnFeePercent,
  });
  const installments = buildEmiInstallments(calc, data.startDate, data.dayOfMonth);

  await connectDb();
  const recurring = await Recurring.create({
    userId,
    title: data.title,
    amountPaise: calc.monthlyEmiPaise,
    categoryId: data.categoryId,
    accountId: data.accountId,
    frequency: "monthly",
    dayOfMonth: data.dayOfMonth,
    startDate: data.startDate,
    kind: "emi",
    autoLog: false,
    reminderDaysBefore: 1,
    isActive: true,
  });

  try {
    const emi = await Emi.create({
      userId,
      title: data.title,
      principalPaise: calc.principalPaise,
      tenureMonths: data.tenureMonths,
      interestRatePct: data.interestRatePct,
      // The total fee actually charged, GST included — see ADR (docs/DECISIONS.md).
      processingFeePaise: calc.processingFeeWithGstPaise,
      downPaymentPaise: data.downPaymentPaise,
      startDate: data.startDate,
      lender: data.lender,
      recurringId: recurring._id,
      installments,
    });
    revalidatePath("/recurring");
    return ok({ recurringId: String(recurring._id), emiId: String(emi._id) });
  } catch (error) {
    // The Recurring doc already landed; undo it rather than leave an
    // orphaned "EMI" recurring item with no Emi record behind it.
    await Recurring.deleteOne({ _id: recurring._id, userId });
    throw error;
  }
});

export const markEmiInstallmentPaid = withAction(async (input: unknown) => {
  const { userId } = await requireUser();
  const parsed = markEmiInstallmentPaidSchema.safeParse(input);
  if (!parsed.success) {
    return fail<{ transactionId: string }>({ code: "validation", message: "Invalid input." });
  }
  const { emiId, installmentIndex } = parsed.data;

  await connectDb();
  const emi = await Emi.findOne({ _id: emiId, userId });
  if (!emi) {
    return fail<{ transactionId: string }>({ code: "not_found", message: "That EMI wasn't found." });
  }
  const installment = emi.installments[installmentIndex];
  if (!installment) {
    return fail<{ transactionId: string }>({ code: "not_found", message: "That installment wasn't found." });
  }
  if (installment.paidAt) {
    return fail<{ transactionId: string }>({
      code: "validation",
      message: "That installment is already marked paid.",
    });
  }

  const recurring = emi.recurringId
    ? await Recurring.findOne({ _id: emi.recurringId, userId }).lean()
    : null;
  const transaction = await Transaction.create({
    userId,
    date: new Date(),
    amountPaise: installment.amountPaise,
    direction: "debit",
    categoryId: recurring?.categoryId,
    accountId: recurring?.accountId,
    merchant: emi.title,
    source: "recurring",
    recurringId: emi.recurringId,
  });

  installment.paidAt = new Date();
  installment.transactionId = transaction._id;
  await emi.save();

  revalidatePath("/recurring");
  return ok({ transactionId: String(transaction._id) });
});

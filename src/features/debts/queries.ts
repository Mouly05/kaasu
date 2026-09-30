import "server-only";

import { isValidObjectId } from "mongoose";

import { Debt } from "@/lib/db/models/debt";
import type { DebtDirection, DebtRepayment, DebtStatus, DebtType } from "@/lib/db/models/debt";
import { connectDb } from "@/lib/db/connection";
import { Emi } from "@/lib/db/models/emi";
import type { EmiInstallment } from "@/lib/db/models/emi";

import { computeOutstandingPaise } from "./service";

export interface DebtSummary {
  id: string;
  counterparty: string;
  type: DebtType;
  direction: DebtDirection;
  originalPaise: number;
  outstandingPaise: number;
  interestRatePct: number | null;
  dueDate: Date | null;
  priority: number;
  repayments: DebtRepayment[];
  status: DebtStatus;
}

// `.lean()` results never carry Mongoose virtuals, so outstandingPaise is
// computed here with the same pure function the schema's virtual calls.
function toSummary(doc: {
  _id: unknown;
  counterparty: string;
  type: DebtType;
  direction: DebtDirection;
  originalPaise: number;
  repayments: DebtRepayment[];
  interestRatePct?: number;
  dueDate?: Date;
  priority: number;
  status: DebtStatus;
}): DebtSummary {
  return {
    id: String(doc._id),
    counterparty: doc.counterparty,
    type: doc.type,
    direction: doc.direction,
    originalPaise: doc.originalPaise,
    outstandingPaise: computeOutstandingPaise(doc.originalPaise, doc.repayments),
    interestRatePct: doc.interestRatePct ?? null,
    dueDate: doc.dueDate ?? null,
    priority: doc.priority,
    repayments: doc.repayments,
    status: doc.status,
  };
}

/** The signed-in user's debts, open first unless `includeClosed` is set. */
export async function listDebts(
  userId: string,
  options: { includeClosed?: boolean } = {},
): Promise<DebtSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const debts = await Debt.find({
    userId,
    ...(options.includeClosed ? {} : { status: "open" }),
  })
    .sort({ priority: 1, dueDate: 1 })
    .lean();
  return debts.map(toSummary);
}

/** A single debt by id, scoped to the signed-in user. */
export async function getDebtById(userId: string, debtId: string): Promise<DebtSummary | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(debtId)) return null;
  await connectDb();
  const debt = await Debt.findOne({ _id: debtId, userId }).lean();
  return debt ? toSummary(debt) : null;
}

export interface EmiSummary {
  id: string;
  title: string;
  principalPaise: number;
  tenureMonths: number;
  interestRatePct: number;
  startDate: Date;
  lender: string | null;
  installments: EmiInstallment[];
}

/** The signed-in user's EMIs. */
export async function listEmis(userId: string): Promise<EmiSummary[]> {
  if (!isValidObjectId(userId)) return [];
  await connectDb();
  const emis = await Emi.find({ userId }).sort({ startDate: -1 }).lean();
  return emis.map((e) => ({
    id: String(e._id),
    title: e.title,
    principalPaise: e.principalPaise,
    tenureMonths: e.tenureMonths,
    interestRatePct: e.interestRatePct,
    startDate: e.startDate,
    lender: e.lender ?? null,
    installments: e.installments,
  }));
}

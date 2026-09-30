/**
 * Pure EMI (equated monthly installment) calculator: reducing-balance
 * amortization, no-cost-EMI detection, and processing-fee/GST handling.
 * No I/O, no dates — `service.ts` stamps calendar due dates onto the
 * schedule this returns. See docs/DECISIONS.md for the effective-cost
 * approximation this module makes.
 */
import { addPaise, isPaise, type Paise, percentOf, roundToPaise, subPaise } from "@/lib/money";

export interface EmiCalculatorInput {
  /** The item's cash/sale price. */
  pricePaise: Paise;
  downPaymentPaise: Paise;
  tenureMonths: number;
  /** Annual interest rate, percent. 0 = a no-cost EMI. */
  interestRatePct: number;
  /** One-time fee charged at booking, before GST. */
  processingFeePaise: Paise;
  /** GST applied on top of the processing fee. Defaults to 18%. */
  gstOnFeePercent?: number;
}

export interface EmiScheduleRow {
  installmentNumber: number;
  openingBalancePaise: Paise;
  emiPaise: Paise;
  interestPaise: Paise;
  principalPaise: Paise;
  closingBalancePaise: Paise;
}

export interface EmiCalculatorResult {
  principalPaise: Paise;
  /** The regular installment amount (the last row may differ by a few paise — it absorbs rounding). */
  monthlyEmiPaise: Paise;
  totalInstallmentsPaise: Paise;
  processingFeeWithGstPaise: Paise;
  /** Down payment + all installments + fee & GST: everything that actually leaves the account. */
  totalPaidPaise: Paise;
  totalInterestPaise: Paise;
  /** totalPaidPaise − pricePaise: what the EMI route costs over paying cash today. */
  extraCostVsCashPaise: Paise;
  /** A flat-rate approximation ((interest + fee&GST) / principal / years), not an XIRR. */
  effectiveAnnualCostPercent: number;
  isNoCostEmi: boolean;
  /** max(0, extraCostVsCashPaise) — the hidden cost a "no-cost" EMI still carries via fees. */
  noCostGapPaise: Paise;
  schedule: EmiScheduleRow[];
}

function assertInput(input: EmiCalculatorInput): void {
  if (!isPaise(input.pricePaise) || input.pricePaise < 0) {
    throw new RangeError(`pricePaise must be a non-negative integer number of paise, got ${input.pricePaise}`);
  }
  if (!isPaise(input.downPaymentPaise) || input.downPaymentPaise < 0) {
    throw new RangeError(`downPaymentPaise must be a non-negative integer number of paise, got ${input.downPaymentPaise}`);
  }
  if (input.downPaymentPaise > input.pricePaise) {
    throw new RangeError("downPaymentPaise cannot exceed pricePaise");
  }
  if (!Number.isInteger(input.tenureMonths) || input.tenureMonths < 1) {
    throw new RangeError(`tenureMonths must be a positive integer, got ${input.tenureMonths}`);
  }
  if (!Number.isFinite(input.interestRatePct) || input.interestRatePct < 0) {
    throw new RangeError(`interestRatePct must be a non-negative finite number, got ${input.interestRatePct}`);
  }
  if (!isPaise(input.processingFeePaise) || input.processingFeePaise < 0) {
    throw new RangeError(`processingFeePaise must be a non-negative integer number of paise, got ${input.processingFeePaise}`);
  }
}

export function calculateEmi(input: EmiCalculatorInput): EmiCalculatorResult {
  assertInput(input);
  const { pricePaise, downPaymentPaise, tenureMonths, interestRatePct, processingFeePaise } = input;
  const gstOnFeePercent = input.gstOnFeePercent ?? 18;

  const principalPaise = subPaise(pricePaise, downPaymentPaise);
  const monthlyRate = interestRatePct / 12 / 100;

  const emiPaise =
    interestRatePct === 0
      ? roundToPaise(principalPaise / tenureMonths)
      : (() => {
          const factor = Math.pow(1 + monthlyRate, tenureMonths);
          return roundToPaise(Number(((principalPaise * monthlyRate * factor) / (factor - 1)).toPrecision(15)));
        })();

  const schedule: EmiScheduleRow[] = [];
  let openingBalancePaise = principalPaise;
  let totalInterestPaise: Paise = 0;
  let totalInstallmentsPaise: Paise = 0;

  for (let installmentNumber = 1; installmentNumber <= tenureMonths; installmentNumber += 1) {
    const isLast = installmentNumber === tenureMonths;
    const interestPaise = roundToPaise(openingBalancePaise * monthlyRate);
    // The last row forces the balance to exactly zero, absorbing all rounding
    // residue from the equal-installment amounts above — same as a real bank schedule.
    const principalComponentPaise = isLast ? openingBalancePaise : subPaise(emiPaise, interestPaise);
    const rowEmiPaise = isLast ? addPaise(principalComponentPaise, interestPaise) : emiPaise;
    const closingBalancePaise = subPaise(openingBalancePaise, principalComponentPaise);

    schedule.push({
      installmentNumber,
      openingBalancePaise,
      emiPaise: rowEmiPaise,
      interestPaise,
      principalPaise: principalComponentPaise,
      closingBalancePaise,
    });

    totalInterestPaise = addPaise(totalInterestPaise, interestPaise);
    totalInstallmentsPaise = addPaise(totalInstallmentsPaise, rowEmiPaise);
    openingBalancePaise = closingBalancePaise;
  }

  const processingFeeWithGstPaise = addPaise(processingFeePaise, percentOf(processingFeePaise, gstOnFeePercent));
  const totalPaidPaise = addPaise(downPaymentPaise, totalInstallmentsPaise, processingFeeWithGstPaise);
  const extraCostVsCashPaise = subPaise(totalPaidPaise, pricePaise);
  const effectiveAnnualCostPercent =
    principalPaise === 0
      ? 0
      : ((totalInterestPaise + processingFeeWithGstPaise) / principalPaise / (tenureMonths / 12)) * 100;

  return {
    principalPaise,
    monthlyEmiPaise: schedule[0]!.emiPaise,
    totalInstallmentsPaise,
    processingFeeWithGstPaise,
    totalPaidPaise,
    totalInterestPaise,
    extraCostVsCashPaise,
    effectiveAnnualCostPercent,
    isNoCostEmi: interestRatePct === 0,
    noCostGapPaise: Math.max(0, extraCostVsCashPaise),
    schedule,
  };
}

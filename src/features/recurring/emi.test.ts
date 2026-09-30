import { describe, expect, it } from "vitest";

import { toPaise } from "@/lib/money";

import { calculateEmi, type EmiCalculatorInput } from "./emi";

const FEE_199_WITH_GST = 19900 + 3582; // ₹199 + 18% GST = ₹234.82

describe("calculateEmi — real no-cost EMI cases (₹199 processing fee + 18% GST)", () => {
  const base = {
    downPaymentPaise: 0,
    interestRatePct: 0,
    processingFeePaise: toPaise("199"),
    gstOnFeePercent: 18,
  } satisfies Partial<EmiCalculatorInput>;

  it.each([
    { label: "₹25,000 tab, 9 months", pricePaise: toPaise("25000"), tenureMonths: 9 },
    { label: "₹25,000 tab, 12 months", pricePaise: toPaise("25000"), tenureMonths: 12 },
    { label: "₹13,000 phone, 9 months", pricePaise: toPaise("13000"), tenureMonths: 9 },
    { label: "₹13,000 phone, 12 months", pricePaise: toPaise("13000"), tenureMonths: 12 },
  ])("$label", ({ pricePaise, tenureMonths }) => {
    const result = calculateEmi({ ...base, pricePaise, tenureMonths });

    expect(result.isNoCostEmi).toBe(true);
    expect(result.schedule).toHaveLength(tenureMonths);
    // 0% rate: every rupee of principal is repaid, nothing more, nothing less.
    expect(result.totalInstallmentsPaise).toBe(pricePaise);
    expect(result.totalInterestPaise).toBe(0);
    expect(result.processingFeeWithGstPaise).toBe(FEE_199_WITH_GST);
    // The only "hidden" cost of a genuine no-cost EMI is the fee + GST.
    expect(result.extraCostVsCashPaise).toBe(FEE_199_WITH_GST);
    expect(result.noCostGapPaise).toBe(FEE_199_WITH_GST);
    expect(result.totalPaidPaise).toBe(pricePaise + FEE_199_WITH_GST);
    // Schedule is internally consistent: opening → closing chains to exactly 0.
    expect(result.schedule.at(-1)!.closingBalancePaise).toBe(0);
    const principalSum = result.schedule.reduce((sum, row) => sum + row.principalPaise, 0);
    expect(principalSum).toBe(result.principalPaise);
  });

  it("shortens the extra-cost-as-percent when spread over a longer no-cost tenure", () => {
    const nine = calculateEmi({ ...base, pricePaise: toPaise("25000"), tenureMonths: 9 });
    const twelve = calculateEmi({ ...base, pricePaise: toPaise("25000"), tenureMonths: 12 });
    // Same absolute fee, but annualised over more months → lower effective annual cost.
    expect(twelve.effectiveAnnualCostPercent).toBeLessThan(nine.effectiveAnnualCostPercent);
    expect(nine.effectiveAnnualCostPercent).toBeCloseTo(1.2523733333, 6);
    expect(twelve.effectiveAnnualCostPercent).toBeCloseTo(0.93928, 6);
  });
});

describe("calculateEmi — reducing-balance formula (non-zero rate)", () => {
  it("degenerates to principal × (1 + monthlyRate) for a single-installment tenure", () => {
    // n=1 has a closed form: EMI = P(1+r), interest = P×r — easy to hand-verify.
    const result = calculateEmi({
      pricePaise: toPaise("10000"),
      downPaymentPaise: 0,
      tenureMonths: 1,
      interestRatePct: 12, // monthly rate r = 0.01
      processingFeePaise: 0,
    });

    expect(result.schedule).toEqual([
      {
        installmentNumber: 1,
        openingBalancePaise: 1_000_000,
        emiPaise: 1_010_000,
        interestPaise: 10_000,
        principalPaise: 1_000_000,
        closingBalancePaise: 0,
      },
    ]);
    expect(result.totalInterestPaise).toBe(10_000);
    expect(result.isNoCostEmi).toBe(false);
  });

  it("amortizes a multi-month loan to exactly zero, interest strictly decreasing", () => {
    const result = calculateEmi({
      pricePaise: toPaise("100000"),
      downPaymentPaise: 0,
      tenureMonths: 12,
      interestRatePct: 12,
      processingFeePaise: 0,
    });

    expect(result.schedule).toHaveLength(12);
    expect(result.schedule.at(-1)!.closingBalancePaise).toBe(0);
    expect(result.totalInterestPaise).toBeGreaterThan(0);

    for (let i = 1; i < result.schedule.length; i += 1) {
      // Balance reduces every month, so interest (charged on the opening balance) strictly falls.
      expect(result.schedule[i]!.interestPaise).toBeLessThan(result.schedule[i - 1]!.interestPaise);
      // Each row's closing balance feeds the next row's opening balance.
      expect(result.schedule[i]!.openingBalancePaise).toBe(result.schedule[i - 1]!.closingBalancePaise);
    }

    const principalSum = result.schedule.reduce((sum, row) => sum + row.principalPaise, 0);
    const interestSum = result.schedule.reduce((sum, row) => sum + row.interestPaise, 0);
    expect(principalSum).toBe(result.principalPaise);
    expect(interestSum).toBe(result.totalInterestPaise);
  });
});

describe("calculateEmi — edge cases", () => {
  it("handles zero processing fee", () => {
    const result = calculateEmi({
      pricePaise: toPaise("5000"),
      downPaymentPaise: 0,
      tenureMonths: 5,
      interestRatePct: 0,
      processingFeePaise: 0,
    });
    expect(result.processingFeeWithGstPaise).toBe(0);
    expect(result.totalPaidPaise).toBe(toPaise("5000"));
    expect(result.noCostGapPaise).toBe(0);
  });

  it("handles a down payment, reducing the financed principal", () => {
    const result = calculateEmi({
      pricePaise: toPaise("25000"),
      downPaymentPaise: toPaise("5000"),
      tenureMonths: 10,
      interestRatePct: 0,
      processingFeePaise: 0,
    });
    expect(result.principalPaise).toBe(toPaise("20000"));
    expect(result.totalPaidPaise).toBe(toPaise("25000"));
  });

  it("absorbs an unevenly-divisible principal entirely into the schedule (no leftover paise)", () => {
    const result = calculateEmi({
      pricePaise: toPaise("100.01"),
      downPaymentPaise: 0,
      tenureMonths: 3,
      interestRatePct: 0,
      processingFeePaise: 0,
    });
    const principalSum = result.schedule.reduce((sum, row) => sum + row.principalPaise, 0);
    expect(principalSum).toBe(toPaise("100.01"));
  });

  it.each([
    { field: "pricePaise", value: -1 },
    { field: "downPaymentPaise", value: -1 },
    { field: "tenureMonths", value: 0 },
    { field: "tenureMonths", value: 1.5 },
    { field: "interestRatePct", value: -1 },
    { field: "processingFeePaise", value: -1 },
  ])("rejects invalid $field ($value)", ({ field, value }) => {
    const input: EmiCalculatorInput = {
      pricePaise: toPaise("10000"),
      downPaymentPaise: 0,
      tenureMonths: 12,
      interestRatePct: 0,
      processingFeePaise: 0,
      [field]: value,
    } as EmiCalculatorInput;
    expect(() => calculateEmi(input)).toThrow(RangeError);
  });

  it("rejects a down payment larger than the price", () => {
    expect(() =>
      calculateEmi({
        pricePaise: toPaise("1000"),
        downPaymentPaise: toPaise("1001"),
        tenureMonths: 6,
        interestRatePct: 0,
        processingFeePaise: 0,
      }),
    ).toThrow(RangeError);
  });
});

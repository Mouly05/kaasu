import { describe, expect, it } from "vitest";

import { computeOutstandingPaise } from "./service";

describe("computeOutstandingPaise", () => {
  it("returns the original amount when there are no repayments", () => {
    expect(computeOutstandingPaise(10_000_00, [])).toBe(10_000_00);
  });

  it("subtracts partial repayments", () => {
    expect(
      computeOutstandingPaise(10_000_00, [{ amountPaise: 2_000_00 }, { amountPaise: 1_500_00 }]),
    ).toBe(6_500_00);
  });

  it("returns 0 when repayments exactly match the original amount", () => {
    expect(
      computeOutstandingPaise(10_000_00, [{ amountPaise: 6_000_00 }, { amountPaise: 4_000_00 }]),
    ).toBe(0);
  });

  it("clamps to 0 on overpayment instead of going negative", () => {
    expect(computeOutstandingPaise(10_000_00, [{ amountPaise: 12_000_00 }])).toBe(0);
  });

  it("treats an explicit empty array the same as no repayments", () => {
    expect(computeOutstandingPaise(5_000_00, [])).toBe(5_000_00);
  });

  it("throws when originalPaise is not a safe integer", () => {
    expect(() => computeOutstandingPaise(100.5, [])).toThrow(RangeError);
  });

  it("throws when a repayment amount is not a safe integer", () => {
    expect(() => computeOutstandingPaise(10_000_00, [{ amountPaise: 50.25 }])).toThrow(RangeError);
  });
});

import { describe, expect, it } from "vitest";

import {
  addPaise,
  formatINR,
  fromPaise,
  isPaise,
  parseAmount,
  percentOf,
  ratioPercent,
  subPaise,
  toPaise,
} from "./money";

describe("isPaise", () => {
  it.each([
    [0, true],
    [-150, true],
    [Number.MAX_SAFE_INTEGER, true],
    [1.5, false],
    [Number.NaN, false],
    [Number.MAX_SAFE_INTEGER + 1, false],
    ["100", false],
    [null, false],
  ])("isPaise(%s) → %s", (value, expected) => {
    expect(isPaise(value)).toBe(expected);
  });
});

describe("toPaise (string)", () => {
  it.each([
    ["0", 0],
    ["1", 100],
    ["1.5", 150],
    ["1.50", 150],
    ["0.01", 1],
    [" 1234.56 ", 123456],
    ["+42", 4200],
    ["-42.10", -4210],
    ["-0", 0],
  ])("toPaise(%j) → %d", (input, expected) => {
    expect(toPaise(input)).toBe(expected);
    expect(Object.is(toPaise(input), -0)).toBe(false);
  });

  it.each(["", "abc", "1.234", "1,000", "₹5", "1.", ".5", "1e3"])("rejects %j", (input) => {
    expect(() => toPaise(input)).toThrow(RangeError);
  });

  it("rejects values beyond the safe integer range", () => {
    expect(() => toPaise("999999999999999999")).toThrow(RangeError);
  });
});

describe("toPaise (number)", () => {
  it.each([
    [0, 0],
    [1, 100],
    [0.1 + 0.2, 30],
    [1.005, 101],
    [-1.005, -101],
    [19.99, 1999],
    [123456.789, 12345679],
    [-0.001, 0],
  ])("toPaise(%d) → %d", (input, expected) => {
    expect(toPaise(input)).toBe(expected);
    expect(Object.is(toPaise(input), -0)).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects %d",
    (input) => {
      expect(() => toPaise(input)).toThrow(RangeError);
    },
  );

  it("rejects values beyond the safe integer range", () => {
    expect(() => toPaise(1e20)).toThrow(RangeError);
  });
});

describe("fromPaise", () => {
  it("converts paise to rupees", () => {
    expect(fromPaise(123456)).toBe(1234.56);
    expect(fromPaise(-50)).toBe(-0.5);
  });

  it("rejects non-integer paise", () => {
    expect(() => fromPaise(1.5)).toThrow(RangeError);
  });
});

describe("formatINR", () => {
  it.each([
    [0, "₹0"],
    [-0, "₹0"],
    [100, "₹1"],
    [12345600, "₹1,23,456"],
    [123456789, "₹12,34,567.89"],
    [123450, "₹1,234.50"],
    [-50000, "-₹500"],
    [1_00_00_000_00, "₹1,00,00,000"],
  ])("formatINR(%d) → %s", (paise, expected) => {
    expect(formatINR(paise)).toBe(expected);
  });

  it("can force or hide paise", () => {
    expect(formatINR(50000, { showPaise: true })).toBe("₹500.00");
    expect(formatINR(50050, { showPaise: false })).toBe("₹501");
  });

  it.each([
    [99900, "₹999"],
    [120000, "₹1.2K"],
    [1_50_000_00, "₹1.5L"],
    [3_40_00_000_00, "₹3.4Cr"],
    [-1_50_000_00, "-₹1.5L"],
  ])("compact formatINR(%d) → %s", (paise, expected) => {
    expect(formatINR(paise, { compact: true })).toBe(expected);
  });

  it("reuses cached formatters", () => {
    expect(formatINR(100)).toBe(formatINR(100));
    expect(formatINR(100, { compact: true })).toBe(formatINR(100, { compact: true }));
  });

  it("rejects non-integer paise", () => {
    expect(() => formatINR(1.5)).toThrow(RangeError);
  });
});

describe("parseAmount", () => {
  it.each([
    ["500", 50000],
    ["0", 0],
    ["₹5,000", 500000],
    ["₹ 1,23,456.50", 12345650],
    ["Rs. 250", 25000],
    ["rs 99.9", 9990],
    ["INR 10", 1000],
    ["500/-", 50000],
    ["1.2k", 120000],
    ["1.2K", 120000],
    ["1.2345k", 123450],
    ["1.5L", 1_50_000_00],
    ["2 lakh", 2_00_000_00],
    ["2 lakhs", 2_00_000_00],
    ["3 lac", 3_00_000_00],
    ["3 lacs", 3_00_000_00],
    ["2cr", 2_00_00_000_00],
    ["1.5 crore", 1_50_00_000_00],
    ["2 crores", 2_00_00_000_00],
    [".5", 50],
    ["10.555", 1056],
  ])("parseAmount(%j) → %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "-500", "5m", "1.2.3", "k", "₹", "1e3", "99999999999999999cr"])(
    "returns null for %j",
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );
});

describe("addPaise / subPaise", () => {
  it("adds any number of amounts", () => {
    expect(addPaise()).toBe(0);
    expect(addPaise(10, 20, -5)).toBe(25);
  });

  it("subtracts", () => {
    expect(subPaise(1000, 2500)).toBe(-1500);
  });

  it("rejects floats and overflow", () => {
    expect(() => addPaise(1, 0.5)).toThrow(RangeError);
    expect(() => addPaise(Number.MAX_SAFE_INTEGER, 1)).toThrow(RangeError);
    expect(() => subPaise(0.5, 1)).toThrow(RangeError);
    expect(() => subPaise(1, 0.5)).toThrow(RangeError);
    expect(() => subPaise(Number.MIN_SAFE_INTEGER, 1)).toThrow(RangeError);
  });
});

describe("percentOf", () => {
  it.each([
    [1_00_000, 12.5, 12_500],
    [1005, 50, 503],
    [-1005, 50, -503],
    [999, 33.3333, 333],
    [100, 0, 0],
    [123456, 100, 123456],
  ])("percentOf(%d, %d) → %d", (paise, percent, expected) => {
    expect(percentOf(paise, percent)).toBe(expected);
  });

  it("rejects bad input", () => {
    expect(() => percentOf(1.5, 10)).toThrow(RangeError);
    expect(() => percentOf(100, Number.NaN)).toThrow(RangeError);
  });
});

describe("ratioPercent", () => {
  it("returns part/whole as a percentage", () => {
    expect(ratioPercent(2500, 10000)).toBe(25);
    expect(ratioPercent(15000, 10000)).toBe(150);
  });

  it("returns 0 when the whole is 0", () => {
    expect(ratioPercent(500, 0)).toBe(0);
  });

  it("rejects non-integer paise", () => {
    expect(() => ratioPercent(0.5, 100)).toThrow(RangeError);
    expect(() => ratioPercent(1, 0.5)).toThrow(RangeError);
  });
});

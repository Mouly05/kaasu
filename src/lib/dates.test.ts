import { describe, expect, it } from "vitest";

import {
  daysLeftInMonth,
  endOfMonthIST,
  formatDay,
  monthKey,
  parseMonthKey,
  startOfMonthIST,
  todayIST,
} from "./dates";

const utc = (iso: string) => new Date(iso);

// IST = UTC+05:30, so 23:59 IST = 18:29 UTC and 00:00 IST = 18:30 UTC the previous day.
const SEP_30_2359_IST = utc("2026-09-30T18:29:00.000Z");
const OCT_01_0000_IST = utc("2026-09-30T18:30:00.000Z");

describe("todayIST", () => {
  it("returns 00:00 IST as a UTC instant", () => {
    expect(todayIST(utc("2026-09-30T10:00:00Z")).toISOString()).toBe("2026-09-29T18:30:00.000Z");
  });

  it("rolls over at IST midnight rather than UTC midnight", () => {
    expect(todayIST(SEP_30_2359_IST).toISOString()).toBe("2026-09-29T18:30:00.000Z");
    expect(todayIST(OCT_01_0000_IST).toISOString()).toBe("2026-09-30T18:30:00.000Z");
  });

  it("defaults to now", () => {
    expect(todayIST()).toBeInstanceOf(Date);
  });
});

describe("monthKey", () => {
  it("uses the IST month at the 23:59 / 00:00 boundary", () => {
    expect(monthKey(SEP_30_2359_IST)).toBe("2026-09");
    expect(monthKey(OCT_01_0000_IST)).toBe("2026-10");
  });

  it("rolls the year over at 31 Dec 23:59 IST", () => {
    expect(monthKey(utc("2026-12-31T18:29:59.999Z"))).toBe("2026-12");
    expect(monthKey(utc("2026-12-31T18:30:00.000Z"))).toBe("2027-01");
  });

  it("defaults to now", () => {
    expect(monthKey()).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("startOfMonthIST / endOfMonthIST", () => {
  it("brackets September at 23:59 IST on the 30th", () => {
    expect(startOfMonthIST(SEP_30_2359_IST).toISOString()).toBe("2026-08-31T18:30:00.000Z");
    expect(endOfMonthIST(SEP_30_2359_IST).toISOString()).toBe("2026-09-30T18:29:59.999Z");
  });

  it("switches to October at 00:00 IST on the 1st", () => {
    expect(startOfMonthIST(OCT_01_0000_IST).toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(endOfMonthIST(OCT_01_0000_IST).toISOString()).toBe("2026-10-31T18:29:59.999Z");
  });

  it("handles February in leap and non-leap years", () => {
    expect(endOfMonthIST(utc("2028-02-10T00:00:00Z")).toISOString()).toBe(
      "2028-02-29T18:29:59.999Z",
    );
    expect(endOfMonthIST(utc("2027-02-10T00:00:00Z")).toISOString()).toBe(
      "2027-02-28T18:29:59.999Z",
    );
  });

  it("defaults to now", () => {
    expect(startOfMonthIST().getTime()).toBeLessThan(endOfMonthIST().getTime());
  });
});

describe("parseMonthKey", () => {
  it("returns the UTC instant of the month start in IST", () => {
    expect(parseMonthKey("2026-10").toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(parseMonthKey("2027-01").toISOString()).toBe("2026-12-31T18:30:00.000Z");
  });

  it("round-trips with monthKey", () => {
    expect(monthKey(parseMonthKey("2026-02"))).toBe("2026-02");
  });

  it.each(["2026-13", "2026-1", "26-10", "", "2026-00"])("rejects %j", (key) => {
    expect(() => parseMonthKey(key)).toThrow(RangeError);
  });
});

describe("daysLeftInMonth", () => {
  it("counts today, so the last day of the month is 1", () => {
    expect(daysLeftInMonth(SEP_30_2359_IST)).toBe(1);
  });

  it("returns the full month on the 1st (IST)", () => {
    expect(daysLeftInMonth(OCT_01_0000_IST)).toBe(31);
    expect(daysLeftInMonth(utc("2028-02-01T00:00:00Z"))).toBe(29);
  });

  it("defaults to now", () => {
    expect(daysLeftInMonth()).toBeGreaterThanOrEqual(1);
  });
});

describe("formatDay", () => {
  it("formats short and long styles in IST", () => {
    expect(formatDay(OCT_01_0000_IST)).toBe("1 Oct");
    expect(formatDay(SEP_30_2359_IST, "short")).toBe("30 Sep");
    expect(formatDay(utc("2026-09-30T06:00:00Z"), "long")).toBe("Wed, 30 Sep 2026");
  });
});

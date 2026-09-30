import { describe, expect, it } from "vitest";

import {
  daysLeftInMonth,
  daysUntilIST,
  endOfDayIST,
  endOfMonthIST,
  formatDay,
  formatMonthLabel,
  monthKey,
  nextAnniversaryIST,
  nextIntervalOccurrenceIST,
  nthMonthlyOccurrenceIST,
  parseMonthKey,
  parseRelativeDateToken,
  shiftMonthKey,
  startOfMonthIST,
  todayIST,
  trailingWeekRangeIST,
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

describe("shiftMonthKey", () => {
  it("moves forward and backward within a year", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
    expect(shiftMonthKey("2026-09", -1)).toBe("2026-08");
  });

  it("rolls over year boundaries", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2027-01", -1)).toBe("2026-12");
  });

  it("supports multi-month jumps", () => {
    expect(shiftMonthKey("2026-01", 13)).toBe("2027-02");
  });
});

describe("formatMonthLabel", () => {
  it("formats as 'MMM yyyy'", () => {
    expect(formatMonthLabel("2026-10")).toBe("Oct 2026");
    expect(formatMonthLabel("2027-01")).toBe("Jan 2027");
  });
});

describe("formatDay", () => {
  it("formats short and long styles in IST", () => {
    expect(formatDay(OCT_01_0000_IST)).toBe("1 Oct");
    expect(formatDay(SEP_30_2359_IST, "short")).toBe("30 Sep");
    expect(formatDay(utc("2026-09-30T06:00:00Z"), "long")).toBe("Wed, 30 Sep 2026");
  });
});

describe("endOfDayIST", () => {
  it("returns 23:59:59.999 IST on the same IST day", () => {
    expect(endOfDayIST(SEP_30_2359_IST).toISOString()).toBe("2026-09-30T18:29:59.999Z");
    expect(endOfDayIST(OCT_01_0000_IST).toISOString()).toBe("2026-10-01T18:29:59.999Z");
  });

  it("defaults to now", () => {
    expect(endOfDayIST().getTime()).toBeGreaterThanOrEqual(todayIST().getTime());
  });
});

describe("parseRelativeDateToken", () => {
  it("resolves 'today' and 'yesterday' case-insensitively", () => {
    expect(parseRelativeDateToken("today", SEP_30_2359_IST)!.toISOString()).toBe(
      todayIST(SEP_30_2359_IST).toISOString(),
    );
    expect(parseRelativeDateToken("TODAY", SEP_30_2359_IST)!.toISOString()).toBe(
      todayIST(SEP_30_2359_IST).toISOString(),
    );
    expect(parseRelativeDateToken("Yesterday", OCT_01_0000_IST)!.toISOString()).toBe(
      "2026-09-29T18:30:00.000Z",
    );
  });

  it("parses dd-mm with no year using the current IST year", () => {
    expect(parseRelativeDateToken("01-10", SEP_30_2359_IST)!.toISOString()).toBe(
      OCT_01_0000_IST.toISOString(),
    );
    expect(parseRelativeDateToken("30-09", SEP_30_2359_IST)!.toISOString()).toBe(
      "2026-09-29T18:30:00.000Z",
    );
  });

  it("accepts single-digit day/month", () => {
    expect(parseRelativeDateToken("1-10", SEP_30_2359_IST)!.toISOString()).toBe(
      OCT_01_0000_IST.toISOString(),
    );
  });

  it("parses dd-mm-yyyy with an explicit year", () => {
    expect(parseRelativeDateToken("05-01-2026")!.toISOString()).toBe("2026-01-04T18:30:00.000Z");
  });

  it("does not roll a future dd-mm date back to a prior year", () => {
    // Parsed on 30 Sep 2026, "31-12" is still in the future this year — no rollback heuristic.
    expect(parseRelativeDateToken("31-12", SEP_30_2359_IST)!.toISOString()).toBe(
      "2026-12-30T18:30:00.000Z",
    );
  });

  it("rejects an impossible calendar date", () => {
    expect(parseRelativeDateToken("31-02", SEP_30_2359_IST)).toBeNull();
  });

  it("rejects out-of-range day or month", () => {
    expect(parseRelativeDateToken("32-01")).toBeNull();
    expect(parseRelativeDateToken("15-13")).toBeNull();
    expect(parseRelativeDateToken("00-05")).toBeNull();
  });

  it("rejects anything that isn't today/yesterday/dd-mm[-yyyy]", () => {
    expect(parseRelativeDateToken("swiggy")).toBeNull();
    expect(parseRelativeDateToken("120")).toBeNull();
    expect(parseRelativeDateToken("")).toBeNull();
  });
});

describe("daysUntilIST", () => {
  it("counts IST calendar days, not elapsed hours", () => {
    expect(daysUntilIST(OCT_01_0000_IST, SEP_30_2359_IST)).toBe(1);
    expect(daysUntilIST(SEP_30_2359_IST, SEP_30_2359_IST)).toBe(0);
    expect(daysUntilIST(SEP_30_2359_IST, OCT_01_0000_IST)).toBe(-1);
  });

  it("defaults now to the current instant", () => {
    expect(daysUntilIST(todayIST())).toBe(0);
  });
});

describe("nthMonthlyOccurrenceIST", () => {
  it("lands on dayOfMonth in the base month when monthOffset is 0", () => {
    expect(nthMonthlyOccurrenceIST(OCT_01_0000_IST, 15, 0).toISOString()).toBe(
      "2026-10-14T18:30:00.000Z",
    );
  });

  it("moves forward and backward by monthOffset", () => {
    expect(nthMonthlyOccurrenceIST(OCT_01_0000_IST, 15, 1).toISOString()).toBe(
      "2026-11-14T18:30:00.000Z",
    );
    expect(nthMonthlyOccurrenceIST(OCT_01_0000_IST, 15, -1).toISOString()).toBe(
      "2026-09-14T18:30:00.000Z",
    );
  });

  it("clamps to the last day of a shorter month", () => {
    const jan1_2026 = utc("2025-12-31T18:30:00.000Z"); // 00:00 IST, 1 Jan 2026
    expect(nthMonthlyOccurrenceIST(jan1_2026, 31, 1).toISOString()).toBe(
      "2026-02-27T18:30:00.000Z", // 28 Feb 2026 (non-leap)
    );
    const jan1_2028 = utc("2027-12-31T18:30:00.000Z"); // 00:00 IST, 1 Jan 2028
    expect(nthMonthlyOccurrenceIST(jan1_2028, 31, 1).toISOString()).toBe(
      "2028-02-28T18:30:00.000Z", // 29 Feb 2028 (leap)
    );
  });
});

describe("nextAnniversaryIST", () => {
  const OCT_15_2020 = utc("2020-10-14T18:30:00.000Z"); // 00:00 IST, 15 Oct 2020
  const FEB_29_2020 = utc("2020-02-28T18:30:00.000Z"); // 00:00 IST, 29 Feb 2020 (leap day)

  it("returns this year's occurrence when it hasn't passed yet", () => {
    expect(nextAnniversaryIST(OCT_15_2020, OCT_01_0000_IST).toISOString()).toBe(
      "2026-10-14T18:30:00.000Z", // 15 Oct 2026
    );
  });

  it("rolls to next year once this year's occurrence has passed", () => {
    expect(nextAnniversaryIST(OCT_15_2020, utc("2026-10-20T00:00:00Z")).toISOString()).toBe(
      "2027-10-14T18:30:00.000Z", // 15 Oct 2027
    );
  });

  it("clamps a 29 Feb anniversary to 28 Feb in a non-leap year", () => {
    expect(nextAnniversaryIST(FEB_29_2020, utc("2026-01-01T00:00:00Z")).toISOString()).toBe(
      "2026-02-27T18:30:00.000Z", // 28 Feb 2026
    );
  });

  it("defaults to now", () => {
    expect(nextAnniversaryIST(OCT_15_2020).getTime()).toBeGreaterThan(0);
  });
});

describe("nextIntervalOccurrenceIST", () => {
  it("returns now's day when it's exactly on the cycle", () => {
    expect(nextIntervalOccurrenceIST(OCT_01_0000_IST, 7, OCT_01_0000_IST).toISOString()).toBe(
      OCT_01_0000_IST.toISOString(),
    );
    expect(nextIntervalOccurrenceIST(OCT_01_0000_IST, 7, utc("2026-10-08T10:00:00Z")).toISOString()).toBe(
      "2026-10-07T18:30:00.000Z", // 8 Oct 2026
    );
  });

  it("rolls forward to the next occurrence mid-cycle", () => {
    expect(nextIntervalOccurrenceIST(OCT_01_0000_IST, 7, utc("2026-10-04T10:00:00Z")).toISOString()).toBe(
      "2026-10-07T18:30:00.000Z", // 8 Oct 2026, 4 days into the 7-day cycle
    );
  });

  it("handles an anchor date that is in the future relative to now", () => {
    const anchorOct17 = utc("2026-10-16T18:30:00.000Z"); // 00:00 IST, 17 Oct 2026
    expect(nextIntervalOccurrenceIST(anchorOct17, 7, OCT_01_0000_IST).toISOString()).toBe(
      "2026-10-02T18:30:00.000Z", // 3 Oct 2026 — still on the 17th's 7-day cycle
    );
  });
});

describe("trailingWeekRangeIST", () => {
  it("spans the 7 IST days ending on the given date, inclusive", () => {
    const { start, end } = trailingWeekRangeIST(SEP_30_2359_IST);
    expect(start.toISOString()).toBe("2026-09-23T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-09-30T18:29:59.999Z");
    // 7 IST calendar days inclusive: exactly 7*24h minus 1ms.
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it("defaults to now", () => {
    const { start, end } = trailingWeekRangeIST();
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
});

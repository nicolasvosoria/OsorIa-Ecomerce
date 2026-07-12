import { describe, expect, it } from "vitest";

import {
  getBusinessDayStartUtc,
  getBusinessMonthStartUtc,
  toBusinessDayKey,
} from "@/lib/date/business-day";

const COLOMBIA_OFFSET_HOURS = -5;

describe("getBusinessDayStartUtc", () => {
  it("returns the UTC instant of local midnight for the given day", () => {
    const now = new Date("2026-04-26T15:30:00.000Z");

    const start = getBusinessDayStartUtc(now, COLOMBIA_OFFSET_HOURS);

    expect(start.toISOString()).toBe("2026-04-26T05:00:00.000Z");
  });

  it("stays on the previous UTC day when local time has not reached midnight yet", () => {
    const now = new Date("2026-04-27T04:30:00.000Z");

    const start = getBusinessDayStartUtc(now, COLOMBIA_OFFSET_HOURS);

    expect(start.toISOString()).toBe("2026-04-26T05:00:00.000Z");
  });
});

describe("getBusinessMonthStartUtc", () => {
  it("returns the UTC instant of local midnight on the first day of the month", () => {
    const now = new Date("2026-04-26T15:30:00.000Z");

    const start = getBusinessMonthStartUtc(now, COLOMBIA_OFFSET_HOURS);

    expect(start.toISOString()).toBe("2026-04-01T05:00:00.000Z");
  });
});

describe("toBusinessDayKey", () => {
  it("keys a timestamp by its local calendar day, not its UTC day", () => {
    // 2026-04-27T04:30:00Z is UTC day 27, but local (UTC-5) is still 2026-04-26 23:30.
    const utcNextDay = new Date("2026-04-27T04:30:00.000Z");

    expect(toBusinessDayKey(utcNextDay, COLOMBIA_OFFSET_HOURS)).toBe("2026-04-26");
  });

  it("keys a timestamp already past local midnight on the same UTC day", () => {
    const sameUtcDay = new Date("2026-04-26T15:30:00.000Z");

    expect(toBusinessDayKey(sameUtcDay, COLOMBIA_OFFSET_HOURS)).toBe("2026-04-26");
  });
});

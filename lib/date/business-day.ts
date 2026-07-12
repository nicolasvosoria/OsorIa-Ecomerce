const BUSINESS_UTC_OFFSET_HOURS = Number(process.env.BUSINESS_UTC_OFFSET_HOURS ?? -5)
const MS_PER_HOUR = 3_600_000

function toBusinessLocalDate(date: Date, offsetHours: number): Date {
  return new Date(date.getTime() + offsetHours * MS_PER_HOUR)
}

export function getBusinessDayStartUtc(now: Date, offsetHours: number = BUSINESS_UTC_OFFSET_HOURS): Date {
  const local = toBusinessLocalDate(now, offsetHours)
  const localMidnightUtcMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  return new Date(localMidnightUtcMs - offsetHours * MS_PER_HOUR)
}

export function getBusinessMonthStartUtc(now: Date, offsetHours: number = BUSINESS_UTC_OFFSET_HOURS): Date {
  const local = toBusinessLocalDate(now, offsetHours)
  const localMonthStartUtcMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1)
  return new Date(localMonthStartUtcMs - offsetHours * MS_PER_HOUR)
}

export function toBusinessDayKey(date: Date, offsetHours: number = BUSINESS_UTC_OFFSET_HOURS): string {
  return toBusinessLocalDate(date, offsetHours).toISOString().split('T')[0]
}

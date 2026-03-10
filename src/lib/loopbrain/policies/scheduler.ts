/**
 * Policy Schedule Calculator
 *
 * Computes the next execution time for a scheduled policy based on its
 * schedule type and configuration. Handles timezone conversion.
 */

import type { ScheduleConfig } from '@/lib/validations/policies'

/**
 * Compute the next run time for a scheduled policy.
 *
 * @param config - The schedule configuration (DAILY, WEEKLY, MONTHLY, or CRON)
 * @param fromDate - The reference date (defaults to now). The next run will be
 *                   strictly after this date.
 * @returns The next execution Date, or null if the config is invalid.
 */
export function computeNextRunAt(
  config: ScheduleConfig,
  fromDate: Date = new Date(),
): Date | null {
  switch (config.type) {
    case 'DAILY':
      return computeDaily(config.time, config.timezone, fromDate)
    case 'WEEKLY':
      return computeWeekly(config.time, config.dayOfWeek, config.timezone, fromDate)
    case 'MONTHLY':
      return computeMonthly(config.time, config.dayOfMonth, config.timezone, fromDate)
    case 'CRON':
      return computeCron(config.expression, fromDate)
    default:
      return null
  }
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number)
  return { hours: h, minutes: m }
}

function computeDaily(time: string, timezone: string, from: Date): Date {
  const { hours, minutes } = parseTime(time)
  const candidate = toTimezoneDate(from, timezone, hours, minutes)

  if (candidate.getTime() <= from.getTime()) {
    candidate.setDate(candidate.getDate() + 1)
    return toTimezoneDate(candidate, timezone, hours, minutes)
  }
  return candidate
}

function computeWeekly(
  time: string,
  dayOfWeek: number,
  timezone: string,
  from: Date,
): Date {
  const { hours, minutes } = parseTime(time)
  const candidate = toTimezoneDate(from, timezone, hours, minutes)

  const currentDay = candidate.getUTCDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil < 0) daysUntil += 7
  if (daysUntil === 0 && candidate.getTime() <= from.getTime()) {
    daysUntil = 7
  }

  candidate.setDate(candidate.getDate() + daysUntil)
  return toTimezoneDate(candidate, timezone, hours, minutes)
}

function computeMonthly(
  time: string,
  dayOfMonth: number,
  timezone: string,
  from: Date,
): Date {
  const { hours, minutes } = parseTime(time)
  const candidate = toTimezoneDate(from, timezone, hours, minutes)
  candidate.setDate(dayOfMonth)

  if (candidate.getTime() <= from.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1)
    candidate.setDate(dayOfMonth)
  }

  return toTimezoneDate(candidate, timezone, hours, minutes)
}

/**
 * Minimal cron parser supporting standard 5-field expressions.
 * For MVP, handles simple patterns: minute hour dayOfMonth month dayOfWeek.
 * Falls back to 15-minute intervals if expression cannot be parsed.
 */
function computeCron(expression: string, from: Date): Date {
  const parts = expression.trim().split(/\s+/)
  if (parts.length < 5) {
    return new Date(from.getTime() + 15 * 60 * 1000)
  }

  const [minPart, hourPart, domPart, , dowPart] = parts

  const minute = minPart === '*' ? null : parseInt(minPart, 10)
  const hour = hourPart === '*' ? null : parseInt(hourPart, 10)
  const dayOfMonth = domPart === '*' ? null : parseInt(domPart, 10)
  const dayOfWeek = dowPart === '*' ? null : parseInt(dowPart, 10)

  const candidate = new Date(from.getTime() + 60_000)
  candidate.setUTCSeconds(0, 0)

  for (let i = 0; i < 60 * 24 * 32; i++) {
    if (minute !== null && candidate.getUTCMinutes() !== minute) {
      candidate.setTime(candidate.getTime() + 60_000)
      continue
    }
    if (hour !== null && candidate.getUTCHours() !== hour) {
      candidate.setTime(candidate.getTime() + 60_000)
      continue
    }
    if (dayOfMonth !== null && candidate.getUTCDate() !== dayOfMonth) {
      candidate.setTime(candidate.getTime() + 60_000)
      continue
    }
    if (dayOfWeek !== null && candidate.getUTCDay() !== dayOfWeek) {
      candidate.setTime(candidate.getTime() + 60_000)
      continue
    }
    return candidate
  }

  return new Date(from.getTime() + 15 * 60 * 1000)
}

/**
 * Create a UTC Date representing the given local time in the specified timezone.
 * Uses Intl.DateTimeFormat for timezone offset resolution.
 */
function toTimezoneDate(
  base: Date,
  timezone: string,
  hours: number,
  minutes: number,
): Date {
  try {
    const utcDate = new Date(Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ))

    if (timezone === 'UTC') return utcDate

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const localHour = parseInt(formatter.format(utcDate), 10)
    const offsetHours = localHour - hours
    utcDate.setTime(utcDate.getTime() - offsetHours * 60 * 60 * 1000)

    return utcDate
  } catch {
    return new Date(Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hours,
      minutes,
      0,
      0,
    ))
  }
}

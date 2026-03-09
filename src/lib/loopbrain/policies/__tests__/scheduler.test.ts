import { describe, it, expect } from 'vitest'
import { computeNextRunAt } from '../scheduler'
import type { ScheduleConfig } from '@/lib/validations/policies'

describe('computeNextRunAt', () => {
  const baseDate = new Date('2026-03-09T06:00:00Z')

  describe('DAILY', () => {
    it('returns today if time has not passed', () => {
      const config: ScheduleConfig = { type: 'DAILY', time: '08:00', timezone: 'UTC' }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCHours()).toBe(8)
      expect(result!.getUTCMinutes()).toBe(0)
      expect(result!.getUTCDate()).toBe(9)
    })

    it('returns tomorrow if time has passed', () => {
      const config: ScheduleConfig = { type: 'DAILY', time: '05:00', timezone: 'UTC' }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCDate()).toBe(10)
      expect(result!.getUTCHours()).toBe(5)
    })
  })

  describe('WEEKLY', () => {
    it('returns next occurrence of the specified day', () => {
      const config: ScheduleConfig = {
        type: 'WEEKLY',
        time: '08:00',
        dayOfWeek: 3,
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCDay()).toBe(3)
      expect(result!.getUTCHours()).toBe(8)
    })

    it('returns next week if same day has passed', () => {
      const monday8am = new Date('2026-03-09T09:00:00Z')
      const config: ScheduleConfig = {
        type: 'WEEKLY',
        time: '08:00',
        dayOfWeek: 1,
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, monday8am)
      expect(result).not.toBeNull()
      expect(result!.getUTCDay()).toBe(1)
      expect(result!.getUTCDate()).toBe(16)
    })
  })

  describe('MONTHLY', () => {
    it('returns this month if day has not passed', () => {
      const config: ScheduleConfig = {
        type: 'MONTHLY',
        time: '08:00',
        dayOfMonth: 15,
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCDate()).toBe(15)
      expect(result!.getUTCHours()).toBe(8)
    })

    it('returns next month if day has passed', () => {
      const config: ScheduleConfig = {
        type: 'MONTHLY',
        time: '08:00',
        dayOfMonth: 5,
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCMonth()).toBe(3)
      expect(result!.getUTCDate()).toBe(5)
    })
  })

  describe('CRON', () => {
    it('parses a simple cron expression', () => {
      const config: ScheduleConfig = {
        type: 'CRON',
        expression: '0 8 * * 1',
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getUTCHours()).toBe(8)
      expect(result!.getUTCMinutes()).toBe(0)
      expect(result!.getUTCDay()).toBe(1)
    })

    it('falls back to 15 minutes for invalid expressions', () => {
      const config: ScheduleConfig = {
        type: 'CRON',
        expression: 'invalid',
        timezone: 'UTC',
      }
      const result = computeNextRunAt(config, baseDate)
      expect(result).not.toBeNull()
      expect(result!.getTime()).toBe(baseDate.getTime() + 15 * 60 * 1000)
    })
  })

  it('returns null for unknown schedule type', () => {
    const config = { type: 'UNKNOWN', time: '08:00', timezone: 'UTC' } as unknown as ScheduleConfig
    const result = computeNextRunAt(config, baseDate)
    expect(result).toBeNull()
  })
})

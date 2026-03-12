'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parse, isValid, addMonths, subMonths, startOfMonth } from 'date-fns'
import { getMonthDates, isInCurrentMonth } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export type DateGranularity = 'day' | 'month' | 'quarter' | 'half-year' | 'year'

interface CalendarDatePickerProps {
  value: string
  onChange: (dateStr: string) => void
  placeholder?: string
  disabled?: boolean
  showInput?: boolean
  /** When true, show granularity tabs. Default true. */
  showGranularityTabs?: boolean
  /** Called after a date is selected (e.g. to close the popover) */
  onSelect?: () => void
}

const GRANULARITY_TABS: { id: DateGranularity; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'half-year', label: 'Half-year' },
  { id: 'year', label: 'Year' },
]

function parseFlexibleDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // ISO: 2026-03-11
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) {
    const d = parse(trimmed, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : null
  }

  // US: 3/11/2026, 03/11/2026
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const d = parse(trimmed, 'M/d/yyyy', new Date())
    return isValid(d) ? d : null
  }

  // Month Year: May 2027, March 2026
  const monthYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (monthYearMatch) {
    const d = parse(trimmed, 'MMMM yyyy', new Date())
    if (isValid(d)) return d
    const d2 = parse(trimmed, 'MMM yyyy', new Date())
    return isValid(d2) ? d2 : null
  }

  // Quarter: Q4 2026, Q1 2027
  const qMatch = trimmed.match(/^Q([1-4])\s+(\d{4})$/i)
  if (qMatch) {
    const year = parseInt(qMatch[2], 10)
    const q = parseInt(qMatch[1], 10)
    const month = (q - 1) * 3
    return new Date(year, month, 1)
  }

  // Year only
  const yearMatch = trimmed.match(/^\d{4}$/)
  if (yearMatch) {
    return new Date(parseInt(trimmed, 10), 0, 1)
  }

  return null
}

function dateToValue(date: Date, granularity: DateGranularity): string {
  switch (granularity) {
    case 'day':
    case 'month':
      return format(date, 'yyyy-MM-dd')
    case 'quarter':
    case 'half-year':
    case 'year':
      return format(date, 'yyyy-MM-dd')
    default:
      return format(date, 'yyyy-MM-dd')
  }
}

function getDisplayLabel(value: string, granularity: DateGranularity): string {
  if (!value) return ''
  const d = new Date(value + 'T00:00:00')
  if (!isValid(d)) return value
  switch (granularity) {
    case 'month':
      return format(d, 'MMMM yyyy')
    case 'quarter':
      return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
    case 'half-year':
      return d.getMonth() < 6 ? `H1 ${d.getFullYear()}` : `H2 ${d.getFullYear()}`
    case 'year':
      return format(d, 'yyyy')
    default:
      return format(d, 'MM/dd/yyyy')
  }
}

export function CalendarDatePicker({
  value,
  onChange,
  placeholder = 'Try: 3/11/2026, May 2027, Q4 2026',
  disabled = false,
  showInput = true,
  showGranularityTabs = true,
  onSelect,
}: CalendarDatePickerProps) {
  const selectedDate = value ? new Date(value + 'T00:00:00') : new Date()
  const [viewDate, setViewDate] = useState(() =>
    value ? new Date(value + 'T00:00:00') : new Date()
  )
  const [granularity, setGranularity] = useState<DateGranularity>('day')
  const [inputValue, setInputValue] = useState(value ? getDisplayLabel(value, granularity) : '')

  useEffect(() => {
    if (value) {
      setInputValue(getDisplayLabel(value, granularity))
    } else {
      setInputValue('')
    }
  }, [value, granularity])

  const effectiveDate = value && isValid(selectedDate) ? selectedDate : null

  const prev = () => {
    if (granularity === 'day' || granularity === 'month') {
      setViewDate((d) => subMonths(d, 1))
    } else if (granularity === 'quarter') {
      setViewDate((d) => {
        const m = d.getMonth()
        const newM = m < 3 ? m + 9 : m - 3
        const y = m < 3 ? d.getFullYear() - 1 : d.getFullYear()
        return new Date(y, newM, 1)
      })
    } else if (granularity === 'half-year') {
      setViewDate((d) => (d.getMonth() < 6 ? new Date(d.getFullYear() - 1, 6, 1) : new Date(d.getFullYear(), 0, 1)))
    } else {
      setViewDate((d) => new Date(d.getFullYear() - 1, 0, 1))
    }
  }

  const next = () => {
    if (granularity === 'day' || granularity === 'month') {
      setViewDate((d) => addMonths(d, 1))
    } else if (granularity === 'quarter') {
      setViewDate((d) => {
        const m = d.getMonth()
        const newM = m >= 9 ? 0 : m + 3
        const y = m >= 9 ? d.getFullYear() + 1 : d.getFullYear()
        return new Date(y, newM, 1)
      })
    } else if (granularity === 'half-year') {
      setViewDate((d) => (d.getMonth() < 6 ? new Date(d.getFullYear(), 6, 1) : new Date(d.getFullYear() + 1, 0, 1)))
    } else {
      setViewDate((d) => new Date(d.getFullYear() + 1, 0, 1))
    }
  }

  const headerLabel =
    granularity === 'day' || granularity === 'month'
      ? format(viewDate, 'MMMM yyyy')
      : granularity === 'quarter'
        ? `Q${Math.floor(viewDate.getMonth() / 3) + 1} ${viewDate.getFullYear()}`
        : granularity === 'half-year'
          ? (viewDate.getMonth() < 6 ? 'H1' : 'H2') + ' ' + viewDate.getFullYear()
          : String(viewDate.getFullYear())

  const handleInputBlur = () => {
    const parsed = parseFlexibleDate(inputValue)
    if (parsed) {
      onChange(format(parsed, 'yyyy-MM-dd'))
      setViewDate(parsed)
    } else if (value) {
      setInputValue(getDisplayLabel(value, granularity))
    } else {
      setInputValue('')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInputBlur()
  }

  const handleSelectDate = (date: Date) => {
    const str = format(date, 'yyyy-MM-dd')
    onChange(str)
    setInputValue(getDisplayLabel(str, granularity))
    onSelect?.()
  }

  const handleSelectMonth = (monthIndex: number) => {
    const d = startOfMonth(new Date(viewDate.getFullYear(), monthIndex, 1))
    handleSelectDate(d)
  }

  const handleSelectQuarter = (q: number) => {
    const d = new Date(viewDate.getFullYear(), (q - 1) * 3, 1)
    handleSelectDate(d)
  }

  const handleSelectYear = (year: number) => {
    handleSelectDate(new Date(year, 0, 1))
  }

  const daysInMonth = useMemo(() => getMonthDates(viewDate, 0), [viewDate])
  const today = new Date()

  const isSelected = (date: Date) =>
    effectiveDate != null &&
    date.getDate() === effectiveDate.getDate() &&
    date.getMonth() === effectiveDate.getMonth() &&
    date.getFullYear() === effectiveDate.getFullYear()

  return (
    <div className="flex flex-col gap-2 p-2 min-w-[280px]">
      {showInput && (
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase">Target date</label>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="h-7 text-xs"
          />
        </div>
      )}

      {showGranularityTabs && (
        <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/50">
          {GRANULARITY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGranularity(tab.id)}
              disabled={disabled}
              className={cn(
                'flex-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                granularity === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Calendar / Picker header */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{headerLabel}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prev}
            disabled={disabled}
            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={disabled}
            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {granularity === 'day' && (
        <>
          <div className="grid grid-cols-7 text-[10px] text-muted-foreground">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center py-0.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {daysInMonth.map((date) => {
              const dayIsToday = date.toDateString() === today.toDateString()
              const dayIsSelected = isSelected(date)
              const dayIsCurrentMonth = isInCurrentMonth(date, viewDate)

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  disabled={disabled}
                  className={cn(
                    'w-8 h-8 text-xs rounded-md flex items-center justify-center transition-colors',
                    dayIsToday && 'bg-primary/20 text-primary font-semibold border border-primary/30',
                    dayIsSelected && !dayIsToday && 'bg-primary text-primary-foreground font-medium',
                    !dayIsSelected && !dayIsToday && 'hover:bg-accent',
                    dayIsCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                  )}
                >
                  {format(date, 'd')}
                </button>
              )
            })}
          </div>
        </>
      )}

      {granularity === 'month' && (
        <div className="grid grid-cols-3 gap-1">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => {
            const isActive =
              effectiveDate != null &&
              effectiveDate.getMonth() === i &&
              effectiveDate.getFullYear() === viewDate.getFullYear()
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectMonth(i)}
                disabled={disabled}
                className={cn(
                  'px-2 py-1.5 rounded text-xs text-center transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}

      {granularity === 'quarter' && (
        <div className="grid grid-cols-2 gap-1">
          {[1, 2, 3, 4].map((q) => {
            const isActive =
              effectiveDate != null &&
              Math.floor(effectiveDate.getMonth() / 3) + 1 === q &&
              effectiveDate.getFullYear() === viewDate.getFullYear()
            return (
              <button
                key={q}
                type="button"
                onClick={() => handleSelectQuarter(q)}
                disabled={disabled}
                className={cn(
                  'px-2 py-1.5 rounded text-xs text-center transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                Q{q} {viewDate.getFullYear()}
              </button>
            )
          })}
        </div>
      )}

      {granularity === 'half-year' && (
        <div className="grid grid-cols-2 gap-1">
          {[
            { h: 1, label: 'H1', month: 0 },
            { h: 2, label: 'H2', month: 6 },
          ].map(({ h, label }) => {
            const isActive =
              effectiveDate != null &&
              (effectiveDate.getMonth() < 6 ? 1 : 2) === h &&
              effectiveDate.getFullYear() === viewDate.getFullYear()
            return (
              <button
                key={h}
                type="button"
                onClick={() => handleSelectDate(new Date(viewDate.getFullYear(), h === 1 ? 0 : 6, 1))}
                disabled={disabled}
                className={cn(
                  'px-2 py-1.5 rounded text-xs text-center transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {label} {viewDate.getFullYear()}
              </button>
            )
          })}
        </div>
      )}

      {granularity === 'year' && (
        <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
          {Array.from({ length: 12 }, (_, i) => viewDate.getFullYear() - 5 + i).map((y) => {
            const isActive = effectiveDate != null && effectiveDate.getFullYear() === y
            return (
              <button
                key={y}
                type="button"
                onClick={() => handleSelectYear(y)}
                disabled={disabled}
                className={cn(
                  'px-2 py-1.5 rounded text-xs text-center transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                )}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

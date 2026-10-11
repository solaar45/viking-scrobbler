import React, { createContext, useContext, useState, useEffect } from 'react'

export type TimeRangePreset = 'week' | 'month' | 'year' | 'all_time'
export type TimeRangeType = TimeRangePreset | 'custom'

export interface TimeRangeState {
  range: TimeRangeType
  customFrom: string // 'YYYY-MM-DD'
  customTo: string   // 'YYYY-MM-DD'
}

interface TimeRangeContextValue {
  timeRange: TimeRangeState
  setPreset: (preset: TimeRangePreset) => void
  setCustomRange: (from: string, to: string) => void
  toQueryParams: () => Record<string, string>
  toQueryString: () => string
  formatRangeLabel: () => string
}

const STORAGE_KEY = 'viking_time_range_filter'

const defaultState: TimeRangeState = {
  range: 'all_time',
  customFrom: '',
  customTo: '',
}

const TimeRangeContext = createContext<TimeRangeContextValue | undefined>(undefined)

export const PRESET_OPTIONS: Array<{ id: TimeRangePreset; label: string; days: number | null }> = [
  { id: 'week', label: 'Last 7 Days', days: 7 },
  { id: 'month', label: 'Last 30 Days', days: 30 },
  { id: 'year', label: 'Last Year', days: 365 },
  { id: 'all_time', label: 'All Time', days: null },
]

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRangeState>(() => {
    if (typeof window === 'undefined') return defaultState
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (['week', 'month', 'year', 'all_time', 'custom'].includes(parsed.range)) {
          return {
            range: parsed.range,
            customFrom: parsed.customFrom || '',
            customTo: parsed.customTo || '',
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved time range filter', e)
    }
    return defaultState
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timeRange))
    } catch (e) {
      console.warn('Failed to save time range filter', e)
    }
  }, [timeRange])

  const setPreset = (preset: TimeRangePreset) => {
    setTimeRange({
      range: preset,
      customFrom: '',
      customTo: '',
    })
  }

  const setCustomRange = (from: string, to: string) => {
    setTimeRange({
      range: 'custom',
      customFrom: from,
      customTo: to,
    })
  }

  const toQueryParams = (): Record<string, string> => {
    if (timeRange.range === 'custom') {
      const params: Record<string, string> = { range: 'custom' }
      if (timeRange.customFrom) params.from = timeRange.customFrom
      if (timeRange.customTo) params.to = timeRange.customTo
      return params
    }
    return { range: timeRange.range }
  }

  const toQueryString = (): string => {
    const params = toQueryParams()
    const searchParams = new URLSearchParams(params)
    return searchParams.toString()
  }

  const formatRangeLabel = (): string => {
    if (timeRange.range === 'custom') {
      if (timeRange.customFrom && timeRange.customTo) {
        return `${timeRange.customFrom} - ${timeRange.customTo}`
      }
      if (timeRange.customFrom) return `Ab ${timeRange.customFrom}`
      if (timeRange.customTo) return `Bis ${timeRange.customTo}`
      return 'Custom Date'
    }
    const found = PRESET_OPTIONS.find((p) => p.id === timeRange.range)
    return found ? found.label : 'All Time'
  }

  return (
    <TimeRangeContext.Provider
      value={{
        timeRange,
        setPreset,
        setCustomRange,
        toQueryParams,
        toQueryString,
        formatRangeLabel,
      }}
    >
      {children}
    </TimeRangeContext.Provider>
  )
}

export function useTimeRange() {
  const context = useContext(TimeRangeContext)
  if (!context) {
    throw new Error('useTimeRange must be used within a TimeRangeProvider')
  }
  return context
}

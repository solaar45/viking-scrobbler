import React, { useState } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react'
import { useTimeRange, PRESET_OPTIONS } from '@/context/TimeRangeContext'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/design-tokens'

interface TimeRangeFilterBarProps {
  className?: string
}

export function TimeRangeFilterBar({ className }: TimeRangeFilterBarProps) {
  const { timeRange, setPreset, setCustomRange } = useTimeRange()
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(timeRange.customFrom || '')
  const [draftTo, setDraftTo] = useState(timeRange.customTo || '')

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftFrom(timeRange.customFrom || '')
      setDraftTo(timeRange.customTo || '')
    }
    setOpen(nextOpen)
  }

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftFrom && !draftTo) {
      setPreset('all_time')
    } else {
      setCustomRange(draftFrom, draftTo)
    }
    setOpen(false)
  }

  const clearCustom = () => {
    setPreset('all_time')
    setDraftFrom('')
    setDraftTo('')
    setOpen(false)
  }

  const formatDisplayCustom = () => {
    if (!timeRange.customFrom && !timeRange.customTo) return 'Custom'
    const formatDate = (iso: string) => {
      if (!iso) return ''
      const parts = iso.split('-')
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0].slice(2)}`
      return iso
    }
    if (timeRange.customFrom && timeRange.customTo) {
      return `${formatDate(timeRange.customFrom)} – ${formatDate(timeRange.customTo)}`
    }
    if (timeRange.customFrom) return `Ab ${formatDate(timeRange.customFrom)}`
    return `Bis ${formatDate(timeRange.customTo)}`
  }

  return (
    <div
      className={cn(
        'flex items-center flex-wrap gap-1 bg-viking-bg-tertiary p-1.5 rounded-lg border border-viking-border-default shadow-sm',
        className
      )}
    >
      {/* Preset Buttons */}
      {PRESET_OPTIONS.map(({ id, label }) => {
        const isActive = timeRange.range === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-150',
              isActive
                ? 'bg-viking-purple text-white shadow'
                : 'text-viking-text-secondary hover:text-viking-text-primary hover:bg-viking-bg-elevated'
            )}
          >
            {label}
          </button>
        )
      })}

      {/* Custom Date Popover */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-150',
              timeRange.range === 'custom'
                ? 'bg-viking-purple text-white shadow'
                : 'text-viking-text-secondary hover:text-viking-text-primary hover:bg-viking-bg-elevated'
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{timeRange.range === 'custom' ? formatDisplayCustom() : 'Custom'}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 p-4 bg-viking-bg-secondary border border-viking-border-default shadow-xl rounded-xl text-viking-text-primary z-50"
        >
          <form onSubmit={applyCustom} className="space-y-4">
            <div className="flex items-center justify-between border-b border-viking-border-default pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-viking-purple" />
                <span className="font-semibold text-sm">Select Date Range</span>
              </div>
              {timeRange.range === 'custom' && (
                <button
                  type="button"
                  onClick={clearCustom}
                  className="text-xs text-viking-text-muted hover:text-red-400 flex items-center gap-1 transition-colors"
                  title="Reset custom filter"
                >
                  <X className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-viking-text-secondary mb-1">
                  From (Start date)
                </label>
                <input
                  type="date"
                  value={draftFrom}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-viking-bg-elevated border border-viking-border-default text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple focus:border-transparent transition-all scheme-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-viking-text-secondary mb-1">
                  To (End date)
                </label>
                <input
                  type="date"
                  value={draftTo}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-viking-bg-elevated border border-viking-border-default text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple focus:border-transparent transition-all scheme-dark"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-viking-border-default">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-viking-text-secondary hover:text-viking-text-primary hover:bg-viking-bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!draftFrom && !draftTo}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-viking-purple text-white hover:bg-viking-purple/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow"
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}

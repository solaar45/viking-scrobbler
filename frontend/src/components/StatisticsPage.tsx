import { useState } from 'react'
import { TrendingUp, Users, Music, Disc, Guitar, Calendar, CalendarDays, Clock, Timer } from 'lucide-react'
import { VIKING_DESIGN, cn } from '@/lib/design-tokens'
import { StatsTable } from './StatsTable'

type StatType = 'artists' | 'tracks' | 'albums' | 'genres' | 'years' | 'dates' | 'times' | 'durations'
type TimeRange = 'week' | 'month' | 'year' | 'all_time'

const STAT_CONFIGS = {
  artists: { icon: Users, label: 'Artists', emoji: '🎤' },
  tracks: { icon: Music, label: 'Tracks', emoji: '🎵' },
  albums: { icon: Disc, label: 'Albums', emoji: '💿' },
  genres: { icon: Guitar, label: 'Genres', emoji: '🎸' },
  years: { icon: Calendar, label: 'Years', emoji: '📅' },
  dates: { icon: CalendarDays, label: 'Dates', emoji: '📆' },
  times: { icon: Clock, label: 'Times', emoji: '🕐' },
  durations: { icon: Timer, label: 'Durations', emoji: '⏱️' },
} as const

export function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<StatType>('artists')
  const [timeRange, setTimeRange] = useState<TimeRange>('all_time')

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <TrendingUp className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_DESIGN.typography.title.page}>Statistics</h1>
        </div>

        {/* Time Range Filter - ANALOG RECENT LISTENS */}
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", VIKING_DESIGN.colors.text.secondary)}>
            Time Range:
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium",
              VIKING_DESIGN.colors.card.elevated,
              VIKING_DESIGN.colors.text.primary,
              "border border-viking-border-default",
              "focus:outline-none focus:ring-2 focus:ring-viking-purple",
              VIKING_DESIGN.effects.transition.base
            )}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {(Object.keys(STAT_CONFIGS) as StatType[]).map((type) => {
          const config = STAT_CONFIGS[type]
          const isActive = activeTab === type

          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg",
                VIKING_DESIGN.effects.transition.base,
                isActive
                  ? cn(
                      "bg-gradient-to-r from-viking-purple to-viking-purple-dark text-white",
                      "shadow-lg shadow-viking-purple/30"
                    )
                  : cn(
                      VIKING_DESIGN.colors.card.base,
                      "hover:bg-viking-bg-elevated",
                      VIKING_DESIGN.colors.text.secondary,
                      "hover:text-viking-text-primary"
                    )
              )}
            >
              <span className="text-2xl">{config.emoji}</span>
              <span className="text-xs font-semibold text-center leading-tight">
                {config.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ACTIVE TABLE */}
      <StatsTable type={activeTab} timeRange={timeRange} />
    </div>
  )
}

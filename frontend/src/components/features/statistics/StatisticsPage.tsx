import { useState } from 'react'
import { TrendingUp, Users, Music, Disc, Guitar, Calendar, CalendarDays, Clock, Timer } from 'lucide-react'
import { VIKING_DESIGN, VIKING_TYPOGRAPHY, cn } from '@/lib/design-tokens'
import { StatsTable } from '@/components/StatsTable'
import { TimeRangeFilterBar } from '@/components/TimeRangeFilterBar'

type StatType = 'artists' | 'tracks' | 'albums' | 'genres' | 'years' | 'dates' | 'times' | 'durations'

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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <TrendingUp className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_TYPOGRAPHY.heading.xl}>Statistics</h1>
        </div>

        {/* Unified Time Range Filter */}
        <TimeRangeFilterBar />
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
              <span className={VIKING_TYPOGRAPHY.label.inline}>
                {config.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ACTIVE TABLE */}
      <StatsTable type={activeTab} />
    </div>
  )
}

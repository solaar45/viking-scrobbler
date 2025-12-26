// frontend/src/components/StatsTable.tsx

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { VIKING_DESIGN, cn } from '@/lib/design-tokens'

type StatType = 'artists' | 'tracks' | 'albums' | 'genres' | 'years' | 'dates' | 'times' | 'durations'
type TimeRange = 'week' | 'month' | 'year' | 'all_time'

interface StatsTableProps {
  type: StatType
  timeRange: TimeRange
}

interface StatRow {
  rank: number
  [key: string]: any
}

export function StatsTable({ type, timeRange }: StatsTableProps) {
  const [data, setData] = useState<StatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    loadData()
  }, [type, timeRange, limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stats/top-${type}?range=${timeRange}&limit=${limit}`)
      const result = await response.json()
      setData(result.data || [])
    } catch (error) {
      console.error(`Failed to load ${type} stats`, error)
      // Mock data fallback
      const mockData = Array.from({ length: limit }, (_, i) => ({
        rank: i + 1,
        name: `${type} ${i + 1}`,
        plays: Math.floor(Math.random() * 500) + 50,
        percentage: parseFloat((Math.random() * 20).toFixed(1))
      }))
      setData(mockData)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = () => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h]).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `viking-stats-${type}-${timeRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className={VIKING_DESIGN.components.card}>
      <div className={VIKING_DESIGN.components.cardContent}>
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={VIKING_DESIGN.typography.title.card}>
              Top {type.charAt(0).toUpperCase() + type.slice(1)}
            </h2>
            <p className={VIKING_DESIGN.typography.helper}>
              Showing top {limit} results for {timeRange.replace('_', ' ')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Limit Selector */}
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium",
                VIKING_DESIGN.colors.card.elevated,
                VIKING_DESIGN.colors.text.secondary,
                "border border-viking-border-default",
                "focus:outline-none focus:ring-2 focus:ring-viking-purple",
                VIKING_DESIGN.effects.transition.base
              )}
            >
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>

            {/* Export Button */}
            <button
              onClick={exportCSV}
              disabled={loading || data.length === 0}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold",
                "bg-viking-purple hover:bg-viking-purple-dark",
                "text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                VIKING_DESIGN.effects.transition.base
              )}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <TableSkeleton />
        ) : data.length === 0 ? (
          <div className={cn("text-center py-12", VIKING_DESIGN.colors.text.tertiary)}>
            <p>No data available for this time range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={cn("border-b", "border-viking-border-default")}>
                  {getColumns(type).map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider",
                        VIKING_DESIGN.colors.text.tertiary
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-viking-border-default",
                      VIKING_DESIGN.effects.transition.base,
                      "hover:bg-viking-bg-elevated"
                    )}
                  >
                    {getColumns(type).map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-4",
                          VIKING_DESIGN.colors.text.primary
                        )}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== COLUMN DEFINITIONS =====

interface Column {
  key: string
  label: string
  render?: (row: any) => React.ReactNode
}

function getColumns(type: StatType): Column[] {
  const baseColumns: Column[] = [
    {
      key: 'rank',
      label: 'Rank',
      render: (row) => (
        <span className={cn("font-mono font-bold", VIKING_DESIGN.colors.text.secondary)}>
          #{row.rank}
        </span>
      )
    }
  ]

  const typeSpecificColumns: Record<StatType, Column[]> = {
    artists: [
      { key: 'name', label: 'Artist' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-[100px] h-2 bg-viking-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark"
                style={{ width: `${row.percentage}%` }}
              />
            </div>
            <span className="text-xs font-medium">{row.percentage}%</span>
          </div>
        )
      },
      { key: 'unique_tracks', label: 'Tracks' },
      { key: 'avg_per_day', label: 'Avg/Day' }
    ],
    tracks: [
      { key: 'track', label: 'Track' },
      { key: 'artist', label: 'Artist' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      },
      { key: 'last_played_relative', label: 'Last Played' }
    ],
    albums: [
      { key: 'album', label: 'Album' },
      { key: 'artist', label: 'Artist' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      },
      { 
        key: 'completion_rate', 
        label: 'Completion',
        render: (row) => `${row.completion_rate}%`
      }
    ],
    genres: [
      { key: 'genre', label: 'Genre' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'avg_duration', label: 'Avg Duration' },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      }
    ],
    years: [
      { 
        key: 'year', 
        label: 'Year',
        render: (row) => (
          <span className="font-bold">{row.year}</span>
        )
      },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'albums', label: 'Albums' },
      { key: 'top_album', label: 'Top Album' },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      }
    ],
    dates: [
      { key: 'date', label: 'Date' },
      { key: 'day_name', label: 'Day' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      }
    ],
    times: [
      { key: 'hour_range', label: 'Time' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'avg_per_day', label: 'Avg/Day' },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      }
    ],
    durations: [
      { key: 'duration_range', label: 'Duration' },
      { 
        key: 'plays', 
        label: 'Plays',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'tracks', label: 'Tracks' },
      { key: 'total_time', label: 'Total Time' },
      { 
        key: 'percentage', 
        label: '%',
        render: (row) => `${row.percentage}%`
      }
    ]
  }

  return [...baseColumns, ...typeSpecificColumns[type]]
}

// ===== SKELETON LOADER =====

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-16 rounded-lg",
            VIKING_DESIGN.colors.card.tertiary,
            VIKING_DESIGN.effects.loading.pulse
          )}
        />
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/design-tokens'

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
  const [displayCount, setDisplayCount] = useState(25)

  useEffect(() => {
    loadData()
    setDisplayCount(25)
  }, [type, timeRange, limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/stats/top-${type}?range=${timeRange}&limit=${limit}`)
      const result = await response.json()
      setData(result.data || [])
    } catch (error) {
      console.error(`Failed to load ${type} stats`, error)
      setData([])
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

  const visibleData = data.slice(0, displayCount)
  const hasMore = data.length > displayCount
  const remainingCount = data.length - displayCount

  // Helper: Percentage Bar Renderer
  const renderPercentageBar = (percentage: number): React.ReactNode => (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium min-w-[3.5rem] text-right font-mono">
        {percentage.toFixed(1)}%
      </span>
      <div className="flex-1 h-2 bg-viking-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )

  // Helper: Get Initial Letter
  const getInitial = (row: any): string => {
    const name = row.name || row.track || row.album || '?'
    return name[0]?.toUpperCase() || '?'
  }

  // Helper: Cover Image Renderer (NUR CSS, keine externen URLs!)
  const renderCover = (row: any): React.ReactNode => {
    // Nur CSS-Placeholder (kein externes Loading!)
    const initial = getInitial(row)
    const gradients = [
      'from-purple-500 to-purple-700',
      'from-blue-500 to-blue-700',
      'from-green-500 to-green-700',
      'from-amber-500 to-amber-700',
      'from-red-500 to-red-700',
      'from-pink-500 to-pink-700',
    ]
    const gradientIndex = initial.charCodeAt(0) % gradients.length
    
    return (
      <div className="flex items-center justify-center">
        <div 
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "font-bold text-white text-sm",
            "bg-gradient-to-br",
            gradients[gradientIndex],
            "border border-viking-border-default shadow-sm"
          )}
        >
          {initial}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">
            Top {type.charAt(0).toUpperCase() + type.slice(1)}
          </h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            {timeRange.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            Showing {visibleData.length} of {data.length}
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider",
              "bg-viking-bg-tertiary text-viking-text-secondary",
              "border border-viking-border-default",
              "focus:outline-none focus:ring-2 focus:ring-viking-purple",
              "transition-all"
            )}
          >
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>

          <button
            onClick={exportCSV}
            disabled={loading || data.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest",
              "bg-gradient-to-r from-viking-purple to-viking-purple-dark",
              "hover:from-viking-purple-dark hover:to-viking-purple",
              "text-white shadow-lg shadow-viking-purple/20",
              "hover:shadow-xl hover:shadow-viking-purple/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all"
            )}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="card-dense flex-1 min-h-[500px]">
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <TableSkeleton />
          ) : data.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-viking-text-tertiary text-center">
                No data available for this time range
              </p>
            </div>
          ) : (
            <>
              <table className="table-dense">
                <thead className="sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    {getColumns(type).map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "table-head-dense",
                          col.width,
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          col.key === getColumns(type)[0].key && 'pl-6',
                          col.key === getColumns(type)[getColumns(type).length - 1].key && 'pr-6'
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-viking-border-subtle">
                  {visibleData.map((row, i) => (
                    <tr key={i} className="table-row-dense">
                      {getColumns(type).map((col, idx) => (
                        <td
                          key={col.key}
                          className={cn(
                            "table-cell-dense",
                            col.width,
                            idx === 0 ? "table-cell-primary pl-6" : "table-cell-secondary",
                            idx === getColumns(type).length - 1 && "pr-6",
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                        >
                          {col.render ? col.render(row, renderPercentageBar, renderCover) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {hasMore && (
                <div className="sticky bottom-0 bg-gradient-to-t from-viking-bg-secondary via-viking-bg-secondary to-transparent pt-6 pb-4 flex justify-center border-t border-viking-border-subtle">
                  <button
                    onClick={() => setDisplayCount((prev) => prev + 25)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-3 rounded-lg",
                      "bg-gradient-to-r from-viking-purple to-viking-purple-dark",
                      "hover:from-viking-purple-dark hover:to-viking-purple",
                      "text-white text-xs font-bold uppercase tracking-widest",
                      "shadow-lg shadow-viking-purple/20",
                      "hover:shadow-xl hover:shadow-viking-purple/30",
                      "transition-all"
                    )}
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load 25 More ({remainingCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== COLUMN DEFINITIONS =====

interface Column {
  key: string
  label: string
  width?: string
  align?: 'left' | 'right' | 'center'
  render?: (
    row: any, 
    renderPercentageBar?: (p: number) => React.ReactNode,
    renderCover?: (row: any) => React.ReactNode
  ) => React.ReactNode
}

function getColumns(type: StatType): Column[] {
  const baseColumns: Column[] = [
    {
      key: 'rank',
      label: '#',
      width: 'w-[5%]',
      render: (row) => (
        <span className="font-mono font-bold text-viking-text-tertiary">
          {row.rank}
        </span>
      )
    }
  ]

  const typeSpecificColumns: Record<StatType, Column[]> = {
    artists: [
      { 
        key: 'cover', 
        label: '', 
        width: 'w-[5%]', 
        align: 'center',
        render: (_row, _renderPercentageBar, renderCover) => renderCover!(_row)
      },
      { 
        key: 'artist', 
        label: 'Artist', 
        width: 'w-[18%]', 
        render: (row) => row.name 
      },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[10%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[22%]',
        render: (row, renderPercentageBar) => renderPercentageBar!(row.percentage)
      },
      { key: 'unique_tracks', label: 'Tracks', width: 'w-[10%]', align: 'right' },
      { key: 'avg_per_day', label: 'Avg/Day', width: 'w-[10%]', align: 'right' },
      { key: 'last_played_relative', label: 'Last Played', width: 'w-[15%]', align: 'right' }
    ],
    tracks: [
      { 
        key: 'cover', 
        label: '', 
        width: 'w-[5%]', 
        align: 'center',
        render: (_row, _renderPercentageBar, renderCover) => renderCover!(_row)
      },
      { key: 'track', label: 'Track', width: 'w-[18%]' },
      { key: 'artist', label: 'Artist', width: 'w-[15%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[10%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[22%]',
        render: (row, renderPercentageBar) => renderPercentageBar!(row.percentage)
      },
      { key: 'last_played_relative', label: 'Last Played', width: 'w-[15%]', align: 'right' }
    ],
    albums: [
      { 
        key: 'cover', 
        label: '', 
        width: 'w-[5%]', 
        align: 'center',
        render: (_row, _renderPercentageBar, renderCover) => renderCover!(_row)
      },
      { key: 'album', label: 'Album', width: 'w-[18%]' },
      { key: 'artist', label: 'Artist', width: 'w-[13%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[10%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[18%]',
        render: (row, renderPercentageBar) => renderPercentageBar!(row.percentage)
      },
      { 
        key: 'completion_rate', 
        label: 'Completion',
        width: 'w-[10%]',
        align: 'right',
        render: (row) => `${row.completion_rate}%`
      },
      { key: 'last_played_relative', label: 'Last Played', width: 'w-[13%]', align: 'right' }
    ],
    genres: [
      { key: 'genre', label: 'Genre', width: 'w-[18%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[12%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'avg_duration', label: 'Avg Duration', width: 'w-[12%]', align: 'right' },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[23%]',
        render: (row, renderPercentageBar) => renderPercentageBar!(row.percentage)
      },
      { key: 'artists', label: 'Artists', width: 'w-[12%]', align: 'right' },
      { key: 'last_played_relative', label: 'Last Played', width: 'w-[18%]', align: 'right' }
    ],
    years: [
      { 
        key: 'year', 
        label: 'Year',
        width: 'w-[10%]',
        render: (row) => <span className="font-bold">{row.year}</span>
      },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[10%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'albums', label: 'Albums', width: 'w-[10%]', align: 'right' },
      { key: 'top_album', label: 'Top Album', width: 'w-[28%]' },
      { key: 'artists', label: 'Artists', width: 'w-[10%]', align: 'right' },
      { key: 'last_played_relative', label: 'Last Played', width: 'w-[17%]', align: 'right' }
    ],
    dates: [
      { key: 'date', label: 'Date', width: 'w-[20%]' },
      { key: 'day_name', label: 'Day', width: 'w-[15%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[15%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[35%]',
        align: 'right',
        render: (row) => `${row.percentage.toFixed(1)}%`
      },
      { key: 'day', label: 'Day #', width: 'w-[15%]', align: 'right' }
    ],
    times: [
      { key: 'hour_range', label: 'Time', width: 'w-[20%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[15%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'avg_per_day', label: 'Avg/Day', width: 'w-[20%]', align: 'right' },
      { 
        key: 'percentage', 
        label: '%',
        width: 'w-[30%]',
        align: 'right',
        render: (row) => `${row.percentage.toFixed(1)}%`
      },
      { key: 'hour', label: 'Hour', width: 'w-[15%]', align: 'right' }
    ],
    durations: [
      { key: 'duration_range', label: 'Duration', width: 'w-[25%]' },
      { 
        key: 'plays', 
        label: 'Plays',
        width: 'w-[15%]',
        align: 'right',
        render: (row) => (
          <span className="font-mono font-semibold">
            {row.plays.toLocaleString()}
          </span>
        )
      },
      { key: 'tracks', label: 'Tracks', width: 'w-[15%]', align: 'right' },
      { key: 'total_time', label: 'Total Time', width: 'w-[30%]', align: 'right' },
      { key: 'avg_duration', label: 'Avg', width: 'w-[15%]', align: 'right' }
    ]
  }

  return [...baseColumns, ...typeSpecificColumns[type]]
}

// ===== SKELETON LOADER =====

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg bg-viking-bg-tertiary animate-pulse"
        />
      ))}
    </div>
  )
}

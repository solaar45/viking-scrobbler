import { TrendingUp, TrendingDown } from "lucide-react"
import { PeriodStats } from "./types"

type TrendInfo = {
  value?: number
  label: string
}

type MetricSegmentProps = {
  label: string
  value?: number
  valueStr?: string | null
  unit?: string
  loading?: boolean
  trend?: TrendInfo
  cornerValue?: number  // ⬅️ NEU: Wert für rechts unten
}

function MetricSegment({
  label,
  value,
  valueStr,
  unit,
  loading,
  trend,
  cornerValue,
}: MetricSegmentProps) {
  const displayValue =
    valueStr ?? (typeof value === "number" ? value.toLocaleString() : "0")

  const trendValue = trend?.value
  const trendLabel = trend?.label ?? "last period"
  const trendPositive = trendValue !== undefined && trendValue > 0
  const trendNegative = trendValue !== undefined && trendValue < 0

  return (
    <div className="bg-viking-bg-secondary hover:bg-viking-bg-tertiary/50 rounded-lg px-5 py-4 min-h-[110px] transition-colors duration-200 cursor-default border border-viking-border-subtle/50 relative">
      {/* Zeile 1: Titel */}
      <div className="text-lg text-viking-text-secondary mb-3">{label}</div>

      {/* Zeile 2: Wert */}
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className="font-mono text-4xl font-semibold text-white leading-none">
          {loading ? "..." : displayValue}
        </span>
        {unit && (
          <span className="font-mono text-base font-semibold text-viking-text-tertiary">
            {unit}
          </span>
        )}
      </div>

      {/* Zeile 3: Trend ODER Total */}
      {trendValue !== undefined ? (
        <div className="flex items-center gap-1.5 text-[11px]">
          {trendPositive && (
            <TrendingUp className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />
          )}
          {trendNegative && (
            <TrendingDown className="w-3 h-3 text-red-500" strokeWidth={2.5} />
          )}
          <span
            className={`font-semibold ${
              trendPositive
                ? "text-emerald-500"
                : trendNegative
                ? "text-red-500"
                : "text-viking-text-tertiary"
            }`}
          >
            {trendPositive ? "+" : ""}
            {trendValue.toFixed(1)}%
          </span>
          <span className="text-viking-text-tertiary">from {trendLabel}</span>
        </div>
      ) : cornerValue !== undefined ? (
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-viking-text-tertiary">Total:</span>
          <span className="font-semibold text-viking-text-tertiary">
            {cornerValue.toLocaleString()}
          </span>
        </div>
      ) : null}
    </div>
  )
}

interface OverviewProps {
  filtered?: PeriodStats
  lifetime?: PeriodStats
  loading: boolean
  period: string
  periods: Array<{ id: string; label: string; days: number | null }>
  isConnected: boolean
  onPeriodChange: (period: string) => void
  onRefresh: () => void
}

function formatDate(iso: string) {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)

  const formats = getDateTimeFormats()
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const year2 = String(year).slice(-2)
  const monthName = d.toLocaleString("en", { month: "short" })

  return formats.dateFormat
    .replace("MMM", monthName)
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", String(year))
    .replace("YY", year2)
}

interface DateTimeFormats {
  dateFormat: string
  timeFormat: string
}

function getDateTimeFormats(): DateTimeFormats {
  const saved = localStorage.getItem("datetime_formats")
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // Fallback
    }
  }
  return {
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm",
  }
}

function getTrendLabel(period: string): string {
  switch (period) {
    case "week":
      return "last week"
    case "month":
      return "last month"
    case "year":
      return "last year"
    case "all_time":
      return "lifetime"
    default:
      return "last period"
  }
}

function calculateTrend(current?: number, lifetime?: number): number | undefined {
  if (current === undefined || lifetime === undefined || lifetime === 0) {
    return undefined
  }
  const diff = current - lifetime
  return (diff / lifetime) * 100
}

export default function Overview({
  filtered,
  lifetime,
  loading,
  period,
  periods,
  isConnected,
  onPeriodChange,
}: OverviewProps) {

  // ⬇️ DEBUG-LOG 
  console.log('🔍 Overview received filtered:', {
    mostActiveDay: filtered?.mostActiveDay,
    tracksOnMostActiveDay: filtered?.tracksOnMostActiveDay,
    peakDay: filtered?.peakDay,
    peakValue: filtered?.peakValue
  })

  const trendLabel = getTrendLabel(period)

  const rawBestDay = filtered?.peakDay
  const formattedBestDay =
    rawBestDay && rawBestDay !== "" ? formatDate(rawBestDay) : rawBestDay ?? null

  const trends = {
    plays: calculateTrend(filtered?.totalScrobbles, lifetime?.totalScrobbles),
    artists: calculateTrend(filtered?.uniqueArtists, lifetime?.uniqueArtists),
    songs: calculateTrend(filtered?.uniqueTracks, lifetime?.uniqueTracks),
    albums: calculateTrend(filtered?.uniqueAlbums, lifetime?.uniqueAlbums),
    avgPerDay: calculateTrend(filtered?.avgPerDay, lifetime?.avgPerDay),
    streak: calculateTrend(filtered?.currentStreak, lifetime?.currentStreak),
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HEADER (freischwebend) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="card-title-dense">Overview</span>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            {periods.find((item) => item.id === period)?.label}
          </span>
          {isConnected && (
            <div className="badge-live">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest">LIVE</span>
            </div>
          )}
        </div>

        {/* Period Filter */}
        <div className="flex gap-1 bg-viking-bg-tertiary p-1.5 rounded-lg border border-viking-border-default">
          {periods.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onPeriodChange(id)}
              className={`text-xs font-semibold px-4 py-2 rounded-md transition-all uppercase tracking-wide whitespace-nowrap ${period === id
                ? "bg-gradient-to-r from-viking-purple to-viking-purple-dark text-white shadow-lg shadow-viking-purple/20"
                : "text-viking-text-tertiary hover:text-viking-text-secondary hover:bg-viking-bg-elevated"
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 8×1 METRICS GRID – freischwebend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
        <MetricSegment
          label="Plays"
          value={filtered?.totalScrobbles}
          loading={loading}
          trend={
            trends.plays !== undefined
              ? { value: trends.plays, label: trendLabel }
              : undefined
          }
        />
        <MetricSegment
          label="Artists"
          value={filtered?.uniqueArtists}
          loading={loading}
          trend={
            trends.artists !== undefined
              ? { value: trends.artists, label: trendLabel }
              : undefined
          }
        />
        <MetricSegment
          label="Songs"
          value={filtered?.uniqueTracks}
          loading={loading}
          trend={
            trends.songs !== undefined
              ? { value: trends.songs, label: trendLabel }
              : undefined
          }
        />
        <MetricSegment
          label="Albums"
          value={filtered?.uniqueAlbums}
          loading={loading}
          trend={
            trends.albums !== undefined
              ? { value: trends.albums, label: trendLabel }
              : undefined
          }
        />
        <MetricSegment
          label="Daily Avg"
          value={filtered?.avgPerDay}
          unit={filtered?.avgPerDay === 1 ? "song" : "songs"}
          loading={loading}
          trend={
            trends.avgPerDay !== undefined
              ? { value: trends.avgPerDay, label: trendLabel }
              : undefined
          }
        />
        <MetricSegment
          label="Weekday With Most Plays"
          valueStr={filtered?.mostActiveDay}
          loading={loading}
          cornerValue={filtered?.tracksOnMostActiveDay}  // ⬅️ NEU
        />
        <MetricSegment
          label="Date With Most Plays"
          valueStr={formattedBestDay}
          loading={loading}
          cornerValue={filtered?.peakValue}  // ⬅️ NEU
        />
        <MetricSegment
          label="Streak"
          value={filtered?.currentStreak}
          unit={filtered?.currentStreak === 1 ? "day" : "days"}
          loading={loading}
          trend={
            trends.streak !== undefined
              ? { value: trends.streak, label: trendLabel }
              : undefined
          }
        />

      </div>
    </div>
  )
}

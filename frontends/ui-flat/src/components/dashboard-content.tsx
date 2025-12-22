"use client"

import { useEffect, useState } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TrendingUp, Activity, RefreshCw } from "lucide-react"

// --- TYPES ---
export interface PeriodStats {
  totalScrobbles: number
  uniqueArtists: number
  uniqueTracks: number
  uniqueAlbums: number
  mostActiveDay: string | null
  tracksOnMostActiveDay: number
  avgPerDay: number
  peakDay: string | null
  peakValue: number
  currentStreak: number
}

export interface RecentListen {
  id: string
  track: string
  artist: string
  playedAt: string
  duration: number
}

export interface DashboardStats {
  filtered: PeriodStats
  lifetime: PeriodStats
  recent: RecentListen[]
}

const PERIODS = [
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "365d", label: "Last Year" },
  { id: "all", label: "All Time" },
]

export default function DashboardContent() {
  const [period, setPeriod] = useState<string>("all")
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)

  // Initial Data Fetch + Refetch bei Period-Wechsel
  useEffect(() => {
    fetchStats()
  }, [period])

  async function fetchStats() {
    setLoading(true)
    try {
      // Simulierter API Call – später durch echte API mit period ersetzen
      await new Promise((r) => setTimeout(r, 600))

      const mockData: DashboardStats = {
        filtered: {
          totalScrobbles: 1240,
          uniqueArtists: 45,
          uniqueTracks: 80,
          uniqueAlbums: 30,
          mostActiveDay: "Friday",
          tracksOnMostActiveDay: 25,
          avgPerDay: 15,
          peakDay: "01.12",
          peakValue: 40,
          currentStreak: 5,
        },
        lifetime: {
          totalScrobbles: 15430,
          uniqueArtists: 1240,
          uniqueTracks: 8400,
          uniqueAlbums: 3400,
          mostActiveDay: "Saturday",
          tracksOnMostActiveDay: 145,
          avgPerDay: 12,
          peakDay: "10.05",
          peakValue: 180,
          currentStreak: 45,
        },
        recent: [],
      }
      setData(mockData)
    } catch (e) {
      console.error("Failed to load stats", e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = data?.filtered
  const lifetime = data?.lifetime
  const recent = data?.recent ?? []

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8 w-full font-sans text-sm">
        {/* METRIK-CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* HEADER: CLASSIC FILTER BUTTONS */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 h-20">
            <div className="flex items-center gap-3">
              <span className="text-base font-black uppercase tracking-widest text-gray-900">
                Overview
              </span>
              <span className="text-gray-200 text-xl font-light">|</span>
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {PERIODS.find((item) => item.id === period)?.label}
              </span>
            </div>

            {/* Period Selector (Button Group) */}
            <div className="flex gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
              {PERIODS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setPeriod(id)}
                  className={`text-xs font-bold px-4 py-2 rounded-md transition-all uppercase tracking-wide whitespace-nowrap ${
                    period === id
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-gray-400 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 border-b border-gray-100 bg-white">
            <MetricSegment
              label="Scrobbles"
              value={filtered?.totalScrobbles}
              trend="+12%"
              context="Total"
              contextValue={lifetime?.totalScrobbles}
              loading={loading}
            />
            <MetricSegment
              label="Artists"
              value={filtered?.uniqueArtists}
              context="Total"
              contextValue={lifetime?.uniqueArtists}
              loading={loading}
            />
            <MetricSegment
              label="Tracks"
              value={filtered?.uniqueTracks}
              context="Total"
              contextValue={lifetime?.uniqueTracks}
              loading={loading}
            />
            <MetricSegment
              label="Albums"
              value={filtered?.uniqueAlbums}
              context="Total"
              contextValue={lifetime?.uniqueAlbums}
              loading={loading}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 bg-white">
            <MetricSegment
              label="Avg / Day"
              value={filtered?.avgPerDay}
              unit="t"
              context="Life Avg"
              contextValue={lifetime?.avgPerDay}
              loading={loading}
            />
            <MetricSegment
              label="Most Active"
              valueStr={filtered?.mostActiveDay}
              context="Life Active"
              contextStr={lifetime?.mostActiveDay}
              loading={loading}
              smallValue
            />
            <MetricSegment
              label="Peak Day"
              valueStr={filtered?.peakDay}
              context="Max"
              contextValue={lifetime?.peakValue}
              loading={loading}
              smallValue
            />
            <MetricSegment
              label="Streak"
              value={filtered?.currentStreak}
              unit="d"
              trend="🔥"
              context="Longest"
              contextValue={lifetime?.currentStreak}
              loading={loading}
            />
          </div>
        </div>

        {/* RECENT LISTENS */}
        <div className="bg-white border border-gray-200 rounded-xl flex-1 flex flex-col min-h-[500px] shadow-sm overflow-hidden relative">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between h-16 bg-white z-20 relative">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black uppercase tracking-widest text-gray-900">
                Recent Listens
              </h3>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-bold tracking-widest">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white relative">
            {recent.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 pb-10">
                <Activity className="w-24 h-24 text-gray-200" strokeWidth={1} />
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                    No Signal
                  </h3>
                  <p className="text-gray-400 font-medium">
                    Listening activity will appear here.
                  </p>
                </div>
                <button
                  onClick={() => fetchStats()}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl mt-4"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Stream
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur text-gray-500 font-bold uppercase tracking-wider text-[11px] h-10 border-b border-gray-100">
                  <tr>
                    <th className="pl-6 w-[40%]">Track</th>
                    <th className="w-[30%]">Artist</th>
                    <th className="text-right w-[15%]">Time</th>
                    <th className="text-right pr-6 w-[15%]">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((item) => (
                    <tr
                      key={item.id}
                      className="h-12 hover:bg-gray-50 group transition-colors"
                    >
                      <td className="pl-6 font-bold text-slate-800 group-hover:text-black truncate max-w-[200px] text-sm">
                        {item.track}
                      </td>
                      <td className="text-gray-600 font-medium truncate max-w-[150px] text-xs">
                        {item.artist}
                      </td>
                      <td className="text-right text-gray-400 font-mono text-xs font-semibold">
                        {formatTime(item.playedAt)}
                      </td>
                      <td className="pr-6 text-right text-gray-400 font-mono text-xs font-semibold">
                        {formatDuration(item.duration)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// --- MetricSegment Helper ---
type MetricSegmentProps = {
  label: string
  value?: number
  valueStr?: string | null
  unit?: string
  trend?: string
  context: string
  contextValue?: number
  contextStr?: string | null
  loading?: boolean
  smallValue?: boolean
}

function MetricSegment({
  label,
  value,
  valueStr,
  unit,
  trend,
  context,
  contextValue,
  contextStr,
  loading,
  smallValue,
}: MetricSegmentProps) {
  const displayValue =
    valueStr ?? (typeof value === "number" ? value.toLocaleString() : "0")
  const displayContext =
    contextStr ??
    (typeof contextValue === "number" ? contextValue.toLocaleString() : "0")
  return (
    <div className="h-40 px-6 py-5 flex flex-col justify-between hover:bg-gray-50 transition-colors duration-200 group cursor-default relative">
      <div className="flex items-center justify-between h-6">
        <div className="text-sm font-bold uppercase tracking-widest text-gray-400 group-hover:text-slate-800 transition-colors">
          {label}
        </div>
        {trend && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={3} />
            {trend}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-auto mb-auto">
        <span
          className={`font-mono font-extrabold text-slate-900 leading-none tracking-tighter ${
            smallValue ? "text-4xl" : "text-5xl xl:text-6xl"
          }`}
        >
          {loading ? "..." : displayValue}
        </span>
        {unit && (
          <span className="text-lg font-bold text-gray-400 self-end mb-1.5 ml-1">
            {unit}
          </span>
        )}
      </div>
      <div className="h-6 flex items-end border-t border-transparent pt-3 mt-1 group-hover:border-gray-200 transition-colors">
        <span className="text-gray-400 font-semibold flex items-center gap-2 leading-none text-sm w-full justify-between">
          <span className="uppercase text-[11px] tracking-wider text-gray-400">
            {context}
          </span>
          <span className="font-mono font-bold text-gray-500 group-hover:text-black">
            {loading ? "-" : displayContext}
          </span>
        </span>
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  if (!iso) return "-"
  return new Date(iso).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(sec: number) {
  if (!sec) return "0:00"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

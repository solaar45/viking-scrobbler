"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TrendingUp, Activity, RefreshCw, ChevronDown, Radio } from "lucide-react"

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
  album: string
  playedAt: string
  duration: number
}

export interface DashboardStats {
  filtered: PeriodStats
  lifetime: PeriodStats
  recent: RecentListen[]
}

const PERIODS = [
  { id: "week", label: "Last 7 Days", days: 7 },
  { id: "month", label: "Last 30 Days", days: 30 },
  { id: "year", label: "Last Year", days: 365 },
  { id: "all_time", label: "All Time", days: null },
]

export default function DashboardContent() {
  const [period, setPeriod] = useState<string>("all_time")
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState<string>("viking_user")
  const [displayCount, setDisplayCount] = useState(25)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  // Initial Data Fetch + Refetch bei Period-Wechsel
  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
    fetchStats()
    setDisplayCount(25)
  }, [period])

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/socket/websocket`

    console.log("Connecting to WebSocket:", wsUrl)
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log("✅ WebSocket connected")
      setIsConnected(true)

      // Join scrobbles channel
      const joinMessage = JSON.stringify({
        topic: `scrobbles:${username}`,
        event: "phx_join",
        payload: {},
        ref: Date.now().toString(),
      })
      console.log("Joining channel:", joinMessage)
      socket.send(joinMessage)
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log("📨 WebSocket message:", message)
      
      // Handle new scrobble event
      if (message.event === "new_scrobble") {
        console.log("🎵 New scrobble detected!", message.payload)
        // Refresh all data when new scrobble arrives
        fetchStatsComplete()
      }
    }

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
      setIsConnected(false)
    }

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected")
      setIsConnected(false)
    }

    socketRef.current = socket

    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket")
        socketRef.current.close()
      }
    }
  }, [username])

  // Vollständiger Stats-Fetch (ALLES neu laden)
  async function fetchStatsComplete() {
    console.log("🔄 Fetching complete stats...")
    try {
      // Stats für gewählten Zeitraum laden
      const statsResponse = await fetch(
        `/1/stats/user/${username}/totals?range=${period}`
      )
      const statsJson = await statsResponse.json()
      const totals = statsJson.payload || {}

      // Lifetime Stats laden (immer all_time)
      const lifetimeResponse = await fetch(
        `/1/stats/user/${username}/totals?range=all_time`
      )
      const lifetimeJson = await lifetimeResponse.json()
      const lifetimeTotals = lifetimeJson.payload || {}

      // Recent Listens laden
      const recentResponse = await fetch(`/1/user/${username}/recent-listens?count=500`)
      const recentJson = await recentResponse.json()
      const recentListens = (recentJson.payload?.listens || []).map((listen: any) => ({
        id: listen.listened_at?.toString() || Math.random().toString(),
        track: listen.track_name || "Unknown Track",
        artist: listen.artist_name || "Unknown Artist",
        album: listen.release_name || "Unknown Album",
        playedAt: listen.listened_at
          ? new Date(listen.listened_at * 1000).toISOString()
          : new Date().toISOString(),
        duration: Math.floor((listen.additional_info?.duration_ms || 0) / 1000),
      }))

      const dashboardData: DashboardStats = {
        filtered: {
          totalScrobbles: totals.total_listens || 0,
          uniqueArtists: totals.unique_artists || 0,
          uniqueTracks: totals.unique_tracks || 0,
          uniqueAlbums: totals.unique_albums || 0,
          mostActiveDay: totals.most_active_day || null,
          tracksOnMostActiveDay: totals.tracks_on_most_active_day || 0,
          avgPerDay: totals.avg_per_day || 0,
          peakDay: totals.peak_day || null,
          peakValue: totals.peak_value || 0,
          currentStreak: totals.current_streak || 0,
        },
        lifetime: {
          totalScrobbles: lifetimeTotals.total_listens || 0,
          uniqueArtists: lifetimeTotals.unique_artists || 0,
          uniqueTracks: lifetimeTotals.unique_tracks || 0,
          uniqueAlbums: lifetimeTotals.unique_albums || 0,
          mostActiveDay: lifetimeTotals.most_active_day || null,
          tracksOnMostActiveDay: lifetimeTotals.tracks_on_most_active_day || 0,
          avgPerDay: lifetimeTotals.avg_per_day || 0,
          peakDay: lifetimeTotals.peak_day || null,
          peakValue: lifetimeTotals.peak_value || 0,
          currentStreak: lifetimeTotals.current_streak || 0,
        },
        recent: recentListens,
      }

      setData(dashboardData)
      console.log("✅ Stats updated")
    } catch (e) {
      console.error("Failed to load stats", e)
    }
  }

  // Initial Fetch mit Loading State
  async function fetchStats() {
    setLoading(true)
    await fetchStatsComplete()
    setLoading(false)
  }

  const filtered = data?.filtered
  const lifetime = data?.lifetime
  const allRecent = data?.recent ?? []

  // Filtere Recent Listens basierend auf globalem Period-Filter
  const filteredRecent = useMemo(() => {
    if (period === "all_time") return allRecent

    const selectedPeriod = PERIODS.find((p) => p.id === period)
    if (!selectedPeriod?.days) return allRecent

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod.days)
    const cutoffTimestamp = cutoffDate.getTime()

    return allRecent.filter((listen) => {
      const listenDate = new Date(listen.playedAt).getTime()
      return listenDate >= cutoffTimestamp
    })
  }, [allRecent, period])

  // Zeige nur die ersten X Listens
  const visibleRecent = filteredRecent.slice(0, displayCount)
  const hasMore = filteredRecent.length > displayCount
  const remainingCount = filteredRecent.length - displayCount

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
              {/* WebSocket Status */}
              {isConnected && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span className="text-[9px] font-bold tracking-widest">REALTIME</span>
                </div>
              )}
            </div>

            {/* Period Selector (Button Group) - GLOBAL FILTER */}
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
                <span className="text-[10px] font-bold tracking-widest">LIVE</span>
              </div>
            </div>

            {/* Filtered Count Display (OHNE Updated Timestamp) */}
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Showing {visibleRecent.length} of {filteredRecent.length} tracks
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-white relative">
            {filteredRecent.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 pb-10">
                <Activity className="w-24 h-24 text-gray-200" strokeWidth={1} />
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                    No Signal
                  </h3>
                  <p className="text-gray-400 font-medium">
                    {period === "all_time"
                      ? "Listening activity will appear here."
                      : `No listens found in ${PERIODS.find((p) => p.id === period)?.label.toLowerCase()}.`}
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
              <>
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur text-gray-500 font-bold uppercase tracking-wider text-[11px] h-10 border-b border-gray-100">
                    <tr>
                      <th className="pl-6 w-[28%]">Track</th>
                      <th className="w-[20%]">Artist</th>
                      <th className="w-[20%]">Album</th>
                      <th className="text-right w-[12%]">Date</th>
                      <th className="text-right w-[10%]">Time</th>
                      <th className="text-right pr-6 w-[10%]">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleRecent.map((item) => (
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
                        <td className="text-gray-500 font-medium truncate max-w-[150px] text-xs">
                          {item.album}
                        </td>
                        <td className="text-right text-gray-400 font-mono text-xs font-semibold">
                          {formatDate(item.playedAt)}
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

                {/* LOAD MORE BUTTON */}
                {hasMore && (
                  <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-6 flex justify-center border-t border-gray-100">
                    <button
                      onClick={() => setDisplayCount((prev) => prev + 25)}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
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

function formatDate(iso: string) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
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

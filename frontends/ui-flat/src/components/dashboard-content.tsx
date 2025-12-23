"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TrendingUp, Activity, RefreshCw, ChevronDown} from "lucide-react"
import { DashboardSkeleton } from "./DashboardSkeleton"

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
  device?: string      // 🆕 music_service
  genres?: string      // 🆕 Genre-String
}

export interface DashboardStats {
  filtered: PeriodStats
  lifetime: PeriodStats
  recent: RecentListen[]
}

interface DateTimeFormats {
  dateFormat: string
  timeFormat: string
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
      
      if (message.event === "new_scrobble") {
        console.log("🎵 New scrobble detected!", message.payload)
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

    // 🎯 Listen for datetime format changes
    const handleFormatChange = () => {
      console.log("📅 DateTime format changed, forcing re-render")
      setData((prev) => prev ? { ...prev } : null)
    }

    window.addEventListener('datetime-format-changed', handleFormatChange)

    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket")
        socketRef.current.close()
      }
      window.removeEventListener('datetime-format-changed', handleFormatChange)
    }
  }, [username])

  // Vollständiger Stats-Fetch
  async function fetchStatsComplete() {
    console.log("🔄 Fetching complete stats...")
    try {
      const statsResponse = await fetch(
        `/1/stats/user/${username}/totals?range=${period}`
      )
      const statsJson = await statsResponse.json()
      const totals = statsJson.payload || {}

      const lifetimeResponse = await fetch(
        `/1/stats/user/${username}/totals?range=all_time`
      )
      const lifetimeJson = await lifetimeResponse.json()
      const lifetimeTotals = lifetimeJson.payload || {}

      const recentResponse = await fetch(`/1/user/${username}/recent-listens?count=500`)
      const recentJson = await recentResponse.json()
      
      // 🆕 KORRIGIERTES MAPPING
      const recentListens = (recentJson.payload?.listens || []).map((listen: any) => ({
        id: listen.listened_at?.toString() || Math.random().toString(),
        track: listen.track_name || "Unknown Track",
        artist: listen.artist_name || "Unknown Artist",
        album: listen.release_name || "Unknown Album",
        playedAt: listen.listened_at
          ? new Date(listen.listened_at * 1000).toISOString()
          : new Date().toISOString(),
        duration: Math.floor((listen.additional_info?.duration_ms || 0) / 1000),
        
        // ✅ Device = music_service aus Spalte
        device: listen.additional_info?.music_service || "-",
        
        // ✅ Genre = fertiger String aus Backend
        genres: listen.additional_info?.genres || "–",
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

  async function fetchStats() {
    setLoading(true)
    await fetchStatsComplete()
    setLoading(false)
  }

  const filtered = data?.filtered
  const lifetime = data?.lifetime
  const allRecent = data?.recent ?? []

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

  const visibleRecent = filteredRecent.slice(0, displayCount)
  const hasMore = filteredRecent.length > displayCount
  const remainingCount = filteredRecent.length - displayCount

  return (
    <TooltipProvider>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
          {/* STATS CARD */}
          <div className="card-dense">
            {/* HEADER */}
            <div className="card-header-dense">
              <div className="flex items-center gap-3">
                <span className="card-title-dense">Overview</span>
                <span className="text-viking-border-emphasis text-xl font-light">|</span>
                <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
                  {PERIODS.find((item) => item.id === period)?.label}
                </span>
                {/* Live Badge */}
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
                {PERIODS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setPeriod(id)}
                    className={`text-xs font-semibold px-4 py-2 rounded-md transition-all uppercase tracking-wide whitespace-nowrap ${
                      period === id
                        ? "bg-gradient-to-r from-viking-purple to-viking-purple-dark text-white shadow-lg shadow-viking-purple/20"
                        : "text-viking-text-tertiary hover:text-viking-text-secondary hover:bg-viking-bg-elevated"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-viking-border-subtle">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-viking-border-subtle border-t border-viking-border-subtle">
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

          {/* RECENT LISTENS TABLE */}
          <div className="card-dense flex-1 min-h-[500px]">
            <div className="card-header-dense">
              <div className="flex items-center gap-3">
                <h3 className="card-title-dense">Recent Listens</h3>
                <div className="badge-live">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold tracking-widest">LIVE</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
                Showing {visibleRecent.length} of {filteredRecent.length} tracks
              </div>
            </div>

            <div className="flex-1 overflow-auto relative">
              {filteredRecent.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <Activity className="w-20 h-20 text-viking-border-emphasis" strokeWidth={1.5} />
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-viking-text-primary uppercase tracking-tight">
                      No Signal
                    </h3>
                    <p className="text-viking-text-secondary font-medium text-sm">
                      {period === "all_time"
                        ? "Listening activity will appear here."
                        : `No listens found in ${PERIODS.find((p) => p.id === period)?.label.toLowerCase()}.`}
                    </p>
                  </div>
                  <button
                    onClick={() => fetchStats()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Stream
                  </button>
                </div>
              ) : (
                <>
                  <table className="table-dense">
                    <thead className="sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        <th className="table-head-dense pl-6 text-left w-[22%]">Track</th>
                        <th className="table-head-dense text-left w-[14%]">Artist</th>
                        <th className="table-head-dense text-left w-[14%]">Album</th>
                        <th className="table-head-dense text-left w-[10%]">Device</th>
                        <th className="table-head-dense text-left w-[12%]">Genre</th>
                        <th className="table-head-dense text-right w-[10%]">Date</th>
                        <th className="table-head-dense text-right w-[9%]">Time</th>
                        <th className="table-head-dense text-right pr-6 w-[8%]">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-viking-border-subtle">
                      {visibleRecent.map((item) => (
                        <tr key={item.id} className="table-row-dense">
                          <td className="table-cell-dense table-cell-primary pl-6 truncate max-w-[200px]">
                            {item.track}
                          </td>
                          <td className="table-cell-dense table-cell-secondary truncate max-w-[150px]">
                            {item.artist}
                          </td>
                          <td className="table-cell-dense table-cell-secondary truncate max-w-[150px]">
                            {item.album}
                          </td>
                          <td className="table-cell-dense table-cell-secondary truncate max-w-[120px]">
                            {formatDevice(item.device)}
                          </td>
                          {/* 🆕 GENRE SPALTE */}
                          <td className="table-cell-dense table-cell-secondary truncate max-w-[140px] font-medium text-emerald-400">
                            {item.genres}
                          </td>
                          <td className="table-cell-dense table-cell-secondary text-right truncate max-w-[150px]">
                            {formatDate(item.playedAt)}
                          </td>
                          <td className="table-cell-dense table-cell-secondary text-right truncate max-w-[150px]">
                            {formatTime(item.playedAt)}
                          </td>
                          <td className="table-cell-dense table-cell-secondary text-right pr-6 truncate max-w-[150px]">
                            {formatDuration(item.duration)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* LOAD MORE */}
                  {hasMore && (
                    <div className="sticky bottom-0 bg-gradient-to-t from-viking-bg-secondary via-viking-bg-secondary to-transparent pt-6 pb-4 flex justify-center border-t border-viking-border-subtle">
                      <button
                        onClick={() => setDisplayCount((prev) => prev + 25)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30"
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
      )}
    </TooltipProvider>
  )
}

// --- MetricSegment ---
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
    <div className="h-36 px-5 py-4 flex flex-col justify-between hover:bg-viking-bg-tertiary/30 transition-colors duration-200 group cursor-default">
      <div className="flex items-center justify-between h-5">
        <div className="metric-label">
          {label}
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-bold text-viking-pink bg-viking-pink/10 px-2 py-0.5 rounded border border-viking-pink/30">
            <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
            {trend}
          </span>
        )}
      </div>
      
      <div className="flex items-baseline gap-1 my-auto">
        <span className={`metric-value ${smallValue ? "text-4xl" : ""}`}>
          {loading ? "..." : displayValue}
        </span>
        {unit && (
          <span className="text-base font-semibold text-viking-text-tertiary self-end mb-1 ml-0.5">
            {unit}
          </span>
        )}
      </div>
      
      <div className="metric-sub justify-between border-t border-transparent group-hover:border-viking-border-subtle pt-2 transition-colors">
        <span className="uppercase text-[10px] tracking-wider text-viking-text-tertiary">
          {context}
        </span>
        <span className="font-mono font-semibold metric-label-accent">
          {loading ? "-" : displayContext}
        </span>
      </div>
    </div>
  )
}

// --- FORMAT HELPERS WITH CUSTOM FORMATS ---
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
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm'
  }
}

function formatDate(iso: string) {
  if (!iso) return "-"
  
  const formats = getDateTimeFormats()
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const year2 = String(year).slice(-2)
  const monthName = d.toLocaleString('en', { month: 'short' })

  return formats.dateFormat
    .replace('MMM', monthName)
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', String(year))
    .replace('YY', year2)
}

function formatTime(iso: string) {
  if (!iso) return "-"
  
  const formats = getDateTimeFormats()
  const d = new Date(iso)
  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const ampm = hours24 >= 12 ? 'PM' : 'AM'

  return formats.timeFormat
    .replace('HH', String(hours24).padStart(2, '0'))
    .replace('h', String(hours12))
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('a', ampm)
}

function formatDuration(sec: number) {
  if (!sec) return "0:00"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDevice(device?: string) {
  if (!device || device === "-") return "-"
  
  // music_service direkt anzeigen (navidrome, spotify, etc.)
  return device.length > 20 ? device.substring(0, 20) + "..." : device
}

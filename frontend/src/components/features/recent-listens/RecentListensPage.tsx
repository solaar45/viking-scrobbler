"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Activity, RefreshCw, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { DashboardSkeleton } from "@/components/layout"
import { StatsCover } from '@/components/StatsCover'
import { getCoverUrl } from '@/lib/cover-utils'
import { VIKING_DESIGN, VIKING_TYPOGRAPHY } from '@/lib/design-tokens'

// --- TYPES ---
export interface RecentListen {
  id: string
  track: string
  artist: string
  album: string
  playedAt: string
  duration: number
  releaseYear?: string | number
  genres?: string
  additional_info?: {
    navidrome_id?: string
    originalBitRate?: number
    originalFormat?: string
    media_player?: string
    [key: string]: any
  }
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

// Format color mapping with grouped variations
function getFormatBadgeColor(format: string | undefined): string {
  if (!format) return "bg-gray-500"
  
  const fmt = format.toUpperCase()
  
  // Group 1: Standard Lossy (Blue tones)
  if (fmt === "MP3") return "bg-blue-500"
  if (fmt === "AAC") return "bg-blue-400"
  if (fmt === "M4A") return "bg-blue-500/90"
  if (fmt === "OGG" || fmt === "VORBIS") return "bg-blue-600"
  
  // Group 2: High-Efficiency Lossy (Orange tones)
  if (fmt === "OPUS") return "bg-orange-500"
  if (fmt === "WMA") return "bg-orange-400"
  
  // Group 3: Lossless (Green tones)
  if (fmt === "FLAC") return "bg-green-500"
  if (fmt === "ALAC") return "bg-green-400"
  if (fmt === "APE") return "bg-green-600"
  if (fmt === "WAVPACK" || fmt === "WV") return "bg-green-500/90"
  if (fmt === "TTA") return "bg-green-600/90"
  
  // Group 4: Uncompressed (Purple tones)
  if (fmt === "WAV") return "bg-purple-500"
  if (fmt === "AIFF" || fmt === "AIF") return "bg-purple-400"
  if (fmt === "PCM") return "bg-purple-600"
  if (fmt === "DSD" || fmt === "DSF" || fmt === "DFF") return "bg-purple-500/90"
  
  return "bg-gray-500"
}

// --- MAIN COMPONENT ---
export function RecentListensPage() {
  const [period, setPeriod] = useState<string>("all_time")
  const [allRecent, setAllRecent] = useState<RecentListen[]>([])
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState<string>("viking_user")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const socketRef = useRef<WebSocket | null>(null)

  // Initial Data Fetch + Refetch bei Period-Wechsel
  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
    fetchRecentListens()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [period, pageSize])

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/socket/websocket`

    console.log("Connecting to WebSocket:", wsUrl)
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log("✅ WebSocket connected")

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
        fetchRecentListens()
      }
    }

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
    }

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected")
    }

    socketRef.current = socket

    const handleFormatChange = () => {
      console.log("📅 DateTime format changed, forcing re-render")
      setAllRecent((prev) => [...prev])
    }

    window.addEventListener("datetime-format-changed", handleFormatChange)

    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket")
        socketRef.current.close()
      }
      window.removeEventListener("datetime-format-changed", handleFormatChange)
    }
  }, [username])

  async function fetchRecentListens() {
    setLoading(true)
    try {
      const recentResponse = await fetch(`/1/user/${username}/recent-listens?count=500`)
      const recentJson = await recentResponse.json()

      const recentListens = (recentJson.payload?.listens || []).map(
        (listen: any) => ({
          id: listen.listened_at?.toString() || Math.random().toString(),
          track: listen.track_name || "Unknown Track",
          artist: listen.artist_name || "Unknown Artist",
          album: listen.release_name || "Unknown Album",
          playedAt: listen.listened_at
            ? new Date(listen.listened_at * 1000).toISOString()
            : new Date().toISOString(),
          duration: Math.floor(
            (listen.additional_info?.duration_ms ??
              listen.additional_info?.extended?.duration_ms ??
              0) / 1000
          ),
          releaseYear: listen.additional_info?.release_year ?? undefined,
          genres: listen.additional_info?.genres || "–",
          additional_info: listen.additional_info || {},
        })
      )

      setAllRecent(recentListens)
      console.log("✅ Recent listens loaded")
    } catch (e) {
      console.error("Failed to load recent listens", e)
    } finally {
      setLoading(false)
    }
  }

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecent.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const visibleRecent = filteredRecent.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <Clock className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_TYPOGRAPHY.heading.xl}>Recent Listens</h1>
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

      {/* MAIN CONTENT */}
      <TooltipProvider>
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* RECENT LISTENS TABLE */}
            <div className="card-dense flex-1 min-h-[500px] flex flex-col">
              <div className="flex-1 overflow-auto relative">
                {filteredRecent.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                    <Activity
                      className="w-20 h-20 text-viking-border-emphasis"
                      strokeWidth={1.5}
                    />
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
                      onClick={() => fetchRecentListens()}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Stream
                    </button>
                  </div>
                ) : (
                  <table className="table-dense w-full">
                    <thead className="sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                        {/* MUSIC INFO GROUP */}
                        <th className="table-head-dense pl-6 text-left w-[50px]"></th>
                        <th className="table-head-dense text-left w-[180px]">Track</th>
                        <th className="table-head-dense text-left w-[140px]">Artist</th>
                        <th className="table-head-dense text-left w-[140px]">Album</th>
                        <th className="table-head-dense text-left w-[55px]">Year</th>
                        <th className="table-head-dense text-left w-[110px] border-r border-viking-border-emphasis/50">Genre</th>
                        
                        {/* FILE METADATA GROUP */}
                        <th className="table-head-dense text-right w-[80px]">Bitrate</th>
                        <th className="table-head-dense text-center w-[70px]">Format</th>
                        <th className="table-head-dense text-right w-[70px] border-r border-viking-border-emphasis/50">Duration</th>
                        
                        {/* USAGE METADATA GROUP */}
                        <th className="table-head-dense text-left w-[100px]">Player</th>
                        <th className="table-head-dense text-right w-[90px]">Date</th>
                        <th className="table-head-dense text-right w-[60px] pr-6">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-viking-border-subtle">
                      {visibleRecent.map((item) => {
                        const format = item.additional_info?.originalFormat
                        const bitrate = item.additional_info?.originalBitRate
                        const player = item.additional_info?.media_player
                        const formatColor = getFormatBadgeColor(format)
                        const coverUrl = getCoverUrl({ additional_info: item.additional_info }, 80)

                        return (
                          <tr key={item.id} className="table-row-dense">
                            {/* MUSIC INFO GROUP */}
                            <td className="table-cell-dense pl-6 w-[50px]">
                              <StatsCover 
                                coverUrl={coverUrl}
                                name={item.artist}
                                size="sm"
                              />
                            </td>
                            <td className="table-cell-dense table-cell-primary w-[180px] truncate">
                              {item.track}
                            </td>
                            <td className="table-cell-dense table-cell-secondary w-[140px] truncate">
                              {item.artist}
                            </td>
                            <td className="table-cell-dense table-cell-secondary w-[140px] truncate">
                              {item.album}
                            </td>
                            <td className={`table-cell-dense w-[55px] ${VIKING_TYPOGRAPHY.data.m}`}>
                              {item.releaseYear ?? "—"}
                            </td>
                            <td className="table-cell-dense table-cell-secondary w-[110px] truncate font-medium text-emerald-400 border-r border-viking-border-emphasis/50">
                              {item.genres}
                            </td>
                            
                            {/* FILE METADATA GROUP */}
                            <td className="table-cell-dense w-[80px] text-right">
                              {bitrate ? (
                                <span className={VIKING_TYPOGRAPHY.data.s}>
                                  {bitrate} kbps
                                </span>
                              ) : (
                                <span className="text-viking-text-tertiary text-xs">—</span>
                              )}
                            </td>
                            <td className="table-cell-dense table-cell-secondary w-[70px] text-center">
                              {format ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded ${VIKING_TYPOGRAPHY.label.badge} text-white ${formatColor}`}
                                >
                                  {format}
                                </span>
                              ) : (
                                <span className="text-viking-text-tertiary text-xs">—</span>
                              )}
                            </td>
                            <td className={`table-cell-dense w-[70px] text-right border-r border-viking-border-emphasis/50 ${VIKING_TYPOGRAPHY.data.m}`}>
                              {formatDuration(item.duration)}
                            </td>
                            
                            {/* USAGE METADATA GROUP */}
                            <td className="table-cell-dense table-cell-secondary w-[100px] truncate">
                              {player || "—"}
                            </td>
                            <td className={`table-cell-dense w-[90px] text-right ${VIKING_TYPOGRAPHY.data.m}`}>
                              {formatDate(item.playedAt)}
                            </td>
                            <td className={`table-cell-dense w-[60px] text-right pr-6 ${VIKING_TYPOGRAPHY.data.m}`}>
                              {formatTime(item.playedAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* PAGINATION FOOTER */}
              {filteredRecent.length > 0 && (
                <div className="border-t border-viking-border-subtle bg-viking-bg-secondary/50 backdrop-blur-sm">
                  <div className="px-6 py-4 flex items-center justify-between">
                    {/* Left: Page size selector */}
                    <div className="flex items-center gap-3">
                      <span className={VIKING_TYPOGRAPHY.label.inline}>
                        Show:
                      </span>
                      <div className="flex items-center gap-1">
                        {[25, 50, 100, 200].map((size) => (
                          <button
                            key={size}
                            onClick={() => setPageSize(size)}
                            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                              pageSize === size
                                ? "bg-viking-purple text-white shadow-lg shadow-viking-purple/20"
                                : "bg-viking-bg-tertiary text-viking-text-secondary hover:bg-viking-bg-elevated hover:text-viking-text-primary"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Center: Page info */}
                    <div className={VIKING_TYPOGRAPHY.body.s}>
                      Page {currentPage} of {totalPages} • Showing {startIndex + 1}-
                      {Math.min(endIndex, filteredRecent.length)} of {filteredRecent.length}
                    </div>

                    {/* Right: Navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded bg-viking-bg-tertiary text-viking-text-secondary hover:bg-viking-bg-elevated hover:text-viking-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`min-w-[32px] h-8 px-2 rounded text-xs font-bold transition-all ${
                                currentPage === pageNum
                                  ? "bg-viking-purple text-white shadow-lg shadow-viking-purple/20"
                                  : "bg-viking-bg-tertiary text-viking-text-secondary hover:bg-viking-bg-elevated hover:text-viking-text-primary"
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded bg-viking-bg-tertiary text-viking-text-secondary hover:bg-viking-bg-elevated hover:text-viking-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </TooltipProvider>
    </div>
  )
}

// --- FORMAT HELPERS ---
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

function formatTime(iso: string) {
  if (!iso) return "-"
  const formats = getDateTimeFormats()
  const d = new Date(iso)
  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12
  const minutes = String(d.getMinutes()).padStart(2, "0")
  const seconds = String(d.getSeconds()).padStart(2, "0")
  const ampm = hours24 >= 12 ? "PM" : "AM"

  return formats.timeFormat
    .replace("HH", String(hours24).padStart(2, "0"))
    .replace("h", String(hours12))
    .replace("mm", minutes)
    .replace("ss", seconds)
    .replace("a", ampm)
}

function formatDuration(sec: number) {
  if (!sec) return "0:00"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
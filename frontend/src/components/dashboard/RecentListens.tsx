import { useMemo, useState } from "react"
import { Activity, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { RecentListen } from "./types"

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

// Format color mapping with grouped variations
function getFormatBadgeColor(format: string | undefined): string {
  if (!format) return "bg-gray-500"
  
  const fmt = format.toUpperCase()
  
  // Group 1: Standard Lossy (Blue tones)
  if (fmt === "MP3") return "bg-blue-500"
  if (fmt === "AAC") return "bg-blue-400"
  if (fmt === "M4A") return "bg-blue-500/90" // Blue-medium
  if (fmt === "OGG" || fmt === "VORBIS") return "bg-blue-600"
  
  // Group 2: High-Efficiency Lossy (Orange tones)
  if (fmt === "OPUS") return "bg-orange-500"
  if (fmt === "WMA") return "bg-orange-400"
  
  // Group 3: Lossless (Green tones)
  if (fmt === "FLAC") return "bg-green-500"
  if (fmt === "ALAC") return "bg-green-400"
  if (fmt === "APE") return "bg-green-600"
  if (fmt === "WAVPACK" || fmt === "WV") return "bg-green-500/90" // Green-medium
  if (fmt === "TTA") return "bg-green-600/90"
  
  // Group 4: Uncompressed (Purple tones)
  if (fmt === "WAV") return "bg-purple-500"
  if (fmt === "AIFF" || fmt === "AIF") return "bg-purple-400"
  if (fmt === "PCM") return "bg-purple-600"
  if (fmt === "DSD" || fmt === "DSF" || fmt === "DFF") return "bg-purple-500/90" // Purple-medium
  
  // Unknown format
  return "bg-gray-500"
}

interface RecentListensProps {
  recent: RecentListen[]
  period: string
  periods: Array<{ id: string; label: string; days: number | null }>
  onRefresh: () => void
}

export default function RecentListens({
  recent,
  period,
  periods,
  onRefresh,
}: RecentListensProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const filteredRecent = useMemo(() => {
    if (period === "all_time") return recent

    const selectedPeriod = periods.find((p) => p.id === period)
    if (!selectedPeriod?.days) return recent

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod.days)
    const cutoffTimestamp = cutoffDate.getTime()

    return recent.filter((listen) => {
      const listenDate = new Date(listen.playedAt).getTime()
      return listenDate >= cutoffTimestamp
    })
  }, [recent, period, periods])

  // Pagination calculations
  const totalPages = Math.ceil(filteredRecent.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const visibleRecent = filteredRecent.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [period, pageSize])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <>
      {/* HEADER – freischwebend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">Recent Listens</h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            {periods.find((item) => item.id === period)?.label}
          </span>
          <div className="badge-live">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-widest">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider text-right">
            {filteredRecent.length} tracks total
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
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
                    : `No listens found in ${periods.find((p) => p.id === period)?.label.toLowerCase()}.`}
                </p>
              </div>
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Stream
              </button>
            </div>
          ) : (
            <table className="table-dense table-auto w-full">
              <thead className="sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  {/* Flexible columns - get most space */}
                  <th className="table-head-dense pl-6 text-left w-auto min-w-[200px]">Track</th>
                  <th className="table-head-dense text-left w-auto min-w-[120px]">Artist</th>
                  <th className="table-head-dense text-left w-auto min-w-[120px]">Album</th>
                  
                  {/* Content-fit columns - minimal width */}
                  <th className="table-head-dense text-left w-1 whitespace-nowrap">Year</th>
                  <th className="table-head-dense text-left w-32">Genre</th>
                  <th className="table-head-dense text-center w-1 whitespace-nowrap">Format</th>
                  <th className="table-head-dense text-right w-1 whitespace-nowrap">Date</th>
                  <th className="table-head-dense text-right w-1 whitespace-nowrap">Time</th>
                  <th className="table-head-dense text-right pr-6 w-1 whitespace-nowrap">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-viking-border-subtle">
                {visibleRecent.map((item) => {
                  const format = item.originalFormat
                  const bitrate = item.originalBitRate
                  const formatColor = getFormatBadgeColor(format)
                  
                  return (
                    <tr key={item.id} className="table-row-dense">
                      {/* Flexible columns */}
                      <td className="table-cell-dense table-cell-primary pl-6 w-auto min-w-[200px] truncate">
                        {item.track}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-auto min-w-[120px] truncate">
                        {item.artist}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-auto min-w-[120px] truncate">
                        {item.album}
                      </td>
                      
                      {/* Content-fit columns */}
                      <td className="table-cell-dense table-cell-secondary w-1 whitespace-nowrap">
                        {item.releaseYear ?? "—"}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-32 truncate font-medium text-emerald-400">
                        {item.genres}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-1 whitespace-nowrap text-center">
                        {format ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${formatColor}`}
                            >
                              {format}
                            </span>
                            {bitrate && (
                              <span className="text-[10px] font-semibold text-viking-text-tertiary">
                                {bitrate}k
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-viking-text-tertiary text-xs">—</span>
                        )}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-1 whitespace-nowrap text-right">
                        {formatDate(item.playedAt)}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-1 whitespace-nowrap text-right">
                        {formatTime(item.playedAt)}
                      </td>
                      <td className="table-cell-dense table-cell-secondary w-1 whitespace-nowrap text-right pr-6">
                        {formatDuration(item.duration)}
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
                <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
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
              <div className="text-xs font-semibold text-viking-text-tertiary">
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
    </>
  )
}

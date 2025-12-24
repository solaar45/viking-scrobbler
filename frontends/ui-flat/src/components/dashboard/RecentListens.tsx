import { useMemo, useState } from "react"
import { Activity, RefreshCw, ChevronDown } from "lucide-react"
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
  const [displayCount, setDisplayCount] = useState(25)

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

  const visibleRecent = filteredRecent.slice(0, displayCount)
  const hasMore = filteredRecent.length > displayCount
  const remainingCount = filteredRecent.length - displayCount

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
            Showing {visibleRecent.length} of {filteredRecent.length} tracks
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="card-dense flex-1 min-h-[500px]">
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
            <>
              <table className="table-dense">
                <thead className="sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="table-head-dense pl-6 text-left w-[22%]">Track</th>
                    <th className="table-head-dense text-left w-[14%]">Artist</th>
                    <th className="table-head-dense text-left w-[14%]">Album</th>
                    <th className="table-head-dense text-left w-[8%]">Year</th>
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
                      <td className="table-cell-dense table-cell-secondary truncate max-w-[80px]">
                        {item.releaseYear ?? "—"}
                      </td>
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
    </>
  )
}

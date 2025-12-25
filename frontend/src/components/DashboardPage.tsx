import { useEffect, useState, useRef } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import Overview from "./dashboard/Overview"
import RecentListens from "./dashboard/RecentListens"
import { DashboardSkeleton } from "./DashboardSkeleton"
import { DashboardStats } from "./dashboard/types"

const PERIODS = [
  { id: "week", label: "Last 7 Days", days: 7 },
  { id: "month", label: "Last 30 Days", days: 30 },
  { id: "year", label: "Last Year", days: 365 },
  { id: "all_time", label: "All Time", days: null },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState<string>("all_time")
  const [data, setData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState<string>("viking_user")
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  // Initial Data Fetch + Refetch bei Period-Wechsel
  useEffect(() => {
    const storedUsername = localStorage.getItem("username")
    if (storedUsername) {
      setUsername(storedUsername)
    }
    fetchStats()
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

    const handleFormatChange = () => {
      console.log("📅 DateTime format changed, forcing re-render")
      setData((prev) => (prev ? { ...prev } : null))
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

  // Vollständiger Stats-Fetch
  async function fetchStatsComplete() {
    console.log("🔄 Fetching complete stats...")
    try {
      const statsResponse = await fetch(
        `/1/stats/user/${username}/totals?range=${period}`
      )
      const statsJson = await statsResponse.json()
      const totals = statsJson.payload || {}

      // ⬇️ DEBUG HINZUFÜGEN
      console.log('🔍 Backend totals:', {
        most_active_day: totals.most_active_day,
        tracks_on_most_active_day: totals.tracks_on_most_active_day,
        peak_day: totals.peak_day,
        peak_count: totals.peak_count
      })

      const lifetimeResponse = await fetch(
        `/1/stats/user/${username}/totals?range=all_time`
      )
      const lifetimeJson = await lifetimeResponse.json()
      const lifetimeTotals = lifetimeJson.payload || {}

      const recentResponse = await fetch(
        `/1/user/${username}/recent-listens?count=500`
      )
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
        })
      )

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
          peakValue: totals.peak_count || 0,  // ⬅️ ÄNDERN VON peak_value zu peak_count
          currentStreak: totals.current_streak || 0,
        },
        lifetime: {
          totalScrobbles: lifetimeTotals.total_listens || 0,
          uniqueArtists: lifetimeTotals.unique_artists || 0,
          uniqueTracks: lifetimeTotals.unique_tracks || 0,
          uniqueAlbums: lifetimeTotals.unique_albums || 0,
          mostActiveDay: lifetimeTotals.most_active_day || null,
          tracksOnMostActiveDay:
            lifetimeTotals.tracks_on_most_active_day || 0,
          avgPerDay: lifetimeTotals.avg_per_day || 0,
          peakDay: lifetimeTotals.peak_day || null,
          peakValue: lifetimeTotals.peak_count || 0,  // ⬅️ ÄNDERN VON peak_value zu peak_count
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

  return (
    <TooltipProvider>
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
          <Overview
            filtered={data?.filtered}
            lifetime={data?.lifetime}
            loading={loading}
            period={period}
            periods={PERIODS}
            isConnected={isConnected}
            onPeriodChange={setPeriod}
            onRefresh={fetchStats}
          />

          <RecentListens
            recent={data?.recent ?? []}
            period={period}
            periods={PERIODS}
            onRefresh={fetchStats}
          />
        </div>
      )}
    </TooltipProvider>
  )
}

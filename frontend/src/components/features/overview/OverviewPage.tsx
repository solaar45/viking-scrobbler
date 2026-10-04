import { useEffect, useState, useRef } from 'react'
import { BarChart3, Music, TrendingUp, TrendingDown } from 'lucide-react'
import { VIKING_DESIGN, VIKING_TYPOGRAPHY, cn } from '@/lib/design-tokens'
import { getCoverUrl } from '@/lib/cover-utils'

interface PeriodStats {
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

interface RecentListen {
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

interface DashboardStats {
  filtered: PeriodStats
  lifetime: PeriodStats
  total_listening_time: string
  top_artist: { name: string; plays: number; additional_info?: any }
  top_track: { name: string; artist: string; plays: number; additional_info?: any }
  top_album: { name: string; artist: string; plays: number; additional_info?: any }
  recent_activity: Array<{ date: string; plays: number }>
  recent_listens: RecentListen[]
  breakdown_by_player?: Array<{ name: string; plays: number; share: string }>
  breakdown_by_hour?: Array<{ name: string; plays: number; share: string }>
  breakdown_by_genre?: Array<{ name: string; plays: number; share: string }>
}

type TrendInfo = {
  value?: number
  label: string
}

const PERIODS = [
  { id: 'week', label: 'Last 7 Days', days: 7 },
  { id: 'month', label: 'Last 30 Days', days: 30 },
  { id: 'year', label: 'Last Year', days: 365 },
  { id: 'all_time', label: 'All Time', days: null },
]

function calculateTrend(current?: number, lifetime?: number): number | undefined {
  if (current === undefined || lifetime === undefined || lifetime === 0) {
    return undefined
  }
  const diff = current - lifetime
  return (diff / lifetime) * 100
}

function getTrendLabel(timeRange: string): string {
  switch (timeRange) {
    case 'week': return 'last week'
    case 'month': return 'last month'
    case 'year': return 'last year'
    case 'all_time': return 'lifetime'
    default: return 'last period'
  }
}

function formatDate(iso: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

// Aggregate player data from recent listens
function aggregateByPlayer(listens: RecentListen[]): Array<{ name: string; plays: number; share: string }> {
  const playerCounts = new Map<string, number>()
  const total = listens.length

  listens.forEach(listen => {
    const player = listen.additional_info?.media_player || 'Unknown'
    playerCounts.set(player, (playerCounts.get(player) || 0) + 1)
  })

  return Array.from(playerCounts.entries())
    .map(([name, plays]) => ({
      name,
      plays,
      share: `${((plays / total) * 100).toFixed(1)}%`
    }))
    .sort((a, b) => b.plays - a.plays)
}

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all_time'>('all_time')
  const [username, setUsername] = useState<string>('viking_user')

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUsername(storedUsername)
    }
  }, [])

  useEffect(() => {
    if (username) {
      loadStats()
    }
  }, [timeRange, username])

  const loadStats = async () => {
    setLoading(true)
    try {
      // API 1: Main metrics from /1/stats/user/{username}/totals
      const statsResponse = await fetch(`/1/stats/user/${username}/totals?range=${timeRange}`)
      const statsJson = await statsResponse.json()
      const totals = statsJson.payload || {}
      
      console.log('📊 Stats API Response:', totals)

      // API 2: Overview data with listening time and top items
      const overviewResponse = await fetch(`/api/stats/overview?range=${timeRange}`)
      const overview = await overviewResponse.json()
      
      console.log('🎵 Overview API Response:', overview)

      // API 3: Recent listens for player aggregation
      const recentResponse = await fetch(`/1/user/${username}/recent-listens?count=500`)
      const recentJson = await recentResponse.json()
      
      const recentListens = (recentJson.payload?.listens || []).map((listen: any) => ({
        id: listen.listened_at?.toString() || Math.random().toString(),
        track: listen.track_name || 'Unknown Track',
        artist: listen.artist_name || 'Unknown Artist',
        album: listen.release_name || 'Unknown Album',
        playedAt: listen.listened_at
          ? new Date(listen.listened_at * 1000).toISOString()
          : new Date().toISOString(),
        duration: Math.floor(
          (listen.additional_info?.duration_ms ??
            listen.additional_info?.extended?.duration_ms ??
            0) / 1000
        ),
        releaseYear: listen.additional_info?.release_year ?? undefined,
        genres: listen.additional_info?.genres || '–',
        additional_info: listen.additional_info || {},
      }))

      console.log(`📀 Loaded ${recentListens.length} recent listens`)

      // Filter recent listens by time range
      const selectedPeriod = PERIODS.find((p) => p.id === timeRange)
      let filteredListens = recentListens
      
      if (selectedPeriod?.days) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod.days)
        const cutoffTimestamp = cutoffDate.getTime()
        
        filteredListens = recentListens.filter((listen: RecentListen) => {
          const listenDate = new Date(listen.playedAt).getTime()
          return listenDate >= cutoffTimestamp
        })
      }

      console.log(`🔍 Filtered to ${filteredListens.length} listens for ${timeRange}`)

      // Player, Hour, and Genre breakdowns (from backend API or fallback to recent listens)
      const breakdown_by_player = (overview.breakdown_by_player && overview.breakdown_by_player.length > 0)
        ? overview.breakdown_by_player
        : aggregateByPlayer(filteredListens)

      const breakdown_by_hour = overview.breakdown_by_hour || []
      const breakdown_by_genre = overview.breakdown_by_genre || []

      // Lifetime stats for trends
      const lifetimeResponse = await fetch(`/1/stats/user/${username}/totals?range=all_time`)
      const lifetimeJson = await lifetimeResponse.json()
      const lifetimeTotals = lifetimeJson.payload || {}

      setStats({
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
        total_listening_time: overview.total_listening_time || '0h 0m',
        top_artist: overview.top_artist || { name: 'N/A', plays: 0 },
        top_track: overview.top_track || { name: 'N/A', artist: 'N/A', plays: 0 },
        top_album: overview.top_album || { name: 'N/A', artist: 'N/A', plays: 0 },
        recent_activity: overview.recent_activity || [],
        recent_listens: recentListens,
        breakdown_by_player,
        breakdown_by_hour,
        breakdown_by_genre,
      })
    } catch (error) {
      console.error('Failed to load overview stats', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <OverviewSkeleton />
  }

  if (!stats) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", VIKING_DESIGN.colors.text.tertiary)}>
        <p className={VIKING_TYPOGRAPHY.body.m}>No data available</p>
      </div>
    )
  }

  const filtered = stats.filtered
  const lifetime = stats.lifetime
  const trendLabel = getTrendLabel(timeRange)
  
  const formattedBestDay = filtered.peakDay && filtered.peakDay !== '' 
    ? formatDate(filtered.peakDay) 
    : filtered.peakDay ?? null

  const trends = {
    plays: calculateTrend(filtered.totalScrobbles, lifetime.totalScrobbles),
    artists: calculateTrend(filtered.uniqueArtists, lifetime.uniqueArtists),
    tracks: calculateTrend(filtered.uniqueTracks, lifetime.uniqueTracks),
    albums: calculateTrend(filtered.uniqueAlbums, lifetime.uniqueAlbums),
    avgPerDay: calculateTrend(filtered.avgPerDay, lifetime.avgPerDay),
    streak: calculateTrend(filtered.currentStreak, lifetime.currentStreak),
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <BarChart3 className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_TYPOGRAPHY.heading.xl}>Overview</h1>
        </div>

        {/* Time Range Filter - Button Group (like Recent Listens) */}
        <div className="flex gap-1 bg-viking-bg-tertiary p-1.5 rounded-lg border border-viking-border-default">
          {PERIODS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeRange(id as any)}
              className={`text-xs font-semibold px-4 py-2 rounded-md transition-all uppercase tracking-wide whitespace-nowrap ${
                timeRange === id
                  ? "bg-gradient-to-r from-viking-purple to-viking-purple-dark text-white shadow-lg shadow-viking-purple/20"
                  : "text-viking-text-tertiary hover:text-viking-text-secondary hover:bg-viking-bg-elevated"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* HERO SECTION - 3 Equal Covers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* TOP ARTIST */}
        <HeroCard
          type="artist"
          name={stats.top_artist.name}
          plays={stats.top_artist.plays}
          item={stats.top_artist}
          coverSize={380}
        />

        {/* TOP TRACK */}
        <HeroCard
          type="track"
          name={stats.top_track.name}
          subtitle={stats.top_track.artist}
          plays={stats.top_track.plays}
          item={stats.top_track}
          coverSize={380}
        />

        {/* TOP ALBUM */}
        <HeroCard
          type="album"
          name={stats.top_album.name}
          subtitle={stats.top_album.artist}
          plays={stats.top_album.plays}
          item={stats.top_album}
          coverSize={380}
        />
      </div>

      {/* 9 KPI CARDS - Now includes Listening Time next to Streak */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-9 gap-3">
        <MetricCard
          label="Plays"
          value={filtered.totalScrobbles}
          trend={trends.plays !== undefined ? { value: trends.plays, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Artists"
          value={filtered.uniqueArtists}
          trend={trends.artists !== undefined ? { value: trends.artists, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Songs"
          value={filtered.uniqueTracks}
          trend={trends.tracks !== undefined ? { value: trends.tracks, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Albums"
          value={filtered.uniqueAlbums}
          trend={trends.albums !== undefined ? { value: trends.albums, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Daily Avg"
          value={filtered.avgPerDay}
          unit="tracks"
          trend={trends.avgPerDay !== undefined ? { value: trends.avgPerDay, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Top Day"
          valueStr={filtered.mostActiveDay}
        />
        <MetricCard
          label="Best Day"
          valueStr={formattedBestDay}
        />
        <MetricCard
          label="Streak"
          value={filtered.currentStreak}
          unit="days"
          trend={trends.streak !== undefined ? { value: trends.streak, label: trendLabel } : undefined}
        />
        {/* NEW: Listening Time Card */}
        <MetricCard
          label="Listening Time"
          valueStr={stats.total_listening_time}
        />
      </div>

      {/* ACTIVITY VISUALIZATION - 2/3 Chart + 1/3 Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* LISTENING ACTIVITY CHART (2/3) - Full Width with Axes */}
        <div className={cn(VIKING_DESIGN.components.card, "lg:col-span-2 flex flex-col")}>
          <div className={cn(VIKING_DESIGN.components.cardContent, "flex-1 flex flex-col justify-between")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-viking-purple" />
                <h2 className={VIKING_TYPOGRAPHY.heading.m}>Listening Activity</h2>
              </div>
              {stats.recent_activity && stats.recent_activity.length > 0 && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <div className="px-2.5 py-1 rounded-md bg-viking-bg-tertiary border border-white/5 text-viking-text-secondary">
                    <span className="text-viking-text-tertiary">Total: </span>
                    <span className="font-semibold text-white">
                      {stats.recent_activity.reduce((acc, curr) => acc + curr.plays, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-viking-bg-tertiary border border-white/5 text-viking-text-secondary">
                    <span className="text-viking-text-tertiary">Avg: </span>
                    <span className="font-semibold text-white">
                      {Math.round(stats.recent_activity.reduce((acc, curr) => acc + curr.plays, 0) / stats.recent_activity.length)}
                      <span className="text-[10px] text-viking-text-tertiary">/d</span>
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-viking-purple/10 border border-viking-purple/20 text-viking-purple">
                    <span>Peak: </span>
                    <span className="font-semibold">
                      {Math.max(...stats.recent_activity.map(d => d.plays)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <AreaChartWithAxes data={stats.recent_activity} />
          </div>
        </div>

        {/* DONUT CHARTS - Tabbed (1/3) */}
        <div className={VIKING_DESIGN.components.card}>
          <DonutChartsTabbed
            byPlayer={stats.breakdown_by_player || []}
            byHour={stats.breakdown_by_hour || []}
            byGenre={stats.breakdown_by_genre || []}
          />
        </div>
      </div>
    </div>
  )
}

// ===== HERO CARD =====
interface HeroCardProps {
  type: 'artist' | 'track' | 'album'
  name: string
  subtitle?: string
  plays: number
  item: any
  coverSize: number
  className?: string
}

function HeroCard({ type, name, subtitle, plays, item, coverSize, className }: HeroCardProps) {
  const coverUrl = getCoverUrl(item, coverSize)
  const [imageError, setImageError] = useState(false)
  const typeLabels = { artist: 'TOP ARTIST', track: 'TOP TRACK', album: 'TOP ALBUM' }

  useEffect(() => {
    setImageError(false)
  }, [coverUrl])

  const showCover = coverUrl && !imageError

  return (
    <div className={cn(
      VIKING_DESIGN.components.card,
      "p-6 flex flex-col gap-4 group",
      VIKING_DESIGN.effects.transition.base,
      "hover:shadow-xl",
      className
    )}>
      <div className="flex items-start">
        <span className={VIKING_TYPOGRAPHY.label.inline}>{typeLabels[type]}</span>
      </div>

      {/* ALBUM COVER */}
      <div className="relative mx-auto">
        <div 
          className={cn(
            "rounded-lg overflow-hidden",
            "shadow-2xl shadow-viking-purple/20",
            "transition-transform duration-300 group-hover:scale-105"
          )}
          style={{ width: coverSize, height: coverSize }}
        >
          {showCover ? (
            <img 
              src={coverUrl} 
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => {
                setImageError(true)
              }}
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              VIKING_DESIGN.colors.card.elevated
            )}>
              <Music className="w-20 h-20 text-viking-text-tertiary opacity-30" />
            </div>
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="text-center">
        <p className={cn(VIKING_TYPOGRAPHY.body.l, "font-bold truncate mb-1")}>
          {name}
        </p>
        {subtitle && (
          <p className={cn(VIKING_TYPOGRAPHY.body.s, "truncate mb-2")}>
            {subtitle}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <span className={VIKING_TYPOGRAPHY.data.m}>{plays.toLocaleString()}</span>
          <span className={VIKING_TYPOGRAPHY.body.s}>plays</span>
        </div>
      </div>
    </div>
  )
}

// ===== METRIC CARD (SAME AS RECENT LISTENS) =====
interface MetricCardProps {
  label: string
  value?: number
  valueStr?: string | null
  unit?: string
  trend?: TrendInfo
}

function MetricCard({ label, value, valueStr, unit, trend }: MetricCardProps) {
  const displayValue = valueStr ?? (typeof value === 'number' ? value.toLocaleString() : '0')
  const trendValue = trend?.value
  const trendLabel = trend?.label ?? 'last period'
  const trendPositive = trendValue !== undefined && trendValue > 0
  const trendNegative = trendValue !== undefined && trendValue < 0

  return (
    <div className="bg-viking-bg-secondary hover:bg-viking-bg-tertiary/50 rounded-lg px-4 py-4 min-h-[110px] transition-colors duration-200 cursor-default border border-viking-border-subtle/50">
      <div className={cn(VIKING_TYPOGRAPHY.label.inline, "mb-3")}>{label}</div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <span className={VIKING_TYPOGRAPHY.display.l}>{displayValue}</span>
        {unit && <span className={VIKING_TYPOGRAPHY.data.s}>{unit}</span>}
      </div>
      {trendValue !== undefined && (
        <div className="flex items-center gap-1.5 text-[11px]">
          {trendPositive && <TrendingUp className="w-3 h-3 text-emerald-500" strokeWidth={2.5} />}
          {trendNegative && <TrendingDown className="w-3 h-3 text-red-500" strokeWidth={2.5} />}
          <span className={`font-semibold ${
            trendPositive ? "text-emerald-500" : trendNegative ? "text-red-500" : "text-viking-text-tertiary"
          }`}>
            {trendPositive ? "+" : ""}{trendValue.toFixed(1)}%
          </span>
          <span className="text-viking-text-tertiary">from {trendLabel}</span>
        </div>
      )}
    </div>
  )
}

// ===== AREA CHART WITH AXES =====
function AreaChartWithAxes({ data }: { data: Array<{ date: string; plays: number }> }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (!data || data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center text-viking-text-tertiary">
        No activity recorded for this period
      </div>
    )
  }

  const maxPlays = Math.max(...data.map(d => d.plays), 1)
  const peakIndex = data.findIndex(d => d.plays === maxPlays)
  const ySteps = 4
  const yInterval = Math.max(1, Math.ceil(maxPlays / ySteps))
  const yMax = yInterval * ySteps

  const chartWidth = 800
  const chartHeight = 300
  const paddingLeft = 45
  const paddingRight = 20
  const paddingTop = 25
  const paddingBottom = 40
  
  const innerWidth = chartWidth - paddingLeft - paddingRight
  const innerHeight = chartHeight - paddingTop - paddingBottom

  const points = data.map((d, i) => {
    const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2)
    const y = paddingTop + innerHeight - (d.plays / yMax) * innerHeight
    return { x, y, plays: d.plays, date: d.date, index: i }
  })

  // Format dates for X-axis
  const formatXAxisDate = (dateStr: string) => {
    if (!dateStr) return ''
    if (dateStr.length === 7) {
      const [year, month] = dateStr.split('-')
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
      return d.toLocaleString('en', { month: 'short' }) + (year !== new Date().getFullYear().toString() ? ` '${year.slice(2)}` : '')
    }
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDate()
    const month = d.toLocaleString('en', { month: 'short' })
    return `${day} ${month}`
  }

  // Format dates for Tooltip
  const formatTooltipDate = (dateStr: string) => {
    if (!dateStr) return ''
    if (dateStr.length === 7) {
      const [year, month] = dateStr.split('-')
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
      return d.toLocaleString('en', { month: 'long', year: 'numeric' })
    }
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Handle hover tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth
    
    let closestIdx = 0
    let minDiff = Infinity
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].x - svgX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = i
      }
    }
    setHoverIndex(closestIdx)
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div className="w-full h-[300px] md:h-[320px] relative select-none">
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
        className="w-full h-full cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="vikingAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.45" />
            <stop offset="60%" stopColor="rgb(99, 102, 241)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="vikingLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(192, 132, 252)" />
            <stop offset="50%" stopColor="rgb(168, 85, 247)" />
            <stop offset="100%" stopColor="rgb(99, 102, 241)" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Y-axis grid lines and labels */}
        {Array.from({ length: ySteps + 1 }, (_, i) => {
          const value = yInterval * i
          const y = paddingTop + innerHeight - (value / yMax) * innerHeight
          
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="rgb(71, 85, 105)"
                strokeOpacity={i === 0 ? "0.35" : "0.15"}
                strokeDasharray={i === 0 ? "none" : "3 3"}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-viking-text-tertiary"
                style={{ fontSize: '11px', fontFamily: 'monospace' }}
              >
                {value}
              </text>
            </g>
          )
        })}
        
        {/* X-axis labels */}
        {data.map((item, i) => {
          const showLabel = 
            data.length <= 7 || 
            i % Math.ceil(data.length / 6) === 0 || 
            i === data.length - 1

          if (!showLabel) return null
          
          const x = paddingLeft + (data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2)
          const y = chartHeight - paddingBottom + 20
          
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-viking-text-tertiary text-[11px]"
            >
              {formatXAxisDate(item.date)}
            </text>
          )
        })}
        
        {/* Area fill */}
        <path
          d={generateSmoothAreaPath(points, innerHeight, paddingTop)}
          fill="url(#vikingAreaGradient)"
        />
        
        {/* Line */}
        <path
          d={generateSmoothLinePath(points, innerHeight, paddingTop)}
          fill="none"
          stroke="url(#vikingLineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak Point Indicator (when not hovering or when peak) */}
        {peakIndex >= 0 && maxPlays > 0 && points[peakIndex] && (
          <g>
            <circle
              cx={points[peakIndex].x}
              cy={points[peakIndex].y}
              r="4"
              fill="#c084fc"
              stroke="#1e1b4b"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Small points when 7 or fewer items */}
        {data.length <= 7 && points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="rgb(168, 85, 247)"
            stroke="#0f172a"
            strokeWidth="1.5"
          />
        ))}

        {/* Interactive Crosshair & Highlight Dot */}
        {activePoint && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={chartHeight - paddingBottom}
              stroke="rgb(168, 85, 247)"
              strokeOpacity="0.4"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Glowing outer aura */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="9"
              fill="rgb(168, 85, 247)"
              fillOpacity="0.3"
            />
            {/* Inner dot */}
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4.5"
              fill="#ffffff"
              stroke="rgb(147, 51, 234)"
              strokeWidth="2.5"
            />
          </g>
        )}
      </svg>

      {/* Floating HTML Tooltip */}
      {activePoint && (
        <div 
          className={cn(
            "pointer-events-none absolute z-20 px-3 py-2 rounded-lg",
            "bg-viking-bg-secondary/95 backdrop-blur-md border border-white/10 shadow-xl shadow-purple-950/30",
            "text-xs transition-transform duration-75"
          )}
          style={{
            left: `${(activePoint.x / chartWidth) * 100}%`,
            top: `${Math.max((activePoint.y / chartHeight) * 100, 18)}%`,
            transform: `translate(-50%, ${activePoint.y < 70 ? '16px' : '-115%'})`
          }}
        >
          <div className="font-medium text-viking-text-secondary whitespace-nowrap">
            {formatTooltipDate(activePoint.date)}
          </div>
          <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-viking-purple shrink-0" />
            <span className="font-bold text-white text-sm">
              {activePoint.plays}
            </span>
            <span className="text-viking-text-tertiary">
              {activePoint.plays === 1 ? 'scrobble' : 'scrobbles'}
            </span>
            {activePoint.plays === maxPlays && maxPlays > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 ml-1">
                Peak
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Generate smooth cubic Bézier line path using Catmull-Rom formulation
function generateSmoothLinePath(
  points: Array<{ x: number; y: number }>,
  height: number,
  paddingTop: number
): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  if (points.length === 2) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`

  const bottomY = paddingTop + height
  const clampY = (val: number) => Math.min(Math.max(val, paddingTop - 10), bottomY)

  let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return path
}

// Generate closed area path from smooth line path
function generateSmoothAreaPath(
  points: Array<{ x: number; y: number }>,
  height: number,
  paddingTop: number
): string {
  if (points.length === 0) return ''
  const linePath = generateSmoothLinePath(points, height, paddingTop)
  const bottomY = paddingTop + height
  const rightX = points[points.length - 1].x
  const leftX = points[0].x
  return `${linePath} L ${rightX.toFixed(1)},${bottomY} L ${leftX.toFixed(1)},${bottomY} Z`
}

// ===== DONUT CHARTS TABBED (Tremor Donut Chart #3) =====
interface BreakdownData {
  name: string
  plays: number
  share: string
}

interface DonutChartsTabbedProps {
  byPlayer: BreakdownData[]
  byHour: BreakdownData[]
  byGenre: BreakdownData[]
}

function DonutChartsTabbed({ byPlayer, byHour, byGenre }: DonutChartsTabbedProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'hour' | 'genre'>('player')

  const tabs = [
    { id: 'player' as const, label: 'By Player', data: byPlayer },
    { id: 'hour' as const, label: 'By Hour', data: byHour },
    { id: 'genre' as const, label: 'By Genre', data: byGenre },
  ]

  const currentData = tabs.find(t => t.id === activeTab)?.data || []

  return (
    <div className={VIKING_DESIGN.components.cardContent}>
      <div className="mb-4">
        <h2 className={VIKING_TYPOGRAPHY.heading.m}>Breakdown</h2>
        <p className={cn(VIKING_TYPOGRAPHY.body.s, "mt-1")}>
          Distribution of plays across different categories
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 text-xs font-semibold px-3 py-2 rounded-md transition-all",
              activeTab === tab.id
                ? "bg-viking-purple text-white"
                : "text-viking-text-tertiary hover:text-viking-text-secondary hover:bg-viking-bg-tertiary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Donut Chart */}
      <DonutChartSimple data={currentData} />

      {/* Legend */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between text-xs text-viking-text-tertiary mb-2">
          <span>Category</span>
          <span>Plays / Share</span>
        </div>
        {currentData.map((item, idx) => {
          const colors = ['bg-viking-purple', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500']
          const color = colors[idx % colors.length]
          
          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 truncate">
                <span className={cn(color, "w-2.5 h-2.5 rounded-sm shrink-0")} />
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium">{item.plays.toLocaleString()}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-medium",
                  "bg-viking-bg-tertiary text-viking-text-secondary"
                )}>
                  {item.share}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===== SIMPLE DONUT CHART =====
function DonutChartSimple({ data }: { data: BreakdownData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-viking-text-tertiary">
        No data available
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.plays, 0)
  const colors = ['#6366f1', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'] // viking-purple, blue, indigo, violet, fuchsia

  let cumulativePercent = 0

  return (
    <div className="flex justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {data.map((item, idx) => {
          const percent = (item.plays / total) * 100
          const startAngle = (cumulativePercent / 100) * 360
          const endAngle = ((cumulativePercent + percent) / 100) * 360
          
          cumulativePercent += percent

          const startRad = (startAngle - 90) * (Math.PI / 180)
          const endRad = (endAngle - 90) * (Math.PI / 180)
          
          const x1 = 80 + 60 * Math.cos(startRad)
          const y1 = 80 + 60 * Math.sin(startRad)
          const x2 = 80 + 60 * Math.cos(endRad)
          const y2 = 80 + 60 * Math.sin(endRad)
          
          const largeArcFlag = percent > 50 ? 1 : 0
          
          const pathData = [
            `M 80 80`,
            `L ${x1} ${y1}`,
            `A 60 60 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ')

          return (
            <path
              key={item.name}
              d={pathData}
              fill={colors[idx % colors.length]}
              opacity={0.8}
              className="hover:opacity-100 transition-opacity"
            >
              <title>{item.name}: {item.plays} plays ({item.share})</title>
            </path>
          )
        })}
        
        {/* Center hole */}
        <circle cx="80" cy="80" r="40" fill="#0f172a" />
      </svg>
    </div>
  )
}

// ===== SKELETON =====
function OverviewSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className={cn("h-8 w-48 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn("h-96 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
        ))}
      </div>
    </div>
  )
}

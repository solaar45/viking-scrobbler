import { useEffect, useState } from 'react'
import { BarChart3, Music, Clock, TrendingUp, TrendingDown, Timer } from 'lucide-react'
import { VIKING_DESIGN, VIKING_TYPOGRAPHY, cn } from '@/lib/design-tokens'
import { getCoverUrl } from '@/lib/cover-utils'

interface DashboardStats {
  total_plays: number
  unique_artists: number
  unique_tracks: number
  unique_albums: number
  total_listening_time: string
  avg_per_day: number
  current_streak: number
  peak_day: string | null
  peak_value: number
  most_active_day: string | null
  top_artist: { name: string; plays: number; additional_info?: any }
  top_track: { name: string; artist: string; plays: number; additional_info?: any }
  top_album: { name: string; artist: string; plays: number; additional_info?: any }
  recent_activity: Array<{ date: string; plays: number }>
  hourly_activity?: Array<{ hour: number; plays: number }>
}

interface LifetimeStats {
  total_plays: number
  unique_artists: number
  unique_tracks: number
  unique_albums: number
  avg_per_day: number
  current_streak: number
}

type TrendInfo = {
  value?: number
  label: string
}

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

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all_time'>('all_time')

  useEffect(() => {
    loadStats()
  }, [timeRange])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Filtered stats
      const resp = await fetch(`/api/stats/overview?range=${timeRange}`)
      if (!resp.ok) throw new Error(`Failed to load overview: ${resp.status}`)
      const body = await resp.json()
      
      console.log('📊 Overview API Response:', body)

      // Lifetime stats for trends
      const lifetimeResp = await fetch(`/api/stats/overview?range=all_time`)
      const lifetimeBody = lifetimeResp.ok ? await lifetimeResp.json() : null

      // Process recent activity
      const recent = (body.recent_activity || []).map((r: any) => ({
        date: r.date && r.date.length ? new Date(r.date).toISOString() : new Date().toISOString(),
        plays: r.plays || 0
      }))

      // Mock hourly activity (replace with real API)
      const hourly = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        plays: Math.floor(Math.random() * 50) + 10
      }))

      setStats({
        total_plays: body.total_plays || 0,
        unique_artists: body.unique_artists || 0,
        unique_tracks: body.unique_tracks || 0,
        unique_albums: body.unique_albums || 0,
        total_listening_time: body.total_listening_time || '0h 0m',
        avg_per_day: body.avg_per_day || 0,
        current_streak: body.current_streak || 0,
        peak_day: body.peak_day || null,
        peak_value: body.peak_value || 0,
        most_active_day: body.most_active_day || null,
        top_artist: body.top_artist || { name: 'N/A', plays: 0 },
        top_track: body.top_track || { name: 'N/A', artist: 'N/A', plays: 0 },
        top_album: body.top_album || { name: 'N/A', artist: 'N/A', plays: 0 },
        recent_activity: recent,
        hourly_activity: hourly
      })

      if (lifetimeBody) {
        setLifetime({
          total_plays: lifetimeBody.total_plays || 0,
          unique_artists: lifetimeBody.unique_artists || 0,
          unique_tracks: lifetimeBody.unique_tracks || 0,
          unique_albums: lifetimeBody.unique_albums || 0,
          avg_per_day: lifetimeBody.avg_per_day || 0,
          current_streak: lifetimeBody.current_streak || 0,
        })
      }
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

  const trendLabel = getTrendLabel(timeRange)
  const trends = {
    plays: calculateTrend(stats.total_plays, lifetime?.total_plays),
    artists: calculateTrend(stats.unique_artists, lifetime?.unique_artists),
    tracks: calculateTrend(stats.unique_tracks, lifetime?.unique_tracks),
    albums: calculateTrend(stats.unique_albums, lifetime?.unique_albums),
    avgPerDay: calculateTrend(stats.avg_per_day, lifetime?.avg_per_day),
    streak: calculateTrend(stats.current_streak, lifetime?.current_streak),
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <BarChart3 className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_TYPOGRAPHY.heading.xl}>Overview</h1>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2">
          <span className={VIKING_TYPOGRAPHY.label.default}>Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className={cn(
              "px-3 py-2 rounded-lg",
              VIKING_TYPOGRAPHY.body.m,
              VIKING_DESIGN.colors.card.elevated,
              VIKING_DESIGN.colors.text.primary,
              "border border-viking-border-default",
              "focus:outline-none focus:ring-2 focus:ring-viking-purple",
              VIKING_DESIGN.effects.transition.base
            )}
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
            <option value="all_time">All Time</option>
          </select>
        </div>
      </div>

      {/* HERO SECTION - Bento Grid with Large Covers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* TOP ARTIST - Large (spans 6 cols) */}
        <HeroCard
          type="artist"
          name={stats.top_artist.name}
          plays={stats.top_artist.plays}
          item={stats.top_artist}
          coverSize={240}
          className="lg:col-span-6"
        />

        {/* RIGHT COLUMN (spans 6 cols) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* TOP TRACK */}
          <HeroCard
            type="track"
            name={stats.top_track.name}
            subtitle={stats.top_track.artist}
            plays={stats.top_track.plays}
            item={stats.top_track}
            coverSize={180}
          />

          {/* TOP ALBUM */}
          <HeroCard
            type="album"
            name={stats.top_album.name}
            subtitle={stats.top_album.artist}
            plays={stats.top_album.plays}
            item={stats.top_album}
            coverSize={180}
          />

          {/* LISTENING TIME CARD */}
          <div className={cn(
            VIKING_DESIGN.components.card,
            "sm:col-span-2 p-6 flex items-center justify-between"
          )}>
            <div>
              <p className={cn(VIKING_TYPOGRAPHY.label.inline, "mb-2")}>
                Total Listening Time
              </p>
              <p className={VIKING_TYPOGRAPHY.display.l}>{stats.total_listening_time}</p>
            </div>
            <div className={cn("p-3 rounded-lg", VIKING_DESIGN.colors.card.elevated)}>
              <Timer className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 8 KPI CARDS - Compact Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <MetricCard
          label="Plays"
          value={stats.total_plays}
          trend={trends.plays !== undefined ? { value: trends.plays, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Artists"
          value={stats.unique_artists}
          trend={trends.artists !== undefined ? { value: trends.artists, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Songs"
          value={stats.unique_tracks}
          trend={trends.tracks !== undefined ? { value: trends.tracks, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Albums"
          value={stats.unique_albums}
          trend={trends.albums !== undefined ? { value: trends.albums, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Daily Avg"
          value={stats.avg_per_day}
          unit="tracks"
          trend={trends.avgPerDay !== undefined ? { value: trends.avgPerDay, label: trendLabel } : undefined}
        />
        <MetricCard
          label="Top Day"
          valueStr={stats.most_active_day}
        />
        <MetricCard
          label="Best Day"
          valueStr={stats.peak_day}
        />
        <MetricCard
          label="Streak"
          value={stats.current_streak}
          unit="days"
          trend={trends.streak !== undefined ? { value: trends.streak, label: trendLabel } : undefined}
        />
      </div>

      {/* ACTIVITY VISUALIZATION - 2/3 Chart + 1/3 Clock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* LISTENING ACTIVITY CHART (2/3) */}
        <div className={cn(VIKING_DESIGN.components.card, "lg:col-span-2")}>
          <div className={VIKING_DESIGN.components.cardContent}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={VIKING_TYPOGRAPHY.heading.m}>
                <TrendingUp className="inline w-5 h-5 mr-2 text-viking-purple" />
                Listening Activity
              </h2>
              <span className={VIKING_TYPOGRAPHY.label.inline}>Last 30 Days</span>
            </div>
            <AreaChart data={stats.recent_activity} />
          </div>
        </div>

        {/* 24H LISTENING CLOCK (1/3) */}
        <div className={VIKING_DESIGN.components.card}>
          <div className={VIKING_DESIGN.components.cardContent}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={VIKING_TYPOGRAPHY.heading.m}>
                <Clock className="inline w-5 h-5 mr-2 text-viking-purple" />
                Peak Hours
              </h2>
            </div>
            <ClockHeatmap data={stats.hourly_activity || []} />
          </div>
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
  // Pass complete item to getCoverUrl so it can extract artist/album names
  const coverUrl = getCoverUrl(item, coverSize)
  const typeLabels = { artist: 'TOP ARTIST', track: 'TOP TRACK', album: 'TOP ALBUM' }
  
  console.log(`🎨 Cover URL for ${type} "${name}":`, coverUrl)

  return (
    <div className={cn(
      VIKING_DESIGN.components.card,
      "p-6 flex flex-col gap-4 group",
      VIKING_DESIGN.effects.transition.base,
      "hover:shadow-xl",
      className
    )}>
      <div className="flex items-start justify-between">
        <span className={VIKING_TYPOGRAPHY.label.inline}>{typeLabels[type]}</span>
        <span className="text-3xl">🥇</span>
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
          {coverUrl ? (
            <img 
              src={coverUrl} 
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error(`❌ Failed to load cover for ${name}:`, coverUrl)
                e.currentTarget.style.display = 'none'
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

// ===== METRIC CARD =====
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

// ===== AREA CHART =====
function AreaChart({ data }: { data: Array<{ date: string; plays: number }> }) {
  if (data.length === 0) return <div className="h-48 flex items-center justify-center text-viking-text-tertiary">No data</div>

  const maxPlays = Math.max(...data.map(d => d.plays), 1)

  return (
    <div className="relative h-48">
      <svg viewBox="0 0 800 200" className="w-full h-full">
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <path
          d={generateAreaPath(data, maxPlays, 800, 200)}
          fill="url(#areaGradient)"
        />
        
        {/* Line */}
        <path
          d={generateLinePath(data, maxPlays, 800, 200)}
          fill="none"
          stroke="rgb(99, 102, 241)"
          strokeWidth="2"
        />
        
        {/* Data points */}
        {data.map((item, i) => {
          const x = (i / (data.length - 1)) * 800
          const y = 200 - (item.plays / maxPlays) * 180
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="rgb(99, 102, 241)"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{item.date}: {item.plays} plays</title>
            </circle>
          )
        })}      </svg>
    </div>
  )
}

function generateLinePath(data: Array<{ plays: number }>, max: number, width: number, height: number): string {
  if (data.length === 0) return ''
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (d.plays / max) * (height * 0.9)
    return `${x},${y}`
  })
  return `M ${points.join(' L ')}`
}

function generateAreaPath(data: Array<{ plays: number }>, max: number, width: number, height: number): string {
  if (data.length === 0) return ''
  const linePath = generateLinePath(data, max, width, height)
  return `${linePath} L ${width},${height} L 0,${height} Z`
}

// ===== CLOCK HEATMAP =====
function ClockHeatmap({ data }: { data: Array<{ hour: number; plays: number }> }) {
  const maxPlays = Math.max(...data.map(d => d.plays), 1)
  const radius = 80
  const centerX = 100
  const centerY = 100

  return (
    <div className="relative h-48 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Clock circle segments */}
        {data.map((item) => {
          const intensity = item.plays / maxPlays
          const color = `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`
          
          return (
            <g key={item.hour}>
              <path
                d={describeArc(centerX, centerY, radius - 20, radius, (item.hour * 15) - 90, (item.hour * 15) - 90 + 14)}
                fill={color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>{item.hour}:00 - {item.plays} plays</title>
              </path>
            </g>
          )
        })}
        
        {/* Center label */}
        <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" className="fill-viking-text-primary text-xl font-bold">
          24h
        </text>
      </svg>
    </div>
  )
}

function describeArc(x: number, y: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number): string {
  const start1 = polarToCartesian(x, y, outerRadius, endAngle)
  const end1 = polarToCartesian(x, y, outerRadius, startAngle)
  const start2 = polarToCartesian(x, y, innerRadius, endAngle)
  const end2 = polarToCartesian(x, y, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', start1.x, start1.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, end1.x, end1.y,
    'L', end2.x, end2.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, start2.x, start2.y,
    'Z'
  ].join(' ')
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees) * Math.PI / 180.0
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  }
}

// ===== SKELETON =====
function OverviewSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className={cn("h-8 w-48 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className={cn("lg:col-span-6 h-80 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
        <div className="lg:col-span-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn("h-40 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
          ))}
        </div>
      </div>
    </div>
  )
}

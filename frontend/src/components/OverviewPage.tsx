import { useEffect, useState } from 'react'
import { BarChart3, Music, Users, Disc, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { VIKING_DESIGN, cn } from '@/lib/design-tokens'

interface DashboardStats {
  total_plays: number
  unique_artists: number
  unique_albums: number
  total_listening_time: string
  top_artist: { name: string; plays: number }
  top_track: { name: string; artist: string; plays: number }
  top_album: { name: string; artist: string; plays: number }
  recent_activity: Array<{ date: string; plays: number }>
}

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all_time'>('all_time')

  useEffect(() => {
    loadStats()
  }, [timeRange])

  const loadStats = async () => {
    setLoading(true)
    try {
      // Mock data for now - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setStats({
        total_plays: 1856,
        unique_artists: 87,
        unique_albums: 52,
        total_listening_time: '156h 23m',
        top_artist: { name: 'Tool', plays: 342 },
        top_track: { name: 'Lateralus', artist: 'Tool', plays: 89 },
        top_album: { name: 'Lateralus', artist: 'Tool', plays: 156 },
        recent_activity: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString(),
          plays: Math.floor(Math.random() * 100) + 20
        })).reverse()
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
        <p>No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <BarChart3 className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_DESIGN.typography.title.page}>Overview</h1>
        </div>
        
        {/* Time Range Filter - ANALOG RECENT LISTENS */}
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", VIKING_DESIGN.colors.text.secondary)}>
            Time Range:
          </span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium",
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

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Music}
          title="Total Plays"
          value={stats.total_plays.toLocaleString()}
          iconColor="text-viking-purple"
        />
        <KPICard
          icon={Users}
          title="Unique Artists"
          value={stats.unique_artists.toLocaleString()}
          iconColor="text-viking-emerald"
        />
        <KPICard
          icon={Disc}
          title="Unique Albums"
          value={stats.unique_albums.toLocaleString()}
          iconColor="text-blue-400"
        />
        <KPICard
          icon={Clock}
          title="Listening Time"
          value={stats.total_listening_time}
          iconColor="text-yellow-400"
        />
      </div>

      {/* MINI PODIUM - TOP 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TopCard
          type="artist"
          medal="🥇"
          name={stats.top_artist.name}
          plays={stats.top_artist.plays}
        />
        <TopCard
          type="track"
          medal="🥇"
          name={stats.top_track.name}
          subtitle={stats.top_track.artist}
          plays={stats.top_track.plays}
        />
        <TopCard
          type="album"
          medal="🥇"
          name={stats.top_album.name}
          subtitle={stats.top_album.artist}
          plays={stats.top_album.plays}
        />
      </div>

      {/* LISTENING ACTIVITY CHART */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={VIKING_DESIGN.typography.title.card}>
              <TrendingUp className="inline w-5 h-5 mr-2 text-viking-purple" />
              Listening Activity
            </h2>
            <span className={VIKING_DESIGN.typography.subtitle}>Last 30 Days</span>
          </div>
          <SimpleLineChart data={stats.recent_activity} />
        </div>
      </div>

      {/* COMPACT TOP LISTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CompactTopList type="artists" />
        <CompactTopList type="tracks" />
      </div>
    </div>
  )
}

// ===== SUB-COMPONENTS =====

interface KPICardProps {
  icon: React.ElementType
  title: string
  value: string
  iconColor: string
}

function KPICard({ icon: Icon, title, value, iconColor }: KPICardProps) {
  return (
    <div className={cn(VIKING_DESIGN.components.card, VIKING_DESIGN.effects.transition.base, "hover:shadow-lg")}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(VIKING_DESIGN.typography.subtitle, "mb-2")}>{title}</p>
            <p className="text-3xl font-bold text-viking-text-primary">{value}</p>
          </div>
          <div className={cn("p-3 rounded-lg", VIKING_DESIGN.colors.card.elevated)}>
            <Icon className={cn("w-8 h-8", iconColor)} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface TopCardProps {
  type: 'artist' | 'track' | 'album'
  medal: string
  name: string
  subtitle?: string
  plays: number
}

function TopCard({ type, medal, name, subtitle, plays }: TopCardProps) {
  const typeIcons = {
    artist: Users,
    track: Music,
    album: Disc,
  }
  const Icon = typeIcons[type]

  return (
    <div className={cn(VIKING_DESIGN.components.card, VIKING_DESIGN.effects.transition.base, "hover:shadow-lg")}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <span className={VIKING_DESIGN.typography.subtitle}>
            {type.toUpperCase()}
          </span>
          <span className="text-3xl">{medal}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", VIKING_DESIGN.colors.card.elevated)}>
            <Icon className="w-5 h-5 text-viking-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold truncate", VIKING_DESIGN.colors.text.primary)}>
              {name}
            </p>
            {subtitle && (
              <p className={cn("text-sm truncate", VIKING_DESIGN.colors.text.tertiary)}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-viking-border-default">
          <div className="flex items-center justify-between">
            <span className={VIKING_DESIGN.typography.helper}>Plays</span>
            <span className={cn("font-mono font-bold", VIKING_DESIGN.colors.text.secondary)}>
              {plays.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CompactTopListProps {
  type: 'artists' | 'tracks'
}

function CompactTopList({ type }: CompactTopListProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [type])

  const loadData = async () => {
    setLoading(true)
    try {
      // Mock data - replace with real API
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const mockData = Array.from({ length: 5 }, (_, i) => ({
        rank: i + 1,
        name: type === 'artists' ? `Artist ${i + 1}` : `Track ${i + 1}`,
        artist: type === 'tracks' ? `Artist ${i + 1}` : undefined,
        track: type === 'tracks' ? `Track ${i + 1}` : undefined,
        plays: Math.floor(Math.random() * 200) + 50
      }))
      
      setData(mockData)
    } catch (error) {
      console.error(`Failed to load top ${type}`, error)
    } finally {
      setLoading(false)
    }
  }

  const Icon = type === 'artists' ? Users : Music

  return (
    <div className={VIKING_DESIGN.components.card}>
      <div className={VIKING_DESIGN.components.cardContent}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={VIKING_DESIGN.typography.title.card}>
            <Icon className="inline w-5 h-5 mr-2 text-viking-purple" />
            Top {type === 'artists' ? 'Artists' : 'Tracks'}
          </h3>
          <a
            href={`/statistics?tab=${type}`}
            onClick={(e) => {
              e.preventDefault()
              window.history.pushState({}, '', `/statistics?tab=${type}`)
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className={cn(
              "flex items-center gap-1 text-xs font-semibold",
              VIKING_DESIGN.colors.text.tertiary,
              "hover:text-viking-purple",
              VIKING_DESIGN.effects.transition.base
            )}
          >
            View All <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn("h-12 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  VIKING_DESIGN.colors.card.elevated,
                  VIKING_DESIGN.effects.transition.base,
                  "hover:bg-viking-bg-tertiary"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className={cn("font-mono text-xs", VIKING_DESIGN.colors.text.tertiary)}>
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold truncate", VIKING_DESIGN.colors.text.primary)}>
                      {type === 'artists' ? item.name : item.track}
                    </p>
                    {type === 'tracks' && (
                      <p className={cn("text-xs truncate", VIKING_DESIGN.colors.text.tertiary)}>
                        {item.artist}
                      </p>
                    )}
                  </div>
                </div>
                <span className={cn("font-mono text-sm font-bold ml-3", VIKING_DESIGN.colors.text.secondary)}>
                  {item.plays}↻
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SimpleLineChart({ data }: { data: Array<{ date: string; plays: number }> }) {
  const maxPlays = Math.max(...data.map(d => d.plays))
  
  return (
    <div className="relative h-48">
      <div className="flex items-end justify-between h-full gap-1">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col justify-end h-full">
              <div
                className={cn(
                  "w-full rounded-t-sm bg-gradient-to-t from-viking-purple to-viking-purple-dark",
                  VIKING_DESIGN.effects.transition.base,
                  "hover:brightness-110 cursor-pointer"
                )}
                style={{ height: `${(item.plays / maxPlays) * 100}%` }}
                title={`${item.date}: ${item.plays} plays`}
              />
            </div>
            {i % 5 === 0 && (
              <span className={cn("text-xs", VIKING_DESIGN.colors.text.tertiary)}>
                {new Date(item.date).getDate()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className={cn("h-8 w-48 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cn(VIKING_DESIGN.components.card, "p-6")}>
            <div className={cn("h-20 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cn(VIKING_DESIGN.components.card, "p-6")}>
            <div className={cn("h-32 rounded-lg", VIKING_DESIGN.colors.card.tertiary, VIKING_DESIGN.effects.loading.pulse)} />
          </div>
        ))}
      </div>
    </div>
  )
}

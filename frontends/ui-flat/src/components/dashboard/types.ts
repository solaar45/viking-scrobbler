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
  releaseYear?: string | number
  genres?: string
}

export interface DashboardStats {
  filtered: PeriodStats
  lifetime: PeriodStats
  recent: RecentListen[]
}

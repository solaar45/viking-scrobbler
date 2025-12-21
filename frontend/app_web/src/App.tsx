import { useEffect, useState } from "react";
import { TokenManager } from "./components/TokenManager";
import { StatsCard } from "./components/StatsCard";
import { RecentListens } from "./components/RecentListens";
import { ListeningActivity } from "./components/ListeningActivity";

interface Artist {
  artist_name: string;
  listen_count: number;
}

interface Recording {
  track_name: string;
  artist_name: string;
  listen_count: number;
}

interface Totals {
  total_listens: number;
  unique_artists: number;
  unique_tracks: number;
  unique_albums: number;
}

interface LifetimeStats {
  mostActiveDay: { day: string; count: number };
  avgPerDay: number;
  peakDay: { date: string; count: number };
  currentStreak: number;
}

function App() {
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [topTracks, setTopTracks] = useState<Recording[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<LifetimeStats | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [range, setRange] = useState("all_time");

  useEffect(() => {
    loadFilteredStats();
  }, [range]);

  useEffect(() => {
    loadLifetimeStats();
  }, []);

  const loadFilteredStats = () => {
    // Filtered Totals
    fetch(`/1/stats/user/viking_user/totals?range=${range}`)
      .then((res) => res.json())
      .then((data) => setTotals(data.payload))
      .catch(() => {});

    // Filtered Top Artists
    fetch(`/1/stats/user/viking_user/artists?count=10&range=${range}`)
      .then((res) => res.json())
      .then((data) => setTopArtists(data.payload?.artists || []))
      .catch(() => {});

    // Filtered Top Tracks
    fetch(`/1/stats/user/viking_user/recordings?count=10&range=${range}`)
      .then((res) => res.json())
      .then((data) => setTopTracks(data.payload?.recordings || []))
      .catch(() => {});
  };

  const loadLifetimeStats = () => {
    // Always unfiltered - uses all-time data
    fetch(`/1/user/viking_user/recent-listens?count=1000`)
      .then((res) => res.json())
      .then((data) => {
        const listens = data.payload?.listens || [];
        setLifetimeStats(calculateLifetimeStats(listens));
      })
      .catch(() => {});
  };

  const calculateLifetimeStats = (listens: any[]): LifetimeStats => {
    const dayGroups: Record<string, number> = {};
    const dateGroups: Record<string, number> = {};

    listens.forEach((listen) => {
      const date = new Date(listen.listened_at * 1000);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = date.toISOString().split("T")[0];

      dayGroups[dayName] = (dayGroups[dayName] || 0) + 1;
      dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    });

    const mostActiveDay = Object.entries(dayGroups).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: "N/A", count: 0 }
    );

    const uniqueDays = Object.keys(dateGroups).length;
    const avgPerDay = uniqueDays > 0 ? Math.round(listens.length / uniqueDays) : 0;

    const peakDay = Object.entries(dateGroups).reduce(
      (max, [date, count]) => (count > max.count ? { date, count } : max),
      { date: "N/A", count: 0 }
    );

    const sortedDates = Object.keys(dateGroups).sort().reverse();
    let streak = 0;
    
    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split("T")[0];
      
      if (sortedDates[i] === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }

    return { mostActiveDay, avgPerDay, peakDay, currentStreak: streak };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">🎵 Viking Scrobbler</h1>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
          >
            {showSetup ? "Hide Setup" : "⚙️ Setup"}
          </button>
        </div>

        {/* Setup Section */}
        {showSetup && (
          <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
            <TokenManager />
          </div>
        )}

        {/* ==================== FILTERED SECTION ==================== */}
        <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900/20 rounded-2xl p-6 border border-emerald-800/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span className="text-emerald-400">📊</span>
              Filtered Statistics
            </h2>
            <span className="text-xs text-emerald-400/60 uppercase tracking-wider">
              Changes with filter
            </span>
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <h3 className="text-sm text-slate-400 mb-3">Time Period</h3>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "week", label: "Last 7 Days" },
                { value: "month", label: "Last 30 Days" },
                { value: "year", label: "Last 365 Days" },
                { value: "all_time", label: "All Time" }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setRange(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    range === filter.value
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtered Stats Cards */}
          {totals && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Total Scrobbles"
                value={totals.total_listens}
                icon="🎵"
              />
              <StatsCard
                title="Unique Artists"
                value={totals.unique_artists}
                icon="👥"
              />
              <StatsCard
                title="Unique Tracks"
                value={totals.unique_tracks}
                icon="🎼"
              />
              <StatsCard
                title="Unique Albums"
                value={totals.unique_albums}
                icon="💿"
              />
            </div>
          )}

          {/* Filtered Listening Activity */}
          <div className="mb-6">
            <ListeningActivity range={range} />
          </div>

          {/* Filtered Top Artists & Tracks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Artists */}
            <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
              <h2 className="text-2xl font-semibold mb-4">Top Artists</h2>
              {topArtists.length > 0 ? (
                <ul className="space-y-3">
                  {topArtists.map((artist, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono text-sm w-6">
                          #{i + 1}
                        </span>
                        <span className="font-medium">{artist.artist_name}</span>
                      </div>
                      <span className="text-emerald-400 font-mono text-sm">
                        {artist.listen_count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-center py-8">No data yet</p>
              )}
            </div>

            {/* Top Tracks */}
            <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
              <h2 className="text-2xl font-semibold mb-4">Top Tracks</h2>
              {topTracks.length > 0 ? (
                <ul className="space-y-3">
                  {topTracks.map((track, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-slate-500 font-mono text-sm w-6">
                          #{i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{track.track_name}</div>
                          <div className="text-sm text-slate-400 truncate">
                            {track.artist_name}
                          </div>
                        </div>
                      </div>
                      <span className="text-emerald-400 font-mono text-sm ml-2">
                        {track.listen_count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-center py-8">No data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* ==================== LIFETIME SECTION (UNFILTERED) ==================== */}
        <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/20 rounded-2xl p-6 border border-blue-800/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <span className="text-blue-400">📌</span>
              Lifetime Statistics
            </h2>
            <span className="text-xs text-blue-400/60 uppercase tracking-wider">
              Always all-time data
            </span>
          </div>

          {/* Lifetime Stats Cards */}
          {lifetimeStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Most Active Day"
                value={lifetimeStats.mostActiveDay.day}
                icon="📅"
                subtitle={`🔥 ${lifetimeStats.mostActiveDay.count} tracks`}
              />
              <StatsCard
                title="Avg per Day"
                value={lifetimeStats.avgPerDay}
                icon="📊"
                subtitle="tracks/day"
              />
              <StatsCard
                title="Peak Day"
                value={lifetimeStats.peakDay.count}
                icon="🏆"
                subtitle={
                  lifetimeStats.peakDay.date !== "N/A"
                    ? new Date(lifetimeStats.peakDay.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"
                }
              />
              <StatsCard
                title="Current Streak"
                value={lifetimeStats.currentStreak}
                icon="🔥"
                subtitle="days in a row"
              />
            </div>
          )}

          {/* Recent Listens (always unfiltered) */}
          <RecentListens />
        </div>
      </div>
    </div>
  );
}

export default App;
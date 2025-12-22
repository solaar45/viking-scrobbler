import { useEffect, useState } from "react";
import { Activity, TrendingUp, Calendar, Flame } from "lucide-react";

interface ActivityData {
  time_range: string;
  listen_count: number;
}

interface ActivityResponse {
  listening_activity: ActivityData[];
  range: string;
  grouping: string;
}

interface Props {
  range: string;
}

interface DayStats {
  mostActiveDay: { day: string; count: number };
  avgPerDay: number;
  peakDay: { date: string; count: number };
  currentStreak: number;
}

export function ListeningActivity({ range }: Props) {
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [grouping, setGrouping] = useState<string>("daily");
  const [loading, setLoading] = useState(true);
  const [dayStats, setDayStats] = useState<DayStats | null>(null);

  useEffect(() => {
    loadData();
  }, [range]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Activity Chart Data
      const activityRes = await fetch(`/1/stats/user/viking_user/listening-activity?range=${range}`);
      const activityData: { payload: ActivityResponse } = await activityRes.json();
      setActivity(activityData.payload?.listening_activity || []);
      setGrouping(activityData.payload?.grouping || "daily");

      // Calculate day-of-week stats (only for meaningful ranges)
      if (range !== "week") {
        const statsRes = await fetch(`/1/user/viking_user/recent-listens?count=1000`);
        const statsData = await statsRes.json();
        const listens = statsData.payload?.listens || [];
        setDayStats(calculateDayStats(listens));
      }
    } catch (err) {
      console.error("Failed to load activity", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDayStats = (listens: any[]): DayStats => {
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

  const formatLabel = (timeRange: string, groupingType: string) => {
    switch (groupingType) {
      case "daily":
        return new Date(timeRange).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      
      case "weekly":
        const week = timeRange.split("-W")[1];
        return `W${week}`;
      
      case "monthly":
        const [year, month] = timeRange.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString("en-US", {
          month: "short",
        });
      
      case "yearly":
        return timeRange;
      
      default:
        return timeRange;
    }
  };

  const getGroupingLabel = (groupingType: string) => {
    switch (groupingType) {
      case "daily": return "Daily Activity";
      case "weekly": return "Weekly Activity";
      case "monthly": return "Monthly Activity";
      case "yearly": return "Yearly Activity";
      default: return "Activity";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-slate-400">
          <div className="inline-block w-8 h-8 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...activity.map((a) => a.listen_count), 1);
  const totalListens = activity.reduce((sum, a) => sum + a.listen_count, 0);
  const avgListens = activity.length > 0 ? Math.round(totalListens / activity.length) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {dayStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm text-slate-400">Most Active Day</h3>
            </div>
            <p className="text-2xl font-bold text-white">{dayStats.mostActiveDay.day}</p>
            <p className="text-sm text-slate-500 mt-1">
              🔥 {dayStats.mostActiveDay.count} tracks
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm text-slate-400">Avg per Day</h3>
            </div>
            <p className="text-2xl font-bold text-white">{dayStats.avgPerDay}</p>
            <p className="text-sm text-slate-500 mt-1">tracks/day</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm text-slate-400">Peak Day</h3>
            </div>
            <p className="text-2xl font-bold text-white">{dayStats.peakDay.count}</p>
            <p className="text-sm text-slate-500 mt-1">
              {dayStats.peakDay.date !== "N/A"
                ? new Date(dayStats.peakDay.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm text-slate-400">Current Streak</h3>
            </div>
            <p className="text-2xl font-bold text-white">{dayStats.currentStreak}</p>
            <p className="text-sm text-slate-500 mt-1">days in a row</p>
          </div>
        </div>
      )}

      {/* Mini Chart with Scrollbar */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            {getGroupingLabel(grouping)}
          </h3>
          <div className="text-sm text-slate-400">
            Avg: <span className="text-emerald-400 font-semibold">{avgListens}</span> per{" "}
            {grouping === "daily" ? "day" : grouping === "weekly" ? "week" : grouping === "monthly" ? "month" : "year"}
          </div>
        </div>

        {activity.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No activity data</p>
        ) : (
          <>
            {/* Chart Container with max height + scroll */}
            <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
              {activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 group">
                  <div className="w-20 text-xs text-slate-400 text-right flex-shrink-0">
                    {formatLabel(item.time_range, grouping)}
                  </div>
                  <div className="flex-1 h-8 bg-slate-700/30 rounded overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center px-2 transition-all duration-300 group-hover:from-emerald-500 group-hover:to-emerald-400"
                      style={{ width: `${(item.listen_count / maxCount) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">
                        {item.listen_count}
                      </span>
                    </div>
                    {item.listen_count === maxCount && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-400 text-sm">
                        🔥
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Stats Below Chart */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Total</div>
                <div className="text-lg font-semibold text-slate-200">{totalListens}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Peak</div>
                <div className="text-lg font-semibold text-emerald-400">{maxCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Periods</div>
                <div className="text-lg font-semibold text-slate-200">{activity.length}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
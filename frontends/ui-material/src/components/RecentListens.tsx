import { useEffect, useState } from "react";

interface Listen {
  listened_at: number;
  track_name: string;
  artist_name: string;
  release_name?: string;
}

export function RecentListens() {
  const [listens, setListens] = useState<Listen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/1/user/viking_user/recent-listens?count=20")
      .then((res) => res.json())
      .then((data) => {
        setListens(data.payload?.listens || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
        <h2 className="text-2xl font-semibold mb-4">Recent Listens</h2>
        <div className="text-center py-8 text-slate-400">
          <div className="inline-block w-8 h-8 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-2xl font-semibold mb-4">🎵 Recent Listens</h2>
      
      {listens.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No listens yet</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {listens.map((listen, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded flex items-center justify-center text-slate-400">
                🎵
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-100 truncate">
                  {listen.track_name}
                </div>
                <div className="text-sm text-slate-400 truncate">
                  {listen.artist_name}
                  {listen.release_name && ` • ${listen.release_name}`}
                </div>
              </div>
              <div className="flex-shrink-0 text-xs text-slate-500">
                {formatTime(listen.listened_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

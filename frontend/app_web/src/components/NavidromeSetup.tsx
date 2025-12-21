import { useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

export function NavidromeSetup() {
  const [navidromeUrl, setNavidromeUrl] = useState("http://localhost:4533");
  const [navidromeToken, setNavidromeToken] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const testConnection = async () => {
    setStatus("testing");
    try {
      const res = await fetch("/api/integrations/navidrome/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navidrome_url: navidromeUrl, navidrome_token: navidromeToken })
      });
      const data = await res.json();
      
      if (data.status === "ok") {
        setStatus("success");
        setMessage("Connection successful!");
      } else {
        setStatus("error");
        setMessage(data.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection failed");
    }
  };

  const configureNavidrome = async () => {
    setStatus("testing");
    try {
      const res = await fetch("/api/integrations/navidrome/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navidrome_url: navidromeUrl, navidrome_token: navidromeToken })
      });
      const data = await res.json();
      
      if (data.status === "ok") {
        setStatus("success");
        setMessage("Navidrome configured! Start playing music to see scrobbles.");
      } else {
        setStatus("error");
        setMessage(data.message);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Configuration failed");
    }
  };

  return (
    <div className="bg-slate-900/70 rounded-2xl p-6 border border-slate-800">
      <h2 className="text-2xl font-semibold mb-4">🎵 Connect Navidrome</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Navidrome URL</label>
          <input
            type="text"
            value={navidromeUrl}
            onChange={(e) => setNavidromeUrl(e.target.value)}
            placeholder="http://localhost:4533"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">
            API Token
            <span className="ml-2 text-xs">(Get from Navidrome Settings → Profile)</span>
          </label>
          <input
            type="password"
            value={navidromeToken}
            onChange={(e) => setNavidromeToken(e.target.value)}
            placeholder="nd_xxxxxxxxxxxxx"
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={status === "testing"}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {status === "testing" && <Loader2 className="w-4 h-4 animate-spin" />}
            Test Connection
          </button>

          <button
            onClick={configureNavidrome}
            disabled={status === "testing" || !navidromeToken}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {status === "testing" && <Loader2 className="w-4 h-4 animate-spin" />}
            Configure Scrobbling
          </button>
        </div>

        {message && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            status === "success" ? "bg-emerald-900/30 text-emerald-400" : "bg-rose-900/30 text-rose-400"
          }`}>
            {status === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

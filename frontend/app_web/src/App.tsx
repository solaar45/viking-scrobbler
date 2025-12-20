import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState<string>("loading...");

  useEffect(() => {
    fetch("http://localhost:4000/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="rounded-2xl bg-slate-900/70 px-10 py-8 shadow-xl border border-slate-800 max-w-sm w-full">
        <h1 className="text-2xl font-semibold mb-4 text-slate-50">
          Viking Scrobbler
        </h1>
        <p className="text-sm text-slate-400 mb-2">
          Backend-Status:
        </p>
        <p
          className={`text-lg font-mono ${
            status === "ok"
              ? "text-emerald-400"
              : status === "error"
              ? "text-rose-400"
              : "text-amber-300"
          }`}
        >
          {status}
        </p>
      </div>
    </div>
  );
}

export default App;

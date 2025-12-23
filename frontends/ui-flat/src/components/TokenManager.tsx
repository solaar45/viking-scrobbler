import { useState, useEffect } from "react";

interface Token {
  id: number;
  token: string;
  user_name: string;
  description: string;
  created_at: string;
  last_used: string | null;
}

export function TokenManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState<Token | null>(null);
  const [description, setDescription] = useState("API Token");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const res = await fetch("/api/tokens");
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (err) {
      console.error("Failed to load tokens", err);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: "viking_user", description: description })
      });
      const data = await res.json();

      if (data.status === "ok") {
        setNewToken(data.token);
        loadTokens();
        setDescription("API Token");
      }
    } catch (err) {
      console.error("Failed to generate token", err);
    }
  };

  const updateToken = async (id: number) => {
    try {
      await fetch(`/api/tokens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDescription })
      });
      loadTokens();
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update token", err);
    }
  };

  const deleteToken = async (id: number) => {
    if (!confirm("Delete this token? Any services using it will stop working.")) return;

    try {
      await fetch(`/api/tokens/${id}`, { method: "DELETE" });
      loadTokens();
      if (newToken?.id === id) setNewToken(null);
    } catch (err) {
      console.error("Failed to delete token", err);
    }
  };

  const copyToken = async (token: string, id: number) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = token;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err2) {
        console.error("Copy failed", err2);
        alert("Copy failed. Please copy manually: " + token);
      }
      document.body.removeChild(textArea);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="card-dense">
      {/* HEADER */}
      <div className="card-header-dense">
        <h2 className="card-title-dense">API Token Management</h2>
      </div>

      {/* CONTENT */}
      <div className="p-6 space-y-6">
        {/* GENERATE NEW TOKEN */}
        <div className="p-5 bg-viking-bg-tertiary rounded-lg border border-viking-border-default">
          <h3 className="text-base font-semibold text-viking-text-primary mb-4">Generate New Token</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Token description (e.g., Navidrome, Mobile App)"
              className="flex-1 px-4 py-2.5 bg-viking-bg-secondary border border-viking-border-default rounded-lg text-sm text-viking-text-primary placeholder:text-viking-text-tertiary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all"
            />
            <button 
              onClick={generateToken} 
              className="px-6 py-2.5 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-sm font-semibold uppercase tracking-wide shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30 transition-all"
            >
              Generate Token
            </button>
          </div>
        </div>

        {/* NEW TOKEN SUCCESS */}
        {newToken && (
          <div className="bg-viking-emerald/10 border border-viking-emerald/30 rounded-lg p-5">
            <p className="text-viking-emerald font-semibold mb-2 text-sm flex items-center gap-2">
              <span className="text-lg">✅</span> Token Generated Successfully!
            </p>
            <p className="text-sm text-viking-text-secondary mb-4">
              Copy this token now. You won't be able to see it again.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-viking-bg-secondary px-4 py-3 rounded-lg font-mono text-sm break-all select-all text-viking-text-primary border border-viking-border-default">
                {newToken.token}
              </code>
              <button 
                onClick={() => copyToken(newToken.token, newToken.id)} 
                className="px-5 py-3 bg-viking-emerald hover:bg-viking-emerald-dark text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-viking-emerald/20"
              >
                {copiedId === newToken.id ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <button 
              onClick={() => setNewToken(null)} 
              className="mt-3 text-sm text-viking-text-tertiary hover:text-viking-text-secondary transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ACTIVE TOKENS */}
        <div>
          <h3 className="text-base font-semibold text-viking-text-primary mb-4">
            Active Tokens ({tokens.length})
          </h3>

          {loading ? (
            <div className="text-center py-12 text-viking-text-tertiary text-sm">
              Loading tokens...
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-viking-text-tertiary text-sm">
              No tokens yet. Generate one to connect services.
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div 
                  key={token.id} 
                  className="bg-viking-bg-tertiary rounded-lg p-5 border border-viking-border-default hover:border-viking-border-emphasis transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      {editingId === token.id ? (
                        <div className="flex gap-2 mb-3">
                          <input 
                            type="text" 
                            value={editDescription} 
                            onChange={(e) => setEditDescription(e.target.value)} 
                            className="flex-1 px-3 py-2 bg-viking-bg-secondary border border-viking-border-default rounded text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50" 
                            autoFocus 
                          />
                          <button 
                            onClick={() => updateToken(token.id)} 
                            className="px-4 py-2 bg-viking-purple hover:bg-viking-purple-dark text-white rounded text-sm font-semibold transition-all"
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setEditingId(null)} 
                            className="px-4 py-2 border border-viking-border-emphasis rounded text-sm text-viking-text-secondary hover:bg-viking-bg-elevated transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-base text-viking-text-primary mb-3">
                          {token.description}
                        </h4>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 text-xs font-mono bg-viking-bg-secondary px-3 py-2.5 rounded border border-viking-border-default break-all select-all text-viking-text-secondary">
                          {token.token}
                        </code>
                        <button 
                          onClick={() => copyToken(token.token, token.id)} 
                          className="px-4 py-2.5 text-xs bg-viking-purple hover:bg-viking-purple-dark text-white rounded font-semibold transition-all whitespace-nowrap"
                        >
                          {copiedId === token.id ? "✓ Copied!" : "Copy"}
                        </button>
                      </div>

                      <div className="flex gap-4 text-xs text-viking-text-tertiary">
                        <span>Created: {formatDate(token.created_at)}</span>
                        <span>Last Used: {formatDate(token.last_used)}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 ml-4">
                      {editingId !== token.id && (
                        <button 
                          onClick={() => { setEditingId(token.id); setEditDescription(token.description); }} 
                          className="text-sm text-viking-text-secondary hover:text-viking-purple transition-colors font-medium"
                        >
                          Edit
                        </button>
                      )}
                      <button 
                        onClick={() => deleteToken(token.id)} 
                        className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

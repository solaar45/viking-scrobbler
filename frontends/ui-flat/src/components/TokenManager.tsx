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
    <div className="bg-white rounded-2xl p-6 border">
      <h2 className="text-2xl font-semibold mb-6">API Token Management</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Generate New Token</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Token description (e.g., Navidrome, Mobile App)"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none"
          />
          <button onClick={generateToken} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
            Generate Token
          </button>
        </div>
      </div>

      {newToken && (
        <div className="mb-6 bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-green-700 font-semibold mb-2">✅ Token Generated Successfully!</p>
          <p className="text-sm text-gray-600 mb-3">Copy this token now. You won't be able to see it again.</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-100 px-4 py-3 rounded font-mono text-sm break-all select-all">{newToken.token}</code>
            <button onClick={() => copyToken(newToken.token, newToken.id)} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {copiedId === newToken.id ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={() => setNewToken(null)} className="mt-3 text-sm text-gray-500">Dismiss</button>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium mb-3">Active Tokens ({tokens.length})</h3>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tokens yet. Generate one to connect services.</div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div key={token.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    {editingId === token.id ? (
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="flex-1 px-3 py-1 border rounded" autoFocus />
                        <button onClick={() => updateToken(token.id)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 border rounded text-sm">Cancel</button>
                      </div>
                    ) : (
                      <h4 className="font-medium text-gray-800 mb-2">{token.description}</h4>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <code className="flex-1 text-xs font-mono bg-gray-100 px-3 py-2 rounded break-all select-all">{token.token}</code>
                      <button onClick={() => copyToken(token.token, token.id)} className="px-3 py-2 text-xs bg-indigo-600 text-white rounded">{copiedId === token.id ? "✓ Copied!" : "Copy"}</button>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Created: {formatDate(token.created_at)}</span>
                      <span>Last Used: {formatDate(token.last_used)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {editingId !== token.id && (
                      <button onClick={() => { setEditingId(token.id); setEditDescription(token.description); }} className="text-sm text-gray-600">Edit</button>
                    )}
                    <button onClick={() => deleteToken(token.id)} className="text-sm text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

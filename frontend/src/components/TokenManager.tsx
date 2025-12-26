import { useState, useEffect } from "react";
import { VIKING_DESIGN, cn, getButtonClasses } from "@/lib/design-tokens";

interface Token {
  id: number;
  token: string;
  user_name: string;
  description: string;
  created_at: string;
  last_used: string | null;
}

interface DateTimeFormats {
  dateFormat: string;
  timeFormat: string;
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

    const handleFormatChange = () => {
      setTokens((prev) => [...prev]);
    };

    window.addEventListener('datetime-format-changed', handleFormatChange);
    return () => {
      window.removeEventListener('datetime-format-changed', handleFormatChange);
    };
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

  const getDateTimeFormats = (): DateTimeFormats => {
    const saved = localStorage.getItem("datetime_formats");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      dateFormat: 'DD.MM.YYYY',
      timeFormat: 'HH:mm'
    };
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "Never";

    const formats = getDateTimeFormats();
    const d = new Date(dateStr);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthName = d.toLocaleString('en', { month: 'short' });

    const formattedDate = formats.dateFormat
      .replace('MMM', monthName)
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2));

    const hours24 = d.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';

    const formattedTime = formats.timeFormat
      .replace('HH', String(hours24).padStart(2, '0'))
      .replace('h', String(hours12))
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('a', ampm);

    return `${formattedDate} ${formattedTime}`;
  };

  return (
    <>
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <h2 className={VIKING_DESIGN.typography.title.card}>API Token Management</h2>
          <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
          <span className={VIKING_DESIGN.layouts.header.subtitle}>
            Manage personal API tokens for external services
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          {/* GENERATE NEW TOKEN */}
          <div className={VIKING_DESIGN.components.alert.info}>
            <h3 className={cn(
              "text-base font-semibold mb-4",
              VIKING_DESIGN.colors.text.primary
            )}>
              Generate New Token
            </h3>
            <div className={cn("flex", VIKING_DESIGN.spacing.inlineGap.medium)}>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Token description (e.g., Navidrome, Mobile App)"
                className={cn(VIKING_DESIGN.components.input.base, "flex-1")}
              />
              <button
                onClick={generateToken}
                className={getButtonClasses('primary')}
              >
                Generate Token
              </button>
            </div>
          </div>

          {/* NEW TOKEN SUCCESS */}
          {newToken && (
            <div className={VIKING_DESIGN.components.alert.success}>
              <p className={cn(
                "font-semibold mb-2 text-sm flex items-center",
                VIKING_DESIGN.spacing.inlineGap.small,
                VIKING_DESIGN.colors.status.success.text
              )}>
                <span className="text-lg">✅</span> Token Generated Successfully!
              </p>
              <p className={cn("text-sm mb-4", VIKING_DESIGN.colors.text.secondary)}>
                Copy this token now. You won&apos;t be able to see it again.
              </p>
              <div className={cn("flex", VIKING_DESIGN.spacing.inlineGap.small)}>
                <code className={cn(VIKING_DESIGN.components.code, "flex-1")}>
                  {newToken.token}
                </code>
                <button
                  onClick={() => copyToken(newToken.token, newToken.id)}
                  className={cn(
                    getButtonClasses('primary'),
                    "whitespace-nowrap"
                  )}
                >
                  {copiedId === newToken.id ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setNewToken(null)}
                className={cn(
                  "mt-3 text-sm",
                  VIKING_DESIGN.colors.text.tertiary,
                  "hover:text-viking-text-secondary",
                  VIKING_DESIGN.effects.transition.base
                )}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ACTIVE TOKENS */}
          <div>
            <h3 className={cn(
              "text-base font-semibold mb-4",
              VIKING_DESIGN.colors.text.primary
            )}>
              Active Tokens ({tokens.length})
            </h3>

            {loading ? (
              <div className={cn(
                "text-center py-12 text-sm",
                VIKING_DESIGN.colors.text.tertiary
              )}>
                Loading tokens...
              </div>
            ) : tokens.length === 0 ? (
              <div className={cn(
                "text-center py-12 text-sm",
                VIKING_DESIGN.colors.text.tertiary
              )}>
                No tokens yet. Generate one to connect services.
              </div>
            ) : (
              <div className={VIKING_DESIGN.spacing.elementSpacing}>
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className={cn(
                      VIKING_DESIGN.colors.card.tertiary,
                      "rounded-lg p-5 border",
                      VIKING_DESIGN.colors.border.default,
                      "hover:border-viking-border-emphasis",
                      VIKING_DESIGN.effects.transition.base
                    )}
                  >
                    <div className={cn(
                      "flex items-start justify-between mb-4"
                    )}>
                      <div className="flex-1 min-w-0">
                        {editingId === token.id ? (
                          <div className={cn(
                            "flex mb-3",
                            VIKING_DESIGN.spacing.inlineGap.small
                          )}>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className={cn(
                                VIKING_DESIGN.components.input.base,
                                "flex-1"
                              )}
                              autoFocus
                            />
                            <button
                              onClick={() => updateToken(token.id)}
                              className={getButtonClasses('primary')}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className={getButtonClasses('secondary')}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <h4 className={cn(
                            "font-semibold text-base mb-3",
                            VIKING_DESIGN.colors.text.primary
                          )}>
                            {token.description}
                          </h4>
                        )}

                        <div className={cn(
                          "flex items-center mb-3",
                          VIKING_DESIGN.spacing.inlineGap.small
                        )}>
                          <code className={cn(
                            "flex-1 text-xs",
                            VIKING_DESIGN.typography.code,
                            VIKING_DESIGN.colors.card.base,
                            "px-3 py-2.5 rounded break-all select-all",
                            VIKING_DESIGN.colors.text.secondary
                          )}>
                            {token.token}
                          </code>
                          <button
                            onClick={() => copyToken(token.token, token.id)}
                            className={cn(
                              getButtonClasses('primary'),
                              "text-xs whitespace-nowrap"
                            )}
                          >
                            {copiedId === token.id ? "✓ Copied!" : "Copy"}
                          </button>
                        </div>

                        <div className={cn(
                          "flex gap-4 text-xs",
                          VIKING_DESIGN.colors.text.tertiary
                        )}>
                          <span>Created: {formatDate(token.created_at)}</span>
                          <span>Last Used: {formatDate(token.last_used)}</span>
                        </div>
                      </div>

                      <div className={cn("flex ml-4", VIKING_DESIGN.spacing.inlineGap.medium)}>
                        {editingId !== token.id && (
                          <button
                            onClick={() => {
                              setEditingId(token.id)
                              setEditDescription(token.description)
                            }}
                            className={getButtonClasses('ghost')}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteToken(token.id)}
                          className={cn(
                            "text-sm font-medium",
                            VIKING_DESIGN.colors.status.error.text,
                            "hover:text-red-300",
                            VIKING_DESIGN.effects.transition.base
                          )}
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
    </>
  );
}

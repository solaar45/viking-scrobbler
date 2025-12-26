import { useState, useEffect } from 'react'
import { Check, X, RefreshCw } from 'lucide-react'
import { VIKING_DESIGN, cn, getButtonClasses, getBadgeClasses } from '@/lib/design-tokens'

interface NavidromeStatus {
    connected: boolean
    url?: string
    username?: string
    source?: 'manual' | 'auto' | 'none'
    last_verified?: string
}

export function NavidromeSetup() {
    const [status, setStatus] = useState<NavidromeStatus>({ connected: false, source: 'none' })
    const [showSetup, setShowSetup] = useState(false)
    const [loading, setLoading] = useState(false)

    const [url, setUrl] = useState('http://192.168.0.161:4533')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        fetchStatus()
    }, [])

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/navidrome/status')
            const data = await response.json()
            setStatus(data)
        } catch (error) {
            console.error('Failed to fetch Navidrome status', error)
        }
    }

    const handleConnect = async () => {
        setTestStatus('testing')
        setErrorMessage('')

        try {
            const response = await fetch('/api/navidrome/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, username, password })
            })

            const data = await response.json()

            if (response.ok) {
                setTestStatus('success')
                setShowSetup(false)
                fetchStatus()
            } else {
                setTestStatus('error')
                setErrorMessage(data.error || 'Connection failed')
            }
        } catch (error) {
            setTestStatus('error')
            setErrorMessage('Network error')
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('Disconnect from Navidrome? Genres will no longer be fetched from ID3 tags.')) {
            return
        }

        setLoading(true)
        try {
            await fetch('/api/navidrome/disconnect', { method: 'DELETE' })
            fetchStatus()
        } finally {
            setLoading(false)
        }
    }

    if (status.connected) {
        return (
            <>
                {/* HEADER */}
                <div className={VIKING_DESIGN.layouts.header.wrapper}>
                    <div className={VIKING_DESIGN.layouts.header.title}>
                        <h3 className={VIKING_DESIGN.typography.title.card}>Connect Navidrome</h3>
                        <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
                        <span className={VIKING_DESIGN.layouts.header.subtitle}>
                            Optional – Enables ID3 genre tagging
                        </span>
                        {/* Status Badge: Connected */}
                        <div className={getBadgeClasses('success')}>
                            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                            <span className={cn(
                                "text-[10px] font-bold tracking-widest uppercase",
                                VIKING_DESIGN.colors.status.success.text
                            )}>
                                Connected
                            </span>
                        </div>
                    </div>
                </div>

                {/* CARD */}
                <div className={VIKING_DESIGN.components.card}>
                    <div className={VIKING_DESIGN.components.cardContent}>
                        <div className={cn(
                            VIKING_DESIGN.colors.card.elevated,
                            "rounded-lg p-4 border",
                            VIKING_DESIGN.colors.border.default
                        )}>
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className={cn("flex items-center", VIKING_DESIGN.spacing.inlineGap.small)}>
                                        <span className={VIKING_DESIGN.layouts.header.subtitle}>
                                            URL
                                        </span>
                                        <span className={cn(
                                            "text-sm",
                                            VIKING_DESIGN.typography.code,
                                            VIKING_DESIGN.colors.text.primary
                                        )}>
                                            {status.url}
                                        </span>
                                    </div>
                                    <div className={cn("flex items-center", VIKING_DESIGN.spacing.inlineGap.small)}>
                                        <span className={VIKING_DESIGN.layouts.header.subtitle}>
                                            User
                                        </span>
                                        <span className={cn(
                                            "text-sm",
                                            VIKING_DESIGN.typography.code,
                                            VIKING_DESIGN.colors.text.primary
                                        )}>
                                            {status.username}
                                        </span>
                                    </div>
                                    <div className={cn("flex items-center", VIKING_DESIGN.spacing.inlineGap.small)}>
                                        <span className={VIKING_DESIGN.layouts.header.subtitle}>
                                            Source
                                        </span>
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            VIKING_DESIGN.colors.status.success.text
                                        )}>
                                            {status.source === "auto"
                                                ? "🤖 Auto-Discovered"
                                                : "✋ Manually Configured"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                    className={getButtonClasses('destructive', loading)}
                                >
                                    {loading ? "Disconnecting..." : "Disconnect"}
                                </button>
                            </div>
                        </div>

                        <div className={VIKING_DESIGN.typography.helper}>
                            ✅ Genres are automatically fetched from your ID3 tags
                        </div>
                    </div>
                </div>
            </>
        )
    }

    if (!showSetup) {
        return (
            <>
                {/* HEADER */}
                <div className={VIKING_DESIGN.layouts.header.wrapper}>
                    <div className={VIKING_DESIGN.layouts.header.title}>
                        <h3 className={VIKING_DESIGN.typography.title.card}>Connect Navidrome</h3>
                        <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
                        <span className={VIKING_DESIGN.layouts.header.subtitle}>
                            Optional – Enables ID3 genre tagging
                        </span>
                        {/* Status Badge: Not Connected */}
                        <div className={getBadgeClasses('error')}>
                            <span className="h-2 w-2 rounded-full bg-red-400"></span>
                            <span className={cn(
                                "text-[10px] font-bold tracking-widest uppercase",
                                VIKING_DESIGN.colors.status.error.text
                            )}>
                                Not Connected
                            </span>
                        </div>
                    </div>
                </div>

                {/* CARD */}
                <div className={VIKING_DESIGN.components.card}>
                    <div className={VIKING_DESIGN.components.cardContent}>
                        <p className={cn("text-sm mb-4", VIKING_DESIGN.colors.text.secondary)}>
                            Connect your Navidrome instance to automatically fetch genres from your music
                            library&apos;s ID3 tags.
                        </p>

                        <button
                            onClick={() => setShowSetup(true)}
                            className={cn(getButtonClasses('primary'), "w-full")}
                        >
                            Setup Connection
                        </button>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {/* HEADER */}
            <div className={VIKING_DESIGN.layouts.header.wrapper}>
                <div className={VIKING_DESIGN.layouts.header.title}>
                    <h3 className={VIKING_DESIGN.typography.title.card}>Connect Navidrome</h3>
                    <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
                    <span className={VIKING_DESIGN.layouts.header.subtitle}>
                        Optional – Enables ID3 genre tagging
                    </span>
                </div>

                <button
                    onClick={() => setShowSetup(false)}
                    className={cn(
                        VIKING_DESIGN.colors.text.tertiary,
                        "hover:text-viking-text-primary flex items-center text-xs font-semibold uppercase tracking-wider",
                        VIKING_DESIGN.spacing.inlineGap.small,
                        VIKING_DESIGN.effects.transition.base
                    )}
                >
                    Cancel
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* CARD */}
            <div className={VIKING_DESIGN.components.card}>
                <div className={VIKING_DESIGN.components.cardContent}>
                    <div className={VIKING_DESIGN.layouts.form.field}>
                        <label className={VIKING_DESIGN.typography.label.base}>
                            Navidrome URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className={VIKING_DESIGN.components.input.base}
                            placeholder="http://192.168.0.161:4533"
                        />
                        <p className={VIKING_DESIGN.typography.helper}>
                            The URL where your Navidrome instance is running
                        </p>
                    </div>

                    <div className={VIKING_DESIGN.layouts.form.field}>
                        <label className={VIKING_DESIGN.typography.label.base}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className={VIKING_DESIGN.components.input.base}
                            placeholder="your_username"
                        />
                    </div>

                    <div className={VIKING_DESIGN.layouts.form.field}>
                        <label className={VIKING_DESIGN.typography.label.base}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={VIKING_DESIGN.components.input.base}
                            placeholder="••••••••"
                        />
                        <p className={VIKING_DESIGN.typography.helper}>
                            🔒 Password is encrypted and stored securely
                        </p>
                    </div>

                    <button
                        onClick={handleConnect}
                        disabled={testStatus === "testing" || !url || !username || !password}
                        className={cn(
                            getButtonClasses('primary', testStatus === "testing" || !url || !username || !password),
                            "w-full flex items-center justify-center",
                            VIKING_DESIGN.spacing.inlineGap.small
                        )}
                    >
                        {testStatus === "testing" && (
                            <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
                        )}
                        {testStatus === "testing" ? "Testing Connection..." : "Connect"}
                    </button>

                    {testStatus === "success" && (
                        <div className={cn(
                            VIKING_DESIGN.components.alert.success,
                            "flex items-center",
                            VIKING_DESIGN.spacing.inlineGap.small
                        )}>
                            <Check className="w-5 h-5" />
                            <span>✅ Connected! Genres will now be fetched from your ID3 tags.</span>
                        </div>
                    )}

                    {testStatus === "error" && (
                        <div className={cn(
                            VIKING_DESIGN.components.alert.error,
                            "flex items-center",
                            VIKING_DESIGN.spacing.inlineGap.small
                        )}>
                            <X className="w-5 h-5" />
                            <span>
                                ❌ {errorMessage || "Connection failed. Check URL and credentials."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

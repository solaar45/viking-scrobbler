"use client"

import { useState, useEffect } from "react"
import { Trash2, Copy, Check, Calendar, Clock } from "lucide-react"

// --- TYPES ---
interface DateTimeFormats {
  dateFormat: string
  timeFormat: string
}

const DATE_FORMATS = [
  { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '23.12.2024', region: '🇩🇪 Europe' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '23/12/2024', region: '🇬🇧 UK' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/23/2024', region: '🇺🇸 US' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-23', region: '🌐 ISO' },
  { id: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '23 Dec 2024', region: '🌍 Int' },
]

const TIME_FORMATS = [
  { id: 'HH:mm', label: '24-hour', example: '14:30', region: '🇪🇺' },
  { id: 'HH:mm:ss', label: '24-hour (seconds)', example: '14:30:45', region: '🇪🇺' },
  { id: 'h:mm a', label: '12-hour', example: '2:30 PM', region: '🇺🇸' },
  { id: 'h:mm:ss a', label: '12-hour (seconds)', example: '2:30:45 PM', region: '🇺🇸' },
]

export default function Settings() {
  const [token, setToken] = useState("")
  const [storedToken, setStoredToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // DateTime Formats State
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0].id)
  const [timeFormat, setTimeFormat] = useState(TIME_FORMATS[0].id)
  const [previewDate, setPreviewDate] = useState(new Date())

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("listenbrainz_token")
    setStoredToken(saved)

    const savedFormats = localStorage.getItem("datetime_formats")
    if (savedFormats) {
      const formats: DateTimeFormats = JSON.parse(savedFormats)
      setDateFormat(formats.dateFormat)
      setTimeFormat(formats.timeFormat)
    }

    // Update preview every second
    const interval = setInterval(() => setPreviewDate(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Save formats to localStorage
  const saveFormats = (newDateFormat: string, newTimeFormat: string) => {
    const formats: DateTimeFormats = {
      dateFormat: newDateFormat,
      timeFormat: newTimeFormat,
    }
    localStorage.setItem("datetime_formats", JSON.stringify(formats))

    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'))
  }

  const handleDateFormatChange = (format: string) => {
    setDateFormat(format)
    saveFormats(format, timeFormat)
  }

  const handleTimeFormatChange = (format: string) => {
    setTimeFormat(format)
    saveFormats(dateFormat, format)
  }

  const handleSaveToken = () => {
    if (token.trim()) {
      localStorage.setItem("listenbrainz_token", token.trim())
      setStoredToken(token.trim())
      setToken("")
    }
  }

  const handleDeleteToken = () => {
    localStorage.removeItem("listenbrainz_token")
    setStoredToken(null)
    setToken("")
  }

  const handleCopy = () => {
    if (storedToken) {
      navigator.clipboard.writeText(storedToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Format preview date
  const formatPreviewDate = () => {
    const d = previewDate
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const monthName = d.toLocaleString('en', { month: 'short' })

    let formattedDate = dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MMM', monthName)

    return formattedDate
  }

  const formatPreviewTime = () => {
    const d = previewDate
    const hours24 = d.getHours()
    const hours12 = hours24 % 12 || 12
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const ampm = hours24 >= 12 ? 'PM' : 'AM'

    let formattedTime = timeFormat
      .replace('HH', String(hours24).padStart(2, '0'))
      .replace('h', String(hours12))
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('a', ampm)

    return formattedTime
  }

  return (
    <div className="app-container">
      <div className="flex flex-col gap-6">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold text-viking-text-primary mb-2">Settings</h1>
          <p className="text-sm text-viking-text-tertiary">
            Manage your API tokens and display preferences
          </p>
        </div>

        {/* API TOKEN MANAGEMENT */}
        <div className="card-dense">
          <div className="card-header-dense">
            <span className="card-title-dense">API Token Management</span>
          </div>

          <div className="p-6 space-y-4">
            {/* Current Token */}
            {storedToken ? (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-viking-text-secondary uppercase tracking-wider">
                  Current Token
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-viking-bg-tertiary border border-viking-border-default rounded-lg px-4 py-3 font-mono text-sm text-viking-text-primary truncate">
                    {storedToken}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="btn-icon-dense"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleDeleteToken}
                    className="btn-icon-dense hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                    title="Delete token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-viking-text-tertiary">
                  Token is stored in your browser's localStorage
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-viking-text-secondary uppercase tracking-wider">
                  Add New Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your ListenBrainz token"
                    className="flex-1 bg-viking-bg-tertiary border border-viking-border-default rounded-lg px-4 py-3 text-sm text-viking-text-primary placeholder:text-viking-text-tertiary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all"
                  />
                  <button
                    onClick={handleSaveToken}
                    disabled={!token.trim()}
                    className="btn-primary-dense disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Token
                  </button>
                </div>
                <p className="text-xs text-viking-text-tertiary">
                  Get your token from{" "}
                  <a
                    href="https://listenbrainz.org/settings/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-viking-purple hover:text-viking-purple-light underline"
                  >
                    ListenBrainz Settings
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DATE & TIME FORMAT SETTINGS */}
        <div className="card-dense">
          <div className="card-header-dense">
            <span className="card-title-dense">Date & Time Format</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Date Format */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-viking-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => handleDateFormatChange(e.target.value)}
                className="w-full bg-viking-bg-tertiary border border-viking-border-default rounded-lg px-4 py-3 text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.region} {format.label} — {format.example}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Format */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-viking-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Format
              </label>
              <select
                value={timeFormat}
                onChange={(e) => handleTimeFormatChange(e.target.value)}
                className="w-full bg-viking-bg-tertiary border border-viking-border-default rounded-lg px-4 py-3 text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
              >
                {TIME_FORMATS.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.region} {format.label} — {format.example}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Preview */}
            <div className="pt-4 border-t border-viking-border-subtle">
              <label className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider mb-2 block">
                Live Preview
              </label>
              <div className="bg-viking-bg-elevated border border-viking-border-emphasis rounded-lg px-6 py-4 text-center">
                <div className="text-2xl font-semibold text-viking-text-primary font-mono">
                  {formatPreviewDate()} <span className="text-viking-text-tertiary mx-2">•</span> {formatPreviewTime()}
                </div>
                <p className="text-xs text-viking-text-tertiary mt-2">
                  This format will be used across all tables and displays
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

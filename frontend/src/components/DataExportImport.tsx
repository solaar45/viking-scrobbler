import { useState } from 'react'
import { Download, AlertCircle, RefreshCw } from 'lucide-react'

const API_BASE = window.location.origin

export function DataExportImport() {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all_time'>('all_time')
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    setExportLoading(true)
    setExportError(null)

    try {
      const params = new URLSearchParams({
        format: exportFormat,
        range: timeRange,
      })

      const response = await fetch(`${API_BASE}/api/export/listens?${params}`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `viking-scrobbles-${timeRange}-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">Data Export</h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            Download your scrobbles as JSON or CSV
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className="card-dense">
        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-viking-text-primary mb-2">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
            >
              <option value="json">JSON (Full Data)</option>
              <option value="csv">CSV (Spreadsheet)</option>
            </select>
            <p className="text-xs text-viking-text-tertiary">
              {exportFormat === 'json'
                ? 'Complete data with all metadata fields'
                : 'Flat format for Excel/Google Sheets'}
            </p>
          </div>

          {/* Time Range */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-viking-text-primary mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year' | 'all_time')}
              className="w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          {/* Error Alert */}
          {exportError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold text-sm">Export Error</p>
                  <p className="text-sm text-viking-text-secondary mt-1">{exportError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full px-6 py-2.5 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-sm font-semibold uppercase tracking-wide shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exportLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Listens
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

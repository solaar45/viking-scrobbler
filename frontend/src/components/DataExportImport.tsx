import { useState } from 'react'
import { Download, AlertCircle, RefreshCw } from 'lucide-react'
import { VIKING_DESIGN, cn, getButtonClasses, getAlertClasses } from '@/lib/design-tokens'

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
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <h3 className={VIKING_DESIGN.typography.title.card}>Data Export</h3>
          <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
          <span className={VIKING_DESIGN.layouts.header.subtitle}>
            Download your scrobbles as JSON or CSV
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          {/* Export Format */}
          <div className={VIKING_DESIGN.layouts.form.field}>
            <label className={VIKING_DESIGN.typography.label.base}>
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className={VIKING_DESIGN.components.select.base}
            >
              <option value="json">JSON (Full Data)</option>
              <option value="csv">CSV (Spreadsheet)</option>
            </select>
            <p className={VIKING_DESIGN.typography.helper}>
              {exportFormat === 'json'
                ? 'Complete data with all metadata fields'
                : 'Flat format for Excel/Google Sheets'}
            </p>
          </div>

          {/* Time Range */}
          <div className={VIKING_DESIGN.layouts.form.field}>
            <label className={VIKING_DESIGN.typography.label.base}>
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year' | 'all_time')}
              className={VIKING_DESIGN.components.select.base}
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all_time">All Time</option>
            </select>
          </div>

          {/* Error Alert */}
          {exportError && (
            <div className={getAlertClasses('error')}>
              <div className={cn("flex items-start", VIKING_DESIGN.spacing.inlineGap.medium)}>
                <AlertCircle className={cn(
                  "w-5 h-5 flex-shrink-0 mt-0.5",
                  VIKING_DESIGN.colors.status.error.text
                )} />
                <div>
                  <p className={cn(
                    "text-sm font-semibold",
                    VIKING_DESIGN.colors.status.error.text
                  )}>
                    Export Error
                  </p>
                  <p className={cn("text-sm mt-1", VIKING_DESIGN.colors.text.secondary)}>
                    {exportError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className={cn(
              getButtonClasses('primary', exportLoading),
              "w-full flex items-center justify-center",
              VIKING_DESIGN.spacing.inlineGap.small
            )}
          >
            {exportLoading ? (
              <>
                <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
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

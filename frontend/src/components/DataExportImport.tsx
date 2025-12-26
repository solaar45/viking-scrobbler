import { useState } from 'react'
import { Download, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

const API_BASE = window.location.origin

export function DataExportImport() {
    // Export State
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

            // Trigger download
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="card-title-dense">Data Export</h3>
                    <span className="text-viking-border-emphasis text-xl font-light">|</span>
                    <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
                        Download your scrobbles as JSON or CSV
                    </span>
                </div>
            </div>

            <Card className="bg-gray-800/50 backdrop-blur-lg border-gray-700">
                <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="export-format" className="text-gray-300">
                            Export Format
                        </Label>
                        <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'json' | 'csv')}>
                            <SelectTrigger id="export-format" className="bg-gray-700/50 border-gray-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="json">JSON (Full Data)</SelectItem>
                                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            {exportFormat === 'json'
                                ? 'Complete data with all metadata fields'
                                : 'Flat format for Excel/Google Sheets'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="time-range" className="text-gray-300">
                            Time Range
                        </Label>
                        <Select
                            value={timeRange}
                            onValueChange={(v) => setTimeRange(v as 'week' | 'month' | 'year' | 'all_time')}
                        >
                            <SelectTrigger id="time-range" className="bg-gray-700/50 border-gray-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                                <SelectItem value="year">Last Year</SelectItem>
                                <SelectItem value="all_time">All Time</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {exportError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{exportError}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        onClick={handleExport}
                        disabled={exportLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {exportLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Download Listens
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
        </>
    )
}

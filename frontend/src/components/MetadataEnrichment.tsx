import { useState } from 'react'
import { Sparkles, Search, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'

const API_BASE = window.location.origin

interface ScanResult {
  success: boolean
  missing_count: number
}

interface EnrichmentResult {
  success: boolean
  processed: number
  enriched: number
  failed: number
  error?: string
}

export function MetadataEnrichment() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    setScanResult(null)
    setEnrichmentResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/enrichment/scan`)
      const data: ScanResult = await response.json()

      if (!data.success) {
        throw new Error('Scan failed')
      }

      setScanResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleEnrich = async () => {
    if (!scanResult || scanResult.missing_count === 0) {
      return
    }

    setEnriching(true)
    setError(null)
    setEnrichmentResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/enrichment/start`, {
        method: 'POST',
      })
      
      const data: EnrichmentResult = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Enrichment failed')
      }

      setEnrichmentResult(data)
      // Refresh scan after enrichment
      setTimeout(handleScan, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    } finally {
      setEnriching(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">Metadata Enrichment</h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            Automatically add missing genres and release years from Navidrome/MusicBrainz
          </span>
        </div>
      </div>

      <Card className="bg-gray-800/50 backdrop-blur-lg border-gray-700">
        <CardContent className="space-y-4">
        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-blue-300 font-semibold mb-2">How it works:</p>
          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
            <li>Scans your listens for missing genres and release years</li>
            <li>Fetches metadata from Navidrome (primary) and MusicBrainz (fallback)</li>
            <li>Updates existing listens without creating duplicates</li>
            <li>Respects API rate limits (processes in batches)</li>
          </ul>
        </div>

        {/* Scan Section */}
        <div className="space-y-3">
          <Button
            onClick={handleScan}
            disabled={scanning || enriching}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning Database...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan for Missing Metadata
              </>
            )}
          </Button>

          {/* Scan Result */}
          {scanResult && (
            <Alert className={scanResult.missing_count > 0 ? 'bg-yellow-900/20 border-yellow-700' : 'bg-green-900/20 border-green-700'}>
              <Database className={`h-4 w-4 ${scanResult.missing_count > 0 ? 'text-yellow-400' : 'text-green-400'}`} />
              <AlertDescription className={scanResult.missing_count > 0 ? 'text-yellow-300' : 'text-green-300'}>
                {scanResult.missing_count > 0 ? (
                  <>
                    <strong>Found {scanResult.missing_count} tracks</strong> without complete metadata
                  </>
                ) : (
                  <>
                    <strong>All listens have metadata!</strong> No enrichment needed.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Enrichment Section */}
        {scanResult && scanResult.missing_count > 0 && (
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleEnrich}
              disabled={enriching}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {enriching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enriching Metadata...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Enrichment ({scanResult.missing_count} tracks)
                </>
              )}
            </Button>

            {enriching && (
              <div className="space-y-2">
                <Progress value={50} className="h-2" />
                <p className="text-xs text-gray-400 text-center">
                  Processing tracks... This may take a few minutes.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Enrichment Result */}
        {enrichmentResult && (
          <Alert className="bg-green-900/20 border-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">
              <strong>Enrichment complete!</strong>
              <div className="mt-2 text-sm space-y-1">
                <div>✓ Processed: {enrichmentResult.processed} tracks</div>
                <div>✓ Enriched: {enrichmentResult.enriched} tracks</div>
                {enrichmentResult.failed > 0 && (
                  <div className="text-yellow-400">⚠ Not found: {enrichmentResult.failed} tracks</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1 pt-2">
          <p><strong>💡 Tip:</strong> Run enrichment after importing data from other sources</p>
          <p><strong>⏱️ Note:</strong> Large libraries may take several minutes to process</p>
        </div>
      </CardContent>
    </Card>
    </>
  )
}

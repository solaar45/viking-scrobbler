import { useState } from 'react'
import { Sparkles, Search, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react'

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
      setTimeout(handleScan, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed')
    } finally {
      setEnriching(false)
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">Metadata Enrichment</h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            Automatically add missing genres and release years
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className="card-dense">
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-viking-bg-elevated rounded-lg p-4 border border-viking-border-default">
            <p className="text-sm font-semibold text-viking-text-primary mb-2">
              How it works:
            </p>
            <ul className="text-xs text-viking-text-secondary space-y-1 list-disc list-inside">
              <li>Scans your listens for missing genres and release years</li>
              <li>Fetches metadata from Navidrome (primary) and MusicBrainz (fallback)</li>
              <li>Updates existing listens without creating duplicates</li>
              <li>Respects API rate limits (processes in batches)</li>
            </ul>
          </div>

          {/* Scan Section */}
          <div className="space-y-4">
            <button
              onClick={handleScan}
              disabled={scanning || enriching}
              className="w-full px-6 py-2.5 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-sm font-semibold uppercase tracking-wide shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning Database...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan for Missing Metadata
                </>
              )}
            </button>

            {/* Scan Result */}
            {scanResult && (
              <div className={`rounded-lg p-4 border ${
                scanResult.missing_count > 0
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-viking-emerald/10 border-viking-emerald/30'
              }`}>
                <div className="flex items-start gap-3">
                  <Database className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    scanResult.missing_count > 0 ? 'text-yellow-400' : 'text-viking-emerald'
                  }`} />
                  <div>
                    <p className={`text-sm font-semibold ${
                      scanResult.missing_count > 0 ? 'text-yellow-400' : 'text-viking-emerald'
                    }`}>
                      {scanResult.missing_count > 0 ? (
                        <>Found {scanResult.missing_count} tracks without complete metadata</>
                      ) : (
                        <>All listens have metadata! No enrichment needed.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enrichment Section */}
          {scanResult && scanResult.missing_count > 0 && (
            <div className="space-y-4">
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full px-6 py-2.5 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg text-sm font-semibold uppercase tracking-wide shadow-lg shadow-viking-purple/20 hover:shadow-xl hover:shadow-viking-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enriching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Enriching Metadata...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Enrichment ({scanResult.missing_count} tracks)
                  </>
                )}
              </button>

              {enriching && (
                <div className="space-y-2">
                  <div className="h-2 bg-viking-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark animate-pulse w-1/2 rounded-full"></div>
                  </div>
                  <p className="text-xs text-viking-text-tertiary text-center">
                    Processing tracks... This may take a few minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Enrichment Result */}
          {enrichmentResult && (
            <div className="bg-viking-emerald/10 border border-viking-emerald/30 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle2 className="w-5 h-5 text-viking-emerald flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-viking-emerald font-semibold text-sm">
                    Enrichment complete!
                  </p>
                </div>
              </div>
              <div className="text-sm text-viking-text-secondary space-y-1 ml-8">
                <div>✓ Processed: {enrichmentResult.processed} tracks</div>
                <div>✓ Enriched: {enrichmentResult.enriched} tracks</div>
                {enrichmentResult.failed > 0 && (
                  <div className="text-yellow-400">⚠ Not found: {enrichmentResult.failed} tracks</div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold text-sm">Error</p>
                  <p className="text-sm text-viking-text-secondary mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-viking-text-tertiary space-y-1 pt-2">
            <p><strong>💡 Tip:</strong> Run enrichment after importing data from other sources</p>
            <p><strong>⏱️ Note:</strong> Large libraries may take several minutes to process</p>
          </div>
        </div>
      </div>
    </>
  )
}

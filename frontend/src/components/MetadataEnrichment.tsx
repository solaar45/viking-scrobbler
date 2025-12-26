import { useState } from 'react'
import { Sparkles, Search, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react'
import { VIKING_DESIGN, cn, getButtonClasses, getAlertClasses } from '@/lib/design-tokens'

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
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <h3 className={VIKING_DESIGN.typography.title.card}>Metadata Enrichment</h3>
          <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
          <span className={VIKING_DESIGN.layouts.header.subtitle}>
            Automatically add missing genres and release years
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          {/* Info Box */}
          <div className={VIKING_DESIGN.components.alert.info}>
            <p className={cn("text-sm font-semibold", VIKING_DESIGN.colors.text.primary, "mb-2")}>
              How it works:
            </p>
            <ul className={cn(
              "text-xs",
              VIKING_DESIGN.colors.text.secondary,
              "space-y-1 list-disc list-inside"
            )}>
              <li>Scans your listens for missing genres and release years</li>
              <li>Fetches metadata from Navidrome (primary) and MusicBrainz (fallback)</li>
              <li>Updates existing listens without creating duplicates</li>
              <li>Respects API rate limits (processes in batches)</li>
            </ul>
          </div>

          {/* Scan Section */}
          <div className={VIKING_DESIGN.spacing.elementSpacing}>
            <button
              onClick={handleScan}
              disabled={scanning || enriching}
              className={cn(
                getButtonClasses('primary', scanning || enriching),
                "w-full flex items-center justify-center",
                VIKING_DESIGN.spacing.inlineGap.small
              )}
            >
              {scanning ? (
                <>
                  <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
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
              <div className={cn(
                scanResult.missing_count > 0
                  ? getAlertClasses('warning')
                  : getAlertClasses('success')
              )}>
                <div className={cn("flex items-start", VIKING_DESIGN.spacing.inlineGap.medium)}>
                  <Database className={cn(
                    "w-5 h-5 flex-shrink-0 mt-0.5",
                    scanResult.missing_count > 0
                      ? VIKING_DESIGN.colors.status.warning.text
                      : VIKING_DESIGN.colors.status.success.text
                  )} />
                  <p className={cn(
                    "text-sm font-semibold",
                    scanResult.missing_count > 0
                      ? VIKING_DESIGN.colors.status.warning.text
                      : VIKING_DESIGN.colors.status.success.text
                  )}>
                    {scanResult.missing_count > 0 ? (
                      <>Found {scanResult.missing_count} tracks without complete metadata</>
                    ) : (
                      <>All listens have metadata! No enrichment needed.</>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enrichment Section */}
          {scanResult && scanResult.missing_count > 0 && (
            <div className={VIKING_DESIGN.spacing.elementSpacing}>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className={cn(
                  getButtonClasses('primary', enriching),
                  "w-full flex items-center justify-center",
                  VIKING_DESIGN.spacing.inlineGap.small
                )}
              >
                {enriching ? (
                  <>
                    <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
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
                  <div className={cn(
                    "h-2 rounded-full overflow-hidden",
                    VIKING_DESIGN.colors.card.tertiary
                  )}>
                    <div className={cn(
                      "h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark w-1/2 rounded-full",
                      VIKING_DESIGN.effects.loading.pulse
                    )}></div>
                  </div>
                  <p className={cn(VIKING_DESIGN.typography.helper, "text-center")}>
                    Processing tracks... This may take a few minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Enrichment Result */}
          {enrichmentResult && (
            <div className={getAlertClasses('success')}>
              <div className={cn(
                "flex items-start mb-3",
                VIKING_DESIGN.spacing.inlineGap.medium
              )}>
                <CheckCircle2 className={cn(
                  "w-5 h-5 flex-shrink-0 mt-0.5",
                  VIKING_DESIGN.colors.status.success.text
                )} />
                <p className={cn(
                  "text-sm font-semibold",
                  VIKING_DESIGN.colors.status.success.text
                )}>
                  Enrichment complete!
                </p>
              </div>
              <div className={cn(
                "text-sm space-y-1 ml-8",
                VIKING_DESIGN.colors.text.secondary
              )}>
                <div>✓ Processed: {enrichmentResult.processed} tracks</div>
                <div>✓ Enriched: {enrichmentResult.enriched} tracks</div>
                {enrichmentResult.failed > 0 && (
                  <div className={VIKING_DESIGN.colors.status.warning.text}>
                    ⚠ Not found: {enrichmentResult.failed} tracks
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
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
                    Error
                  </p>
                  <p className={cn("text-sm mt-1", VIKING_DESIGN.colors.text.secondary)}>
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className={cn(VIKING_DESIGN.typography.helper, "space-y-1 pt-2")}>
            <p><strong>💡 Tip:</strong> Run enrichment after importing data from other sources</p>
            <p><strong>⏱️ Note:</strong> Large libraries may take several minutes to process</p>
          </div>
        </div>
      </div>
    </>
  )
}

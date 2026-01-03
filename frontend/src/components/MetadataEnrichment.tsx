import { useState } from 'react'
import { Sparkles, Search, RefreshCw, CheckCircle2, AlertCircle, Database, Music, Calendar, Link, Radio, Disc, Info } from 'lucide-react'
import { VIKING_DESIGN, cn, getButtonClasses, getAlertClasses } from '@/lib/design-tokens'

const API_BASE = window.location.origin

interface ScanResult {
  success: boolean
  total_listens: number
  missing_genres: number
  missing_year: number
  missing_navidrome_id: number
  missing_any: number
}

interface PlayerInfoScanResult {
  success: boolean
  total: number
  missing_player: number
  missing_bitrate: number
  missing_format: number
  missing_genres: number
  missing_any: number
}

interface EnrichmentResult {
  success: boolean
  processed: number
  enriched: number
  failed: number
  skipped: number
  error?: string
}

type EnrichmentField = 'all' | 'genres' | 'year' | 'navidrome_id'

export function MetadataEnrichment() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [playerScanResult, setPlayerScanResult] = useState<PlayerInfoScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [playerScanning, setPlayerScanning] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null)
  const [backfillResult, setBackfillResult] = useState<EnrichmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<EnrichmentField>('all')

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

  const handlePlayerScan = async () => {
    setPlayerScanning(true)
    setPlayerError(null)
    setPlayerScanResult(null)
    setBackfillResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/enrichment/scan-player-info`)
      const data: PlayerInfoScanResult = await response.json()

      if (!data.success) {
        throw new Error('Player info scan failed')
      }

      setPlayerScanResult(data)
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : 'Player scan failed')
    } finally {
      setPlayerScanning(false)
    }
  }

  const handleEnrich = async (field: EnrichmentField = 'all') => {
    if (!scanResult || scanResult.missing_any === 0) {
      return
    }

    setEnriching(true)
    setError(null)
    setEnrichmentResult(null)

    try {
      const url = new URL(`${API_BASE}/api/enrichment/start`)
      if (field !== 'all') {
        url.searchParams.set('field', field)
      }

      const response = await fetch(url.toString(), {
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

  const handleBackfill = async () => {
    if (!playerScanResult || playerScanResult.missing_any === 0) {
      return
    }

    setBackfilling(true)
    setPlayerError(null)
    setBackfillResult(null)

    try {
      const url = new URL(`${API_BASE}/api/enrichment/backfill-player-info`)
      url.searchParams.set('limit', '500')

      const response = await fetch(url.toString(), {
        method: 'POST',
      })
      
      const data: EnrichmentResult = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Backfill failed')
      }

      setBackfillResult(data)
      setTimeout(handlePlayerScan, 1000)
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  const getFieldCount = (field: EnrichmentField): number => {
    if (!scanResult) return 0
    switch (field) {
      case 'genres': return scanResult.missing_genres
      case 'year': return scanResult.missing_year
      case 'navidrome_id': return scanResult.missing_navidrome_id
      case 'all': return scanResult.missing_any
    }
  }

  const getFieldIcon = (field: EnrichmentField) => {
    switch (field) {
      case 'genres': return <Music className="w-4 h-4" />
      case 'year': return <Calendar className="w-4 h-4" />
      case 'navidrome_id': return <Link className="w-4 h-4" />
      case 'all': return <Sparkles className="w-4 h-4" />
    }
  }

  const getFieldLabel = (field: EnrichmentField): string => {
    switch (field) {
      case 'genres': return 'Genres'
      case 'year': return 'Release Years'
      case 'navidrome_id': return 'Navidrome IDs'
      case 'all': return 'All Fields'
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
            Automatically add missing metadata from Navidrome & MusicBrainz
          </span>
        </div>
      </div>

      {/* CARD 1: Standard Metadata Enrichment */}
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
              <li>Scans your listens for missing genres, release years, and Navidrome IDs</li>
              <li>Fetches metadata from Navidrome (primary) and MusicBrainz (fallback)</li>
              <li>Supports field-specific enrichment for targeted updates</li>
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

            {/* Scan Result - Granular Breakdown */}
            {scanResult && (
              <div className={cn(
                scanResult.missing_any > 0
                  ? getAlertClasses('warning')
                  : getAlertClasses('success')
              )}>
                <div className={cn("flex items-start mb-3", VIKING_DESIGN.spacing.inlineGap.medium)}>
                  <Database className={cn(
                    "w-5 h-5 flex-shrink-0 mt-0.5",
                    scanResult.missing_any > 0
                      ? VIKING_DESIGN.colors.status.warning.text
                      : VIKING_DESIGN.colors.status.success.text
                  )} />
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-semibold mb-2",
                      scanResult.missing_any > 0
                        ? VIKING_DESIGN.colors.status.warning.text
                        : VIKING_DESIGN.colors.status.success.text
                    )}>
                      {scanResult.missing_any > 0 ? (
                        <>Database Scan: {scanResult.missing_any} tracks need enrichment</>
                      ) : (
                        <>All {scanResult.total_listens} listens have complete metadata! ✓</>
                      )}
                    </p>

                    {/* Granular Stats */}
                    {scanResult.missing_any > 0 && (
                      <div className={cn("text-xs space-y-1", VIKING_DESIGN.colors.text.secondary)}>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex items-center gap-1">
                            <Music className="w-3 h-3" />
                            <span>Genres: {scanResult.missing_genres}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Year: {scanResult.missing_year}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            <span>IDs: {scanResult.missing_navidrome_id}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enrichment Section - Field Selector */}
          {scanResult && scanResult.missing_any > 0 && (
            <div className={VIKING_DESIGN.spacing.elementSpacing}>
              <div className="mb-3">
                <label className={cn("text-xs font-semibold mb-2 block", VIKING_DESIGN.colors.text.secondary)}>
                  Select what to enrich:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'genres', 'year', 'navidrome_id'] as EnrichmentField[]).map((field) => {
                    const count = getFieldCount(field)
                    const isDisabled = count === 0 && field !== 'all'
                    const isSelected = selectedField === field
                    
                    return (
                      <button
                        key={field}
                        onClick={() => setSelectedField(field)}
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          "border flex items-center justify-between gap-2",
                          isSelected
                            ? "bg-viking-bg-elevated border-viking-border-emphasis text-viking-text-primary"
                            : "bg-viking-bg-tertiary border-transparent text-viking-text-secondary hover:bg-viking-bg-elevated",
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          {getFieldIcon(field)}
                          {getFieldLabel(field)}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-viking-bg-tertiary">
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                onClick={() => handleEnrich(selectedField)}
                disabled={enriching || getFieldCount(selectedField) === 0}
                className={cn(
                  getButtonClasses('primary', enriching || getFieldCount(selectedField) === 0),
                  "w-full flex items-center justify-center",
                  VIKING_DESIGN.spacing.inlineGap.small
                )}
              >
                {enriching ? (
                  <>
                    <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
                    Enriching {getFieldLabel(selectedField)}...
                  </>
                ) : (
                  <>
                    {getFieldIcon(selectedField)}
                    Enrich {getFieldLabel(selectedField)} ({getFieldCount(selectedField)} tracks)
                  </>
                )}
              </button>

              {enriching && (
                <div className="space-y-2 mt-3">
                  <div className="h-2 rounded-full overflow-hidden bg-viking-bg-tertiary">
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
                {enrichmentResult.skipped > 0 && (
                  <div>⊘ Skipped: {enrichmentResult.skipped} (already complete)</div>
                )}
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
            <p><strong>💡 Tip:</strong> Use field-specific enrichment to update only what you need</p>
            <p><strong>🎵 Genres:</strong> Fetched from Navidrome ID3 tags or MusicBrainz</p>
            <p><strong>🔗 IDs:</strong> Only available for tracks in your Navidrome library</p>
          </div>
        </div>
      </div>

      {/* CARD 2: Player Info & Audio Metadata Backfill */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          {/* Title */}
          <div className="mb-4">
            <h4 className={cn("text-base font-semibold", VIKING_DESIGN.colors.text.primary, "mb-1")}>
              Player Info & Audio Quality Backfill
            </h4>
            <p className={cn("text-sm", VIKING_DESIGN.colors.text.secondary)}>
              Enrich historical listens with bitrate, format, and genre information
            </p>
          </div>

          {/* Warning Box */}
          <div className={VIKING_DESIGN.components.alert.warning}>
            <div className={cn("flex items-start", VIKING_DESIGN.spacing.inlineGap.small)}>
              <Info className={cn("w-4 h-4 flex-shrink-0 mt-0.5", VIKING_DESIGN.colors.status.warning.text)} />
              <div className="text-xs">
                <p className="font-semibold mb-1">Important Note:</p>
                <p className={VIKING_DESIGN.colors.text.secondary}>
                  <strong>Player info cannot be backfilled</strong> for historical listens. 
                  The <code className="px-1 py-0.5 rounded bg-viking-bg-tertiary text-xs">getNowPlaying</code> API 
                  only works for currently active playback. This backfill focuses on:
                </p>
                <ul className={cn("list-disc list-inside mt-2 space-y-0.5", VIKING_DESIGN.colors.text.secondary)}>
                  <li>Bitrate (kbps)</li>
                  <li>Audio format (MP3, FLAC, etc.)</li>
                  <li>Genres (if missing)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scan Button */}
          <div className={VIKING_DESIGN.spacing.elementSpacing}>
            <button
              onClick={handlePlayerScan}
              disabled={playerScanning || backfilling}
              className={cn(
                getButtonClasses('primary', playerScanning || backfilling),
                "w-full flex items-center justify-center",
                VIKING_DESIGN.spacing.inlineGap.small
              )}
            >
              {playerScanning ? (
                <>
                  <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
                  Scanning Audio Metadata...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan Audio Metadata
                </>
              )}
            </button>

            {/* Player Scan Result */}
            {playerScanResult && (
              <div className={cn(
                playerScanResult.missing_any > 0
                  ? getAlertClasses('warning')
                  : getAlertClasses('success')
              )}>
                <div className={cn("flex items-start mb-3", VIKING_DESIGN.spacing.inlineGap.medium)}>
                  <Database className={cn(
                    "w-5 h-5 flex-shrink-0 mt-0.5",
                    playerScanResult.missing_any > 0
                      ? VIKING_DESIGN.colors.status.warning.text
                      : VIKING_DESIGN.colors.status.success.text
                  )} />
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-semibold mb-2",
                      playerScanResult.missing_any > 0
                        ? VIKING_DESIGN.colors.status.warning.text
                        : VIKING_DESIGN.colors.status.success.text
                    )}>
                      {playerScanResult.missing_any > 0 ? (
                        <>Found {playerScanResult.missing_any} tracks with missing audio metadata</>
                      ) : (
                        <>All {playerScanResult.total} listens have complete audio metadata! ✓</>
                      )}
                    </p>

                    {/* Granular Stats */}
                    {playerScanResult.missing_any > 0 && (
                      <div className={cn("text-xs space-y-1", VIKING_DESIGN.colors.text.secondary)}>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <Radio className="w-3 h-3" />
                            <span>Player: {playerScanResult.missing_player} ❌</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Disc className="w-3 h-3" />
                            <span>Bitrate: {playerScanResult.missing_bitrate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Music className="w-3 h-3" />
                            <span>Format: {playerScanResult.missing_format}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Genres: {playerScanResult.missing_genres}</span>
                          </div>
                        </div>
                        <p className="text-xs italic mt-2 pt-2 border-t border-viking-border-default">
                          ❌ Player info cannot be backfilled (requires active playback)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Backfill Button */}
          {playerScanResult && playerScanResult.missing_any > 0 && (
            <div className={VIKING_DESIGN.spacing.elementSpacing}>
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                className={cn(
                  getButtonClasses('primary', backfilling),
                  "w-full flex items-center justify-center",
                  VIKING_DESIGN.spacing.inlineGap.small
                )}
              >
                {backfilling ? (
                  <>
                    <RefreshCw className={cn("w-4 h-4", VIKING_DESIGN.effects.loading.spin)} />
                    Backfilling Audio Metadata...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Backfill Audio Metadata (up to 500 tracks)
                  </>
                )}
              </button>

              {backfilling && (
                <div className="space-y-2 mt-3">
                  <div className="h-2 rounded-full overflow-hidden bg-viking-bg-tertiary">
                    <div className={cn(
                      "h-full bg-gradient-to-r from-viking-purple to-viking-purple-dark w-1/2 rounded-full",
                      VIKING_DESIGN.effects.loading.pulse
                    )}></div>
                  </div>
                  <p className={cn(VIKING_DESIGN.typography.helper, "text-center")}>
                    Processing tracks... This may take several minutes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Backfill Result */}
          {backfillResult && (
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
                  Backfill complete!
                </p>
              </div>
              <div className={cn(
                "text-sm space-y-1 ml-8",
                VIKING_DESIGN.colors.text.secondary
              )}>
                <div>✓ Processed: {backfillResult.processed} tracks</div>
                <div>✓ Enriched: {backfillResult.enriched} tracks</div>
                {backfillResult.failed > 0 && (
                  <div className={VIKING_DESIGN.colors.status.warning.text}>
                    ⚠ Failed: {backfillResult.failed} tracks (not in Navidrome)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Player Error */}
          {playerError && (
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
                    {playerError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className={cn(VIKING_DESIGN.typography.helper, "space-y-1 pt-2")}>
            <p><strong>🎯 Best for:</strong> Historical listens missing audio quality info</p>
            <p><strong>⚡ Speed:</strong> Processes ~200 tracks per minute (with rate limiting)</p>
            <p><strong>📊 Source:</strong> Data from Navidrome ID3 tags</p>
          </div>
        </div>
      </div>
    </>
  )
}

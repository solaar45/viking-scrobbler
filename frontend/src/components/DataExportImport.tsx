import { useState } from 'react'
import { Download, Upload, Database, AlertCircle, CheckCircle2, Loader2, X, FileJson, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'

const API_BASE = window.location.origin

type MetadataSource = 'original' | 'navidrome' | 'musicbrainz'

interface ImportResult {
    success: boolean
    imported: number
    enriched: number      // ← Neu
    duplicates_skipped: number  // ← Neu (umbenennen von 'skipped')
    failed: number        // ← Neu
    errors: string[]
    total: number
}

interface FileValidation {
    valid: boolean
    message: string
    format?: 'json' | 'csv'
    previewCount?: number
}

export function DataExportImport() {
    // Export State
    const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all_time'>('all_time')
    const [exportLoading, setExportLoading] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    // Import State
    const [importMode, setImportMode] = useState<'skip' | 'merge' | 'replace'>('skip')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [fileValidation, setFileValidation] = useState<FileValidation | null>(null)
    const [importLoading, setImportLoading] = useState(false)
    const [importProgress, setImportProgress] = useState(0)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [importError, setImportError] = useState<string | null>(null)
    const [metadataSource, setMetadataSource] = useState<MetadataSource>('navidrome')
    const [deduplicate, setDeduplicate] = useState(true)

    // === EXPORT HANDLERS ===

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

    // === IMPORT HANDLERS ===

    const validateFileStructure = async (file: File): Promise<FileValidation> => {
        return new Promise((resolve) => {
            const reader = new FileReader()

            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string

                    // Detect format
                    const isJSON = file.name.endsWith('.json')
                    const isCSV = file.name.endsWith('.csv')

                    if (!isJSON && !isCSV) {
                        resolve({
                            valid: false,
                            message: 'Invalid file type. Only .json and .csv files are supported.'
                        })
                        return
                    }

                    // Validate JSON
                    if (isJSON) {
                        try {
                            const data = JSON.parse(content)
                            let listens: any[] = []
                            let formatName = 'Unknown'

                            // Viking/ListenBrainz format: {listens: [...]}
                            if (data.listens && Array.isArray(data.listens)) {
                                listens = data.listens
                                formatName = 'Viking/ListenBrainz'
                            }
                            // Viking format: [...]
                            else if (Array.isArray(data)) {
                                listens = data
                                formatName = 'Viking/ListenBrainz'
                            }
                            // Maloja format: {scrobbles: [...]}
                            else if (data.scrobbles && Array.isArray(data.scrobbles)) {
                                listens = data.scrobbles
                                formatName = 'Maloja'

                                // Validate Maloja structure
                                if (listens.length > 0) {
                                    const firstScrobble = listens[0]
                                    if (!firstScrobble.time || !firstScrobble.track) {
                                        resolve({
                                            valid: false,
                                            message: 'Invalid Maloja format. Expected: {scrobbles: [{time, track}]}'
                                        })
                                        return
                                    }
                                }
                            } else {
                                resolve({
                                    valid: false,
                                    message: 'Invalid JSON structure. Supported: Viking ({listens: [...]}), Maloja ({scrobbles: [...]})'
                                })
                                return
                            }

                            // Check if empty
                            if (listens.length === 0) {
                                resolve({
                                    valid: false,
                                    message: 'File contains no listens/scrobbles.'
                                })
                                return
                            }

                            // Validate first item based on format
                            if (formatName === 'Maloja') {
                                // Maloja validation already done above
                                resolve({
                                    valid: true,
                                    message: `Valid ${formatName} file with ${listens.length} scrobbles`,
                                    format: 'json',
                                    previewCount: listens.length
                                })
                            } else {
                                // Viking/ListenBrainz validation
                                const firstListen = listens[0]
                                const requiredFields = ['track_name', 'artist_name', 'listened_at']
                                const missingFields = requiredFields.filter(field => !firstListen[field])

                                if (missingFields.length > 0) {
                                    resolve({
                                        valid: false,
                                        message: `Missing required fields: ${missingFields.join(', ')}`
                                    })
                                    return
                                }

                                resolve({
                                    valid: true,
                                    message: `Valid ${formatName} file with ${listens.length} listens`,
                                    format: 'json',
                                    previewCount: listens.length
                                })
                            }
                        } catch (error) {
                            resolve({
                                valid: false,
                                message: `Invalid JSON format: ${error instanceof Error ? error.message : 'Parse error'}`
                            })
                        }
                        return
                    }

                    // Validate CSV (unchanged)
                    if (isCSV) {
                        const lines = content.split('\n').filter(l => l.trim())

                        if (lines.length < 2) {
                            resolve({
                                valid: false,
                                message: 'CSV file is empty or has no data rows.'
                            })
                            return
                        }

                        const header = lines[0].toLowerCase()
                        const requiredColumns = ['track_name', 'artist_name', 'listened_at']
                        const missingColumns = requiredColumns.filter(col => !header.includes(col))

                        if (missingColumns.length > 0) {
                            resolve({
                                valid: false,
                                message: `CSV missing required columns: ${missingColumns.join(', ')}`
                            })
                            return
                        }

                        resolve({
                            valid: true,
                            message: `Valid CSV file with ${lines.length - 1} listens`,
                            format: 'csv',
                            previewCount: lines.length - 1
                        })
                    }

                } catch (error) {
                    resolve({
                        valid: false,
                        message: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    })
                }
            }

            reader.onerror = () => {
                resolve({
                    valid: false,
                    message: 'Failed to read file.'
                })
            }

            reader.readAsText(file)
        })
    }

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]

        // Reset states
        setFileValidation(null)
        setImportError(null)
        setImportResult(null)

        if (!file) {
            setSelectedFile(null)
            return
        }

        // Basic checks
        if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
            setFileValidation({
                valid: false,
                message: 'Invalid file type. Only .json and .csv files are supported.'
            })
            setSelectedFile(null)
            return
        }

        // File size check (50 MB)
        if (file.size > 50 * 1024 * 1024) {
            setFileValidation({
                valid: false,
                message: 'File too large. Maximum size is 50 MB.'
            })
            setSelectedFile(null)
            return
        }

        setSelectedFile(file)

        // Validate structure
        const validation = await validateFileStructure(file)
        setFileValidation(validation)
    }

    const handleImport = async () => {
        if (!selectedFile || !fileValidation?.valid) {
            setImportError('Please select a valid file first.')
            return
        }

        setImportLoading(true)
        setImportError(null)
        setImportResult(null)
        setImportProgress(0)

        try {
            const text = await selectedFile.text()
            console.log('📄 Raw file content:', text.substring(0, 200))

            const data = JSON.parse(text)
            console.log('📦 Parsed JSON keys:', Object.keys(data))

            // 🆕 MULTI-FORMAT PARSER
            let listensArray = normalizeImportFormat(data)

            console.log(`✅ Normalized ${listensArray.length} listens for import`)

            if (listensArray.length === 0) {
                throw new Error('No listens found in file')
            }

            const payload = {
                listen_type: "import",
                metadata_source: metadataSource,
                import_mode: "skip",
                deduplicate: true,
                payload: listensArray
            }

            console.log('🚀 Sending to API:', {
                url: `${API_BASE}/api/import/listens`,
                payload_count: listensArray.length,
                metadata_source: metadataSource,
                first_listen: listensArray[0]
            })

            const res = await fetch(`${API_BASE}/api/import/listens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            })

            console.log('📡 Response status:', res.status)

            if (!res.ok) {
                const errorText = await res.text()
                console.error('❌ API Error:', errorText)
                throw new Error(`Import failed: ${res.statusText}`)
            }

            const result = await res.json()
            console.log('✅ API Result:', result)

            if (result.status !== 'ok') {
                throw new Error(result.message || 'Import failed')
            }

            setImportResult({
                success: true,
                imported: result.stats.imported,
                enriched: result.stats.enriched,
                duplicates_skipped: result.stats.duplicates_skipped,
                failed: result.stats.failed,
                errors: result.stats.errors || [],
                total: result.stats.total
            })

            setImportProgress(100)
            setSelectedFile(null)
            setFileValidation(null)

            const fileInput = document.getElementById('file-upload') as HTMLInputElement
            if (fileInput) fileInput.value = ''

        } catch (error) {
            console.error('💥 Import error:', error)
            setImportError(error instanceof Error ? error.message : 'Import failed')
        } finally {
            setImportLoading(false)
        }
    }

    // 🆕 MULTI-FORMAT NORMALIZER
    function normalizeImportFormat(data: any): any[] {
        console.log('🔍 Detecting format...')

        // Format 1: Maloja
        if (data.maloja && data.scrobbles && Array.isArray(data.scrobbles)) {
            console.log('✅ Format: Maloja (detected maloja.export_time)')
            return data.scrobbles.map(convertMalojaToListenBrainz)
        }

        // Format 2: ListenBrainz (direct array)
        if (Array.isArray(data)) {
            console.log('✅ Format: ListenBrainz (array)')
            return data.map(convertToListenBrainzFormat)
        }

        // Format 3: ListenBrainz (wrapped)
        if (data.listens && Array.isArray(data.listens)) {
            console.log('✅ Format: ListenBrainz (wrapped)')
            return data.listens.map(convertToListenBrainzFormat)
        }

        if (data.payload && Array.isArray(data.payload)) {
            console.log('✅ Format: ListenBrainz (payload)')
            return data.payload.map(convertToListenBrainzFormat)
        }

        // Format 4: Generic scrobbles (without maloja metadata)
        if (data.scrobbles && Array.isArray(data.scrobbles)) {
            console.log('✅ Format: Generic scrobbles')
            return data.scrobbles.map(convertMalojaToListenBrainz)
        }

        // Format 5: Navidrome export
        if (data.data && Array.isArray(data.data)) {
            console.log('✅ Format: Navidrome')
            return data.data.map(convertToListenBrainzFormat)
        }

        // Format 6: Last.fm backup
        if (data.recenttracks && data.recenttracks.track) {
            console.log('✅ Format: Last.fm')
            const tracks = Array.isArray(data.recenttracks.track)
                ? data.recenttracks.track
                : [data.recenttracks.track]
            return tracks.map(convertLastfmToListenBrainz)
        }

        throw new Error(`Unsupported format. Found keys: ${Object.keys(data).join(', ')}`)
    }

    // Convert Maloja format to ListenBrainz format
    function convertMalojaToListenBrainz(scrobble: any) {
        const track = scrobble.track || {}
        const artists = track.artists || []
        const artistName = Array.isArray(artists) ? artists.join(', ') : String(artists)

        // Extract album title
        const album = track.album || {}
        const albumTitle = album.albumtitle || album.title || null

        console.log('🎵 Converting Maloja scrobble:', {
            time: scrobble.time,
            title: track.title,
            artist: artistName,
            album: albumTitle
        })

        return {
            listened_at: scrobble.time,
            track_metadata: {
                track_name: track.title || 'Unknown',
                artist_name: artistName || 'Unknown',
                release_name: albumTitle,
                additional_info: {
                    duration_ms: track.length ? track.length * 1000 : scrobble.duration ? scrobble.duration * 1000 : null,
                    origin_url: scrobble.origin || null,
                    music_service: extractServiceFromOrigin(scrobble.origin)
                }
            }
        }
    }

    // Convert Last.fm format to ListenBrainz format
    function convertLastfmToListenBrainz(track: any) {
        return {
            listened_at: parseInt(track.date?.uts || Math.floor(Date.now() / 1000)),
            track_metadata: {
                track_name: track.name || 'Unknown',
                artist_name: track.artist?.['#text'] || track.artist?.name || 'Unknown',
                release_name: track.album?.['#text'] || null,
                additional_info: {
                    recording_mbid: track.mbid || null
                }
            }
        }
    }

    // Ensure ListenBrainz format (pass-through or normalize)
    function convertToListenBrainzFormat(listen: any) {
        // Already in correct format
        if (listen.listened_at && listen.track_metadata) {
            return listen
        }

        // Generic fallback
        return {
            listened_at: listen.timestamp || listen.time || Math.floor(Date.now() / 1000),
            track_metadata: {
                track_name: listen.track || listen.title || 'Unknown',
                artist_name: listen.artist || 'Unknown',
                release_name: listen.album || null,
                additional_info: listen.additional_info || {}
            }
        }
    }

    // Extract music service from origin string
    function extractServiceFromOrigin(origin: string | null): string | null {
        if (!origin) return null

        const lower = origin.toLowerCase()

        if (lower.includes('navidrome')) return 'navidrome'
        if (lower.includes('spotify')) return 'spotify'
        if (lower.includes('youtube')) return 'youtube'
        if (lower.includes('soundcloud')) return 'soundcloud'
        if (lower.includes('lastfm') || lower.includes('last.fm')) return 'lastfm'
        if (lower.includes('maloja')) return 'maloja'

        return null
    }


    return (
        <Card className="bg-gray-800/50 backdrop-blur-lg border-gray-700">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-blue-400" />
                    <div>
                        <CardTitle className="text-white">Data Export & Import</CardTitle>
                        <CardDescription className="text-gray-400">
                            Backup your scrobbles or import from other sources
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <Tabs defaultValue="export" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="export">Export Data</TabsTrigger>
                        <TabsTrigger value="import">Import Data</TabsTrigger>
                    </TabsList>

                    {/* === EXPORT TAB === */}
                    <TabsContent value="export" className="space-y-4">
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
                    </TabsContent>

                    {/* === IMPORT TAB === */}
                    <TabsContent value="import" className="space-y-4">
                        <div className="space-y-4">
                            {/* Supported Formats Info */}
                            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                                <p className="text-sm text-blue-300 font-semibold mb-2">Supported File Formats:</p>
                                <div className="flex gap-4 text-xs text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <FileJson className="h-4 w-4 text-blue-400" />
                                        <span><strong>.json</strong> - Full data with metadata</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-green-400" />
                                        <span><strong>.csv</strong> - Spreadsheet format</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Max file size: 50 MB</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file-upload" className="text-gray-300">
                                    Select File
                                </Label>
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".json,.csv"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    cursor-pointer"
                                />

                                {/* File Validation Feedback */}
                                {selectedFile && fileValidation && (
                                    <div className={`flex items-start gap-2 p-3 rounded-lg border ${fileValidation.valid
                                        ? 'bg-green-900/20 border-green-700/50'
                                        : 'bg-red-900/20 border-red-700/50'
                                        }`}>
                                        {fileValidation.valid ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <X className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <p className={`text-sm font-semibold ${fileValidation.valid ? 'text-green-300' : 'text-red-300'
                                                }`}>
                                                {fileValidation.valid ? 'File validated successfully' : 'Validation failed'}
                                            </p>
                                            <p className={`text-xs mt-1 ${fileValidation.valid ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {fileValidation.message}
                                            </p>
                                            {fileValidation.valid && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Metadata Source Selection */}
                            <div className="space-y-2">
                                <Label className="text-gray-300 font-semibold">Metadata Source</Label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Choose where to fetch track metadata (genres, release years, etc.)
                                </p>

                                <RadioGroup
                                    value={metadataSource}
                                    onValueChange={(v: string) => setMetadataSource(v as MetadataSource)}
                                    className="space-y-3"
                                >
                                    {/* Navidrome Option */}
                                    <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-700 hover:border-purple-500/50 transition-colors">
                                        <RadioGroupItem value="navidrome" id="meta-navidrome" className="mt-1" />
                                        <Label htmlFor="meta-navidrome" className="flex-1 cursor-pointer">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Database className="h-4 w-4 text-purple-400" />
                                                <span className="font-semibold text-gray-300">Navidrome</span>
                                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                                    Recommended
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Use metadata from your Navidrome library (ID3 tags, genres, release years)
                                            </p>
                                        </Label>
                                    </div>

                                    {/* MusicBrainz Option */}
                                    <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-700 hover:border-blue-500/50 transition-colors">
                                        <RadioGroupItem value="musicbrainz" id="meta-musicbrainz" className="mt-1" />
                                        <Label htmlFor="meta-musicbrainz" className="flex-1 cursor-pointer">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Database className="h-4 w-4 text-blue-400" />
                                                <span className="font-semibold text-gray-300">MusicBrainz</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Fetch metadata from MusicBrainz database (fallback if Navidrome unavailable)
                                            </p>
                                        </Label>
                                    </div>

                                    {/* Original Option */}
                                    <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-gray-700 hover:border-gray-500/50 transition-colors">
                                        <RadioGroupItem value="original" id="meta-original" className="mt-1" />
                                        <Label htmlFor="meta-original" className="flex-1 cursor-pointer">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Upload className="h-4 w-4 text-gray-400" />
                                                <span className="font-semibold text-gray-300">Original (No Enrichment)</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Keep metadata from import file without additional enrichment
                                            </p>
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {/* Deduplication Toggle */}
                                <div className="flex items-center space-x-2 mt-3 p-3 bg-gray-900/30 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="deduplicate"
                                        checked={deduplicate}
                                        onChange={(e) => setDeduplicate(e.target.checked)}
                                        className="w-4 h-4 text-purple-500 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                                    />
                                    <Label htmlFor="deduplicate" className="text-sm text-gray-400 cursor-pointer">
                                        Skip duplicates (same track + artist within 5 seconds)
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-gray-300">Import Mode</Label>
                                <RadioGroup value={importMode} onValueChange={(v: string) => setImportMode(v as 'skip' | 'merge' | 'replace')}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="skip" id="skip" />
                                        <Label htmlFor="skip" className="text-gray-400 font-normal cursor-pointer">
                                            Skip Duplicates <span className="text-xs text-gray-500">(Recommended)</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="merge" id="merge" />
                                        <Label htmlFor="merge" className="text-gray-400 font-normal cursor-pointer">
                                            Merge & Update <span className="text-xs text-gray-500">(Update metadata)</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="replace" id="replace" />
                                        <Label htmlFor="replace" className="text-gray-400 font-normal cursor-pointer">
                                            Replace All <span className="text-xs text-red-400">(⚠️ Deletes existing data!)</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {importLoading && (
                                <div className="space-y-2">
                                    <Progress value={importProgress} className="h-2" />
                                    <p className="text-xs text-gray-400 text-center">Importing listens...</p>
                                </div>
                            )}

                            {importResult && (
                                <Alert className="bg-green-900/20 border-green-700">
                                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                                    <AlertDescription className="text-green-300">
                                        <strong>Import complete!</strong>
                                        <div className="mt-2 text-sm space-y-1">
                                            <div>✓ Imported: {importResult.imported} listens</div>
                                            <div className="text-purple-300">✨ Enriched: {importResult.enriched} with {metadataSource} metadata</div>
                                            <div>⊘ Duplicates: {importResult.duplicates_skipped} skipped</div>
                                            {importResult.failed > 0 && (
                                                <div className="text-yellow-400">⚠ Failed: {importResult.failed}</div>
                                            )}
                                            {importResult.errors.length > 0 && (
                                                <div className="text-red-400">❌ Errors: {importResult.errors.length}</div>
                                            )}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {importError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        <strong>Import failed:</strong>
                                        <p className="mt-1 text-sm">{importError}</p>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={handleImport}
                                disabled={!selectedFile || !fileValidation?.valid || importLoading}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                            >
                                {importLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import Listens
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

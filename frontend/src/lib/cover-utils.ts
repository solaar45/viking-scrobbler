/**
 * Cover Art Utilities
 * 
 * Generates cover URLs from Navidrome ID3 tags only.
 * NO external sources (MusicBrainz, LastFM, etc.)
 */

export interface ListenMetadata {
  navidrome_id?: string
  coverArt?: string
  [key: string]: any
}

export interface ListenWithCover {
  id?: string
  listened_at?: number | string
  additional_info?: ListenMetadata
  track_name?: string
  artist_name?: string
  [key: string]: any
}

/**
 * Get cover URL for a listen.
 * 
 * Priority:
 * 1. Navidrome ID from additional_info.navidrome_id
 * 2. Fallback: transparent placeholder
 * 
 * @param listen Listen object
 * @param size Cover size (default: 150)
 * @returns Cover URL or undefined
 */
export function getCoverUrl(
  listen: ListenWithCover,
  size: number = 150
): string | undefined {
  // Check additional_info for navidrome_id
  const navidromeId = listen?.additional_info?.navidrome_id

  if (!navidromeId) {
    return undefined  // No cover available -> StatsCover will show gradient
  }

  // Use backend proxy endpoint
  return `/api/covers/${navidromeId}?size=${size}`
}

/**
 * Get cover URL by listen ID.
 * Uses backend lookup endpoint.
 * 
 * @param listenId Listen database ID
 * @param size Cover size (default: 150)
 * @returns Cover URL
 */
export function getCoverUrlByListenId(
  listenId: string | number,
  size: number = 150
): string {
  return `/api/listens/${listenId}/cover?size=${size}`
}

/**
 * Check if a listen has cover art available.
 * 
 * @param listen Listen object
 * @returns true if navidrome_id exists
 */
export function hasCover(listen: ListenWithCover): boolean {
  return !!listen?.additional_info?.navidrome_id
}

/**
 * Get cover URL with fallback chain.
 * 
 * @param listen Listen object
 * @param size Cover size
 * @returns Cover URL or undefined for gradient fallback
 */
export function getCoverUrlWithFallback(
  listen: ListenWithCover,
  size: number = 150
): string | undefined {
  // Only source: Navidrome ID3 tags
  return getCoverUrl(listen, size)
}

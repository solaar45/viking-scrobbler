import { StatsCover } from './StatsCover'
import { getCoverUrl } from '@/lib/cover-utils'

interface ListenRowProps {
  listen: {
    id: string
    track: string
    artist: string
    album: string
    playedAt: string
    duration: number
    releaseYear?: string | number
    genres?: string
    additional_info?: {
      navidrome_id?: string
      originalBitRate?: number
      originalFormat?: string
      media_player?: string
      [key: string]: any
    }
  }
  formatDate: (iso: string) => string
  formatTime: (iso: string) => string
  formatDuration: (sec: number) => string
}

export function ListenRow({ listen, formatDate, formatTime, formatDuration }: ListenRowProps) {
  const coverUrl = getCoverUrl({ additional_info: listen.additional_info }, 80)
  
  // Format bitrate, format and player
  const bitrate = listen.additional_info?.originalBitRate 
    ? `${listen.additional_info.originalBitRate} kbps`
    : "—"
  
  const format = listen.additional_info?.originalFormat
    ? listen.additional_info.originalFormat.toUpperCase()
    : "—"
  
  const player = listen.additional_info?.media_player || "—"

  return (
    <tr className="table-row-dense">
      {/* Cover Column */}
      <td className="table-cell-dense pl-6 w-[50px]">
        <StatsCover 
          coverUrl={coverUrl}
          name={listen.artist}
          size="sm"
        />
      </td>
      
      {/* Track */}
      <td className="table-cell-dense table-cell-primary truncate max-w-[200px]">
        {listen.track}
      </td>
      
      {/* Artist */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[150px]">
        {listen.artist}
      </td>
      
      {/* Album */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[150px]">
        {listen.album}
      </td>
      
      {/* Year */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[80px]">
        {listen.releaseYear ?? "—"}
      </td>
      
      {/* Genre */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[140px] font-medium text-emerald-400">
        {listen.genres}
      </td>
      
      {/* Bitrate */}
      <td className="table-cell-dense table-cell-secondary text-right truncate max-w-[100px]">
        {bitrate}
      </td>
      
      {/* Format */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[80px] text-cyan-400">
        {format}
      </td>
      
      {/* Player */}
      <td className="table-cell-dense table-cell-secondary truncate max-w-[120px]">
        {player}
      </td>
      
      {/* Date */}
      <td className="table-cell-dense table-cell-secondary text-right truncate max-w-[150px]">
        {formatDate(listen.playedAt)}
      </td>
      
      {/* Time */}
      <td className="table-cell-dense table-cell-secondary text-right truncate max-w-[150px]">
        {formatTime(listen.playedAt)}
      </td>
      
      {/* Duration */}
      <td className="table-cell-dense table-cell-secondary text-right pr-6 truncate max-w-[150px]">
        {formatDuration(listen.duration)}
      </td>
    </tr>
  )
}

import { useState, useEffect } from "react"
import { Calendar, Clock } from "lucide-react"

interface DateTimeFormats {
  dateFormat: string
  timeFormat: string
}

const DATE_FORMATS = [
  { id: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '23.12.2024' },
  { id: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '23/12/2024' },
  { id: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/23/2024' },
  { id: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-23' },
  { id: 'DD MMM YYYY', label: 'DD MMM YYYY', example: '23 Dec 2024' },
]

const TIME_FORMATS = [
  { id: 'HH:mm', label: '24-hour', example: '14:30' },
  { id: 'HH:mm:ss', label: '24-hour (seconds)', example: '14:30:45' },
  { id: 'h:mm a', label: '12-hour', example: '2:30 PM' },
  { id: 'h:mm:ss a', label: '12-hour (seconds)', example: '2:30:45 PM' },
]

export function DateTimeSettings() {
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0].id)
  const [timeFormat, setTimeFormat] = useState(TIME_FORMATS[0].id)
  const [previewDate, setPreviewDate] = useState(new Date())

  useEffect(() => {
    const savedFormats = localStorage.getItem("datetime_formats")
    if (savedFormats) {
      try {
        const formats: DateTimeFormats = JSON.parse(savedFormats)
        setDateFormat(formats.dateFormat)
        setTimeFormat(formats.timeFormat)
      } catch (e) {
        console.error("Failed to load datetime formats", e)
      }
    }

    const interval = setInterval(() => setPreviewDate(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const saveFormats = (newDateFormat: string, newTimeFormat: string) => {
    const formats: DateTimeFormats = {
      dateFormat: newDateFormat,
      timeFormat: newTimeFormat,
    }
    localStorage.setItem("datetime_formats", JSON.stringify(formats))
    window.dispatchEvent(new CustomEvent('datetime-format-changed'))
  }

  const handleDateFormatChange = (format: string) => {
    setDateFormat(format)
    saveFormats(format, timeFormat)
  }

  const handleTimeFormatChange = (format: string) => {
    setTimeFormat(format)
    saveFormats(dateFormat, format)
  }

  const formatPreviewDate = () => {
    const d = previewDate
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const monthName = d.toLocaleString('en', { month: 'short' })

    return dateFormat
      .replace('MMM', monthName)
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
  }

  const formatPreviewTime = () => {
    const d = previewDate
    const hours24 = d.getHours()
    const hours12 = hours24 % 12 || 12
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')
    const ampm = hours24 >= 12 ? 'PM' : 'AM'

    return timeFormat
      .replace('HH', String(hours24).padStart(2, '0'))
      .replace('h', String(hours12))
      .replace('mm', minutes)
      .replace('ss', seconds)
      .replace('a', ampm)
  }

  return (
    <>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="card-title-dense">Date & Time Format</h3>
          <span className="text-viking-border-emphasis text-xl font-light">|</span>
          <span className="text-xs font-semibold text-viking-text-tertiary uppercase tracking-wider">
            Customize how dates and times are displayed
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className="card-dense">
        <div className="p-6 space-y-6">
          {/* Date Format */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-viking-text-primary mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-viking-text-primary mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Format
            </label>
            <select
              value={timeFormat}
              onChange={(e) => handleTimeFormatChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-sm text-viking-text-primary focus:outline-none focus:ring-2 focus:ring-viking-purple/50 focus:border-viking-purple transition-all cursor-pointer"
            >
              {TIME_FORMATS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Live Preview */}
          <div className="pt-4 border-t border-viking-border-default">
            <label className="block text-sm font-medium text-viking-text-primary mb-3">
              Live Preview
            </label>
            <div className="bg-viking-bg-elevated rounded-lg px-6 py-5 text-center border border-viking-purple/30">
              <div className="text-2xl font-semibold font-mono text-viking-text-primary">
                {formatPreviewDate()}
                <span className="text-viking-text-tertiary mx-2">•</span>
                {formatPreviewTime()}
              </div>
              <p className="text-xs text-viking-text-tertiary mt-3">
                This format will be used across all tables and displays
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

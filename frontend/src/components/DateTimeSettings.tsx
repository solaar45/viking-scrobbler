import { useState, useEffect } from "react"
import { Calendar, Clock } from "lucide-react"
import { VIKING_DESIGN, cn } from "@/lib/design-tokens"

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
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <h3 className={VIKING_DESIGN.typography.title.card}>Date & Time Format</h3>
          <span className={VIKING_DESIGN.layouts.header.separator}>|</span>
          <span className={VIKING_DESIGN.layouts.header.subtitle}>
            Customize how dates and times are displayed
          </span>
        </div>
      </div>

      {/* CARD */}
      <div className={VIKING_DESIGN.components.card}>
        <div className={VIKING_DESIGN.components.cardContent}>
          {/* Date Format */}
          <div className={VIKING_DESIGN.layouts.form.field}>
            <label className={cn(
              VIKING_DESIGN.typography.label.base,
              "flex items-center",
              VIKING_DESIGN.spacing.inlineGap.small
            )}>
              <Calendar className="w-4 h-4" />
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value)}
              className={VIKING_DESIGN.components.select.base}
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div className={VIKING_DESIGN.layouts.form.field}>
            <label className={cn(
              VIKING_DESIGN.typography.label.base,
              "flex items-center",
              VIKING_DESIGN.spacing.inlineGap.small
            )}>
              <Clock className="w-4 h-4" />
              Time Format
            </label>
            <select
              value={timeFormat}
              onChange={(e) => handleTimeFormatChange(e.target.value)}
              className={VIKING_DESIGN.components.select.base}
            >
              {TIME_FORMATS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label} — {format.example}
                </option>
              ))}
            </select>
          </div>

          {/* Live Preview */}
          <div className={cn("pt-4", VIKING_DESIGN.colors.border.default, "border-t")}>
            <label className={cn(VIKING_DESIGN.typography.label.base, "mb-3")}>
              Live Preview
            </label>
            <div className={cn(
              VIKING_DESIGN.colors.card.elevated,
              "rounded-lg px-6 py-5 text-center",
              VIKING_DESIGN.colors.border.purpleSubtle,
              "border"
            )}>
              <div className={cn(
                "text-2xl font-semibold",
                VIKING_DESIGN.typography.code,
                VIKING_DESIGN.colors.text.primary
              )}>
                {formatPreviewDate()}
                <span className={cn(VIKING_DESIGN.colors.text.tertiary, "mx-2")}>•</span>
                {formatPreviewTime()}
              </div>
              <p className={cn(VIKING_DESIGN.typography.helper, "mt-3")}>
                This format will be used across all tables and displays
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

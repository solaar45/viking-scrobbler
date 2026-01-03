import { Clock } from 'lucide-react'
import { VIKING_DESIGN } from '@/lib/design-tokens'
import DashboardContent from './DashboardContent'

export function RecentListensPage() {
  return (
    <div className="space-y-6"> {/* max-w-7xl entfernt! */}
      {/* HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <Clock className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_DESIGN.typography.title.page}>Recent Listens</h1>
        </div>
      </div>

      {/* Existing Dashboard Content (Table) */}
      <DashboardContent />
    </div>
  )
}

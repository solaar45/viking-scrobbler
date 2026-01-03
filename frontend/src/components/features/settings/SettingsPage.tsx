import { Settings } from 'lucide-react'
import { DateTimeSettings } from '@/components/DateTimeSettings'
import { TokenManager } from '@/components/TokenManager'
import { NavidromeSetup } from '@/components/NavidromeSetup'
import { DataExportImport } from '@/components/DataExportImport'
import { MetadataEnrichment } from '@/components/MetadataEnrichment'
import { VIKING_DESIGN, VIKING_TYPOGRAPHY } from '@/lib/design-tokens'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className={VIKING_DESIGN.layouts.header.wrapper}>
        <div className={VIKING_DESIGN.layouts.header.title}>
          <Settings className="w-6 h-6 text-viking-purple" />
          <h1 className={VIKING_TYPOGRAPHY.heading.xl}>Settings</h1>
        </div>
      </div>

      {/* SETTINGS COMPONENTS */}
      <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
        <NavidromeSetup />
        <DataExportImport /> 
        <MetadataEnrichment />
        <TokenManager />
        <DateTimeSettings />
      </div>
    </div>
  )
}

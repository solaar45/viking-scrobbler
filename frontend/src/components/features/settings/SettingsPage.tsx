import { DateTimeSettings } from '@/components/DateTimeSettings'
import { TokenManager } from '@/components/TokenManager'
import { NavidromeSetup } from '@/components/NavidromeSetup'
import { DataExportImport } from '@/components/DataExportImport'
import { MetadataEnrichment } from '@/components/MetadataEnrichment'

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <NavidromeSetup />
      <DataExportImport /> 
      <MetadataEnrichment />
      <TokenManager />
      <DateTimeSettings />
    </div>
  )
}

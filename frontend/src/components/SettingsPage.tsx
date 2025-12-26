import { DateTimeSettings } from './DateTimeSettings'
import { TokenManager } from './TokenManager'
import { NavidromeSetup } from './NavidromeSetup'
import { DataExportImport } from './DataExportImport'
import { MetadataEnrichment } from './MetadataEnrichment'

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

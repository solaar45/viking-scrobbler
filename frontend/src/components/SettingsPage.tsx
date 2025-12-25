import { DateTimeSettings } from './DateTimeSettings'
import { TokenManager } from './TokenManager'
import { NavidromeSetup } from './NavidromeSetup'

export default function SettingsPage() {  // ✅ Default export
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      
      <NavidromeSetup />
      <TokenManager />
      <DateTimeSettings />
    </div>
  )
}

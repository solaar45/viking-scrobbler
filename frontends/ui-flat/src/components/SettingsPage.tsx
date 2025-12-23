import { DateTimeSettings } from './DateTimeSettings'
import { TokenManager } from './TokenManager'
import { NavidromeSetup } from './NavidromeSetup'

export default function SettingsPage() {  // ✅ Default export
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="card-dense">
        <div className="card-header-dense">
          <h2 className="card-title-dense">Settings</h2>
        </div>
      </div>

      <NavidromeSetup />
      <TokenManager />
      <DateTimeSettings />
    </div>
  )
}

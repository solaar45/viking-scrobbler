import { TokenManager } from "./TokenManager"
import { DateTimeSettings } from "./DateTimeSettings"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-viking-text-primary">Settings</h1>
        <span className="px-2 py-1 bg-viking-bg-tertiary border border-viking-border-default rounded text-xs font-semibold text-viking-text-secondary uppercase tracking-wider">
          Configuration
        </span>
      </div>
      
      <div className="space-y-6">
        <TokenManager />
        <DateTimeSettings />
      </div>
    </div>
  )
}

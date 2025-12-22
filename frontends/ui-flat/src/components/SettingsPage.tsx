import { TokenManager } from "./TokenManager";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div>
        <TokenManager />
      </div>
    </div>
  );
}

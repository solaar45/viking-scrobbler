import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import DashboardContent from '@/components/dashboard-content'
import SettingsPage from '@/components/SettingsPage'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState } from 'react'

export default function App() {
  const [path, setPath] = useState<string>(typeof window !== 'undefined' ? window.location.pathname : '/')

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const renderMain = () => {
    if (path === '/settings') return <SettingsPage />
    return <DashboardContent />
  }

  const title = path === '/settings' ? 'Settings' : 'Dashboard'

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="font-semibold text-sm">{title}</span>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 bg-gray-50">
          {renderMain()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

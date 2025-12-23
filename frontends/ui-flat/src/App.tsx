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

  // Dark Mode forced (bereits in index.css, aber sicherheitshalber)
  useEffect(() => {
    document.documentElement.classList.add('dark')
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
        {/* Header: Dark Background mit subtiler Border */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-viking-bg-secondary border-viking-border-default">
          <SidebarTrigger className="-ml-1 text-viking-text-secondary hover:text-viking-text-primary" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-viking-border-default" />
          <span className="font-semibold text-lg text-viking-text-primary">{title}</span>
        </header>

        {/* Main: Dunklerer Background */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 bg-viking-bg-primary">
          {renderMain()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

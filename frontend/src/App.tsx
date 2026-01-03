import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { OverviewPage } from '@/components/features/overview/OverviewPage'
import { RecentListensPage } from '@/components/features/recent-listens/RecentListensPage'
import { StatisticsPage } from '@/components/features/statistics/StatisticsPage'
import SettingsPage from '@/components/features/settings/SettingsPage'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState } from 'react'

export default function App() {
  const [path, setPath] = useState<string>(typeof window !== 'undefined' ? window.location.pathname : '/')

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Dark Mode forced
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const renderMain = () => {
    switch (path) {
      case '/':
      case '/overview':
        return <OverviewPage />
      case '/recent':
        return <RecentListensPage />
      case '/statistics':
        return <StatisticsPage />
      case '/settings':
        return <SettingsPage />
      default:
        return <OverviewPage />
    }
  }

  const getTitle = () => {
    switch (path) {
      case '/':
      case '/overview':
        return 'Overview'
      case '/recent':
        return 'Recent Listens'
      case '/statistics':
        return 'Statistics'
      case '/settings':
        return 'Settings'
      default:
        return 'Overview'
    }
  }

  const title = getTitle()

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />

      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-viking-bg-secondary border-viking-border-default">
          <SidebarTrigger className="-ml-1 text-viking-text-secondary hover:text-viking-text-primary" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-viking-border-default" />
          <span className="font-semibold text-lg text-viking-text-primary">{title}</span>
        </header>

        {/* Main */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:p-6 bg-viking-bg-primary">
          {renderMain()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

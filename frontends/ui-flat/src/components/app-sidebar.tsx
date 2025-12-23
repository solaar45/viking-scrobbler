"use client"

import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar"
import { 
  Home, 
  Settings, 
  Music2
} from "lucide-react"

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-viking-border-default bg-viking-bg-secondary"
    >
      {/* HEADER mit Logo */}
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-viking-border-default group-data-[collapsible=icon]:h-16">
        <div className="flex items-center gap-3 font-bold text-lg tracking-tight text-viking-text-primary overflow-hidden w-full px-3 transition-all">
          {/* Logo Icon */}
          <div className="p-2 bg-gradient-to-br from-viking-purple to-viking-purple-dark rounded-lg text-white flex-shrink-0 shadow-lg shadow-viking-purple/20">
             <Music2 className="h-5 w-5" strokeWidth={2} />
          </div>
          {/* Text (hidden when collapsed) */}
          <span className="group-data-[collapsible=icon]:hidden truncate font-semibold">
            Scrobbler
          </span>
        </div>
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title} 
                    className="h-11 text-viking-text-secondary hover:text-viking-text-primary hover:bg-viking-bg-tertiary transition-all rounded-lg px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 data-[active=true]:bg-gradient-to-r data-[active=true]:from-viking-purple/10 data-[active=true]:to-viking-purple-dark/10 data-[active=true]:text-viking-purple data-[active=true]:border-l-2 data-[active=true]:border-viking-purple"
                  >
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="!w-5 !h-5" strokeWidth={2} />
                      <span className="font-medium text-sm leading-none group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER (Optional - für Username/Version) */}
      <div className="mt-auto border-t border-viking-border-default p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2 text-xs text-viking-text-tertiary group-data-[collapsible=icon]:justify-center">
          <span className="w-2 h-2 rounded-full bg-viking-emerald animate-pulse"></span>
          <span className="group-data-[collapsible=icon]:hidden font-medium">
            Viking Scrobbler
          </span>
        </div>
      </div>
    </Sidebar>
  )
}

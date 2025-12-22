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
    // Wieder 'icon' mode aktiviert
    <Sidebar collapsible="icon" className="border-r border-gray-200 bg-white">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-gray-100 group-data-[collapsible=icon]:h-16">
        <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-slate-900 overflow-hidden w-full px-2 transition-all">
          <div className="p-2 bg-slate-900 rounded-lg text-white flex-shrink-0">
             <Music2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <span className="group-data-[collapsible=icon]:hidden truncate">Scrobbler</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title} 
                    className="h-12 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all rounded-md px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  >
                    <a href={item.url} className="flex items-center gap-4">
                      {/* Icons passen sich wieder an den Collapsed-State an */}
                      <item.icon className="!w-6 !h-6" strokeWidth={1.5} />
                      <span className="font-semibold text-sm leading-none group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

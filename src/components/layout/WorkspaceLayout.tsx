"use client"

import { GlobalNav } from "./GlobalNav"
import { cn } from "@/lib/utils"

interface WorkspaceLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function WorkspaceLayout({ children, sidebar }: WorkspaceLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden overflow-x-hidden">
      <GlobalNav />
      <div className="flex flex-1 pt-12 overflow-hidden">
        <div className="flex flex-1 min-w-0">
          {sidebar != null && (
            <aside
              className={cn(
                "w-[200px] flex-shrink-0 border-r border-border overflow-y-auto"
              )}
            >
              {sidebar}
            </aside>
          )}
          <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

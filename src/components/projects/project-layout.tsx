"use client"

/**
 * @deprecated Use the persistent layout at app/(dashboard)/w/[workspaceSlug]/projects/layout.tsx instead.
 * This component is unused - the projects layout now renders ProjectSidebar at the route level.
 */
import { ReactNode, useState } from "react"
import ProjectSidebar from "@/components/projects/project-sidebar"

interface ProjectLayoutProps {
  children: ReactNode
  projectId: string
  projectName: string
}

export default function ProjectLayout({ children, projectId, projectName }: ProjectLayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  return (
    <div className="flex min-h-screen">
      {/* Project Sidebar */}
      <ProjectSidebar 
        projectId={projectId} 
        projectName={projectName}
        onHoverChange={setIsSidebarExpanded}
      />
      
      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? 'ml-64' : 'ml-16'
      }`}>
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

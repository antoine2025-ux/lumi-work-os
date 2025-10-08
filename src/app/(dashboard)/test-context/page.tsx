"use client"

import { ContextMenu, contextMenuItems } from "@/components/ui/context-menu"
import { Card, CardContent } from "@/components/ui/card"

export default function TestContextPage() {
  const testProject = {
    id: "test-1",
    name: "Test Project",
    description: "This is a test project"
  }

  const testWiki = {
    id: "test-wiki-1",
    title: "Test Wiki Page",
    slug: "test-wiki-page"
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Context Menu Test</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Project (Right-click me!)</h2>
          <ContextMenu items={contextMenuItems.project(testProject)}>
            <Card className="w-64 p-4 cursor-pointer hover:bg-gray-50">
              <CardContent className="p-0">
                <h3 className="font-medium">{testProject.name}</h3>
                <p className="text-sm text-gray-500">{testProject.description}</p>
              </CardContent>
            </Card>
          </ContextMenu>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Test Wiki Page (Right-click me!)</h2>
          <ContextMenu items={contextMenuItems.wiki(testWiki)}>
            <Card className="w-64 p-4 cursor-pointer hover:bg-gray-50">
              <CardContent className="p-0">
                <h3 className="font-medium">{testWiki.title}</h3>
                <p className="text-sm text-gray-500">Wiki page content</p>
              </CardContent>
            </Card>
          </ContextMenu>
        </div>
      </div>
    </div>
  )
}

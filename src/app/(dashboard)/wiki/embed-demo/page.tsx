"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { EmbedContentRenderer } from "@/components/wiki/embed-content-renderer"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EmbedDemoPage() {
  const [content, setContent] = useState(`
    <h1>Embed Demo Page</h1>
    <p>This page demonstrates the new embedding functionality in Loopwell Work OS.</p>
    
    <h2>How to Use Embeds</h2>
    <p>In the editor below, you can:</p>
    <ul>
      <li>Type <code>/</code> to open the embed command palette</li>
      <li>Click the "Embed" button in the toolbar</li>
      <li>Select from various providers like Figma, GitHub, Airtable, etc.</li>
    </ul>
    
    <h2>Supported Providers</h2>
    <p>Currently supported embed providers include:</p>
    <ul>
      <li>🎨 <strong>Figma</strong> - Embed designs and prototypes</li>
      <li>🐙 <strong>GitHub</strong> - Embed repositories, issues, and pull requests</li>
      <li>📊 <strong>Airtable</strong> - Embed databases and views</li>
      <li>✅ <strong>Asana</strong> - Embed projects and tasks</li>
      <li>🎯 <strong>Miro</strong> - Embed whiteboards and boards</li>
      <li>📐 <strong>Draw.io</strong> - Embed diagrams and flowcharts</li>
      <li>🔗 <strong>Generic</strong> - Embed any URL as a link card</li>
    </ul>
    
    <p>Try adding some embeds below!</p>
  `)
  const [isEditing, setIsEditing] = useState(true)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/wiki" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wiki
        </Link>
        <h1 className="text-3xl font-bold">Embed Demo</h1>
        <p className="text-muted-foreground mt-2">
          Test the new embedding functionality in Loopwell Work OS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Rich Text Editor with Embeds</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'View Mode' : 'Edit Mode'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing and try typing / to see the embed menu..."
            />
          ) : (
            <EmbedContentRenderer content={content} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Method 1: Slash Command</h3>
            <p className="text-sm text-muted-foreground">
              Type <code>/</code> in the editor to open the embed command palette. 
              You can then search for and select the provider you want to embed from.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Method 2: Toolbar Button</h3>
            <p className="text-sm text-muted-foreground">
              Click the "Embed" button in the toolbar to open the embed dialog directly.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Supported URLs</h3>
            <p className="text-sm text-muted-foreground">
              Each provider supports specific URL patterns. For example:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Figma: <code>https://figma.com/file/...</code></li>
              <li>• GitHub: <code>https://github.com/owner/repo</code></li>
              <li>• Airtable: <code>https://airtable.com/base/...</code></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

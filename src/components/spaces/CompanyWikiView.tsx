"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Globe,
  FileText,
  Folder,
  Plus,
  Loader2,
} from "lucide-react"
import { QuickCreatePageDialog } from "./quick-create-page-dialog"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

interface WikiFolder {
  id: string
  title: string
  slug: string
  _count: { children: number }
}

interface WikiPageItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  updatedAt: string
  createdBy: { name: string | null }
  _count: { children: number }
}

interface CompanyWikiData {
  companyWikiSpaceId: string
  folders: WikiFolder[]
  recentPages: WikiPageItem[]
}

async function fetchCompanyWiki(): Promise<CompanyWikiData> {
  const res = await fetch("/api/wiki/company-wiki")
  if (!res.ok) throw new Error("Failed to load company wiki")
  return res.json()
}

export function CompanyWikiView() {
  const [createPageOpen, setCreatePageOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["wiki", "company-wiki"],
    queryFn: fetchCompanyWiki,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const companyWikiSpaceId = data?.companyWikiSpaceId ?? ""
  const folders = data?.folders ?? []
  const recentPages = data?.recentPages ?? []

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5" />
            <h1 className="text-2xl font-semibold">Company Wiki</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Company-wide documentation and knowledge base
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreatePageOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Page
        </Button>
      </div>

      {/* Sections (folders) */}
      {folders.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Folder className="w-4 h-4" />
            Sections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/wiki/${folder.slug}`}
                className="block p-4 bg-card rounded-lg border hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{folder.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {folder._count.children} pages
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Updates */}
      <section>
        <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Recent Updates
        </h2>
        <div className="space-y-1">
          {recentPages.length === 0 ? (
            <p className="text-muted-foreground py-4">No pages yet.</p>
          ) : (
            recentPages.map((page) => (
              <Link
                key={page.id}
                href={`/wiki/${page.slug}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{page.title}</span>
                  {(page._count?.children ?? 0) > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {page._count!.children} pages
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                  <span className="hidden sm:inline">
                    {page.createdBy?.name ?? "Unknown"}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(page.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <QuickCreatePageDialog
        open={createPageOpen}
        onOpenChange={setCreatePageOpen}
        spaceId={companyWikiSpaceId}
        spaceName="Company Wiki"
      />
    </div>
  )
}

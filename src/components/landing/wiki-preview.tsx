"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, Search, BookOpen } from "lucide-react"

const mockPages = [
  {
    id: "1",
    title: "Getting Started Guide",
    category: "Documentation",
    updatedAt: "2 hours ago",
    icon: "📚",
  },
  {
    id: "2",
    title: "API Reference",
    category: "Technical",
    updatedAt: "1 day ago",
    icon: "🔧",
  },
  {
    id: "3",
    title: "Team Onboarding",
    category: "HR",
    updatedAt: "3 days ago",
    icon: "👥",
  },
  {
    id: "4",
    title: "Product Roadmap",
    category: "Planning",
    updatedAt: "1 week ago",
    icon: "🗺️",
  },
]

export function WikiPreview() {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">Knowledge Base</h3>
          <p className="text-sm text-slate-400">Your team&apos;s shared brain</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages..."
            className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Recent Pages */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-300">Recent Pages</h4>
          <button className="text-xs text-blue-400 hover:text-blue-300">View all</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mockPages.map((page) => (
            <Card
              key={page.id}
              className="border-slate-700 bg-slate-900 hover:bg-slate-850 transition-colors cursor-pointer"
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{page.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-white mb-1">{page.title}</h5>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {page.category}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{page.updatedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Categories</h4>
        <div className="flex flex-wrap gap-2">
          {["Documentation", "Technical", "HR", "Planning", "Marketing"].map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}






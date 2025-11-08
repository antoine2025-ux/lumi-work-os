"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, User } from "lucide-react"

interface Task {
  id: string
  title: string
  priority: "LOW" | "MEDIUM" | "HIGH"
  assignee?: string
}

const columns = [
  {
    id: "todo",
    title: "To Do",
    tasks: [
      { id: "1", title: "Design homepage mockup", priority: "HIGH" as const, assignee: "Sarah" },
      { id: "2", title: "Set up CI/CD pipeline", priority: "MEDIUM" as const, assignee: "Mike" },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [
      { id: "3", title: "Implement authentication", priority: "HIGH" as const, assignee: "Alex" },
      { id: "4", title: "Write API documentation", priority: "MEDIUM" as const },
    ],
  },
  {
    id: "in-review",
    title: "In Review",
    tasks: [
      { id: "5", title: "Code review: User module", priority: "LOW" as const, assignee: "Tom" },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      { id: "6", title: "Setup database schema", priority: "HIGH" as const },
      { id: "7", title: "Deploy staging environment", priority: "MEDIUM" as const },
    ],
  },
]

export function KanbanPreview() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">Website Redesign</h3>
        <p className="text-sm text-slate-400">12 tasks • 3 team members</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-300">{column.title}</h4>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {column.tasks.length}
              </Badge>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {column.tasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-slate-700 bg-slate-900 hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  <CardContent className="p-3">
                    <p className="text-sm text-white mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPriorityColor(task.priority)}`}
                      >
                        {task.priority}
                      </Badge>
                      {task.assignee && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">{task.assignee}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {column.id === "todo" && (
                <button className="w-full p-2 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add task</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


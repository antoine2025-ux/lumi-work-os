"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Building, 
  User, 
  Users, 
  UserPlus,
  ExternalLink,
  RefreshCw
} from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
  department: string | null
  position: string | null
  isActive: boolean
}

interface OrgPosition {
  id: string
  title: string
  department: string | null
  level: number
  parentId: string | null
  userId: string | null
  user?: User | null
}

interface OrgChartPreviewProps {
  positions: OrgPosition[]
  users: User[]
  onRefresh: () => void
}

export function OrgChartPreview({ positions, users, onRefresh }: OrgChartPreviewProps) {
  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-yellow-500"
      case 2: return "bg-blue-500" 
      case 3: return "bg-green-500"
      case 4: return "bg-purple-500"
      case 5: return "bg-gray-500"
      default: return "bg-gray-500"
    }
  }

  const getDepartmentColor = (department: string | null) => {
    if (!department) return "bg-gray-100 text-gray-800"
    
    switch (department) {
      case "Executive": return "bg-yellow-100 text-yellow-800"
      case "Engineering": return "bg-blue-100 text-blue-800"
      case "Marketing": return "bg-purple-100 text-purple-800"
      case "Finance": return "bg-green-100 text-green-800"
      case "Product": return "bg-orange-100 text-orange-800"
      case "Sales": return "bg-red-100 text-red-800"
      case "HR": return "bg-pink-100 text-pink-800"
      case "Operations": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const assignedPositions = positions.filter(pos => pos.user)
  const openPositions = positions.filter(pos => !pos.user)
  const departments = Array.from(new Set(positions.map(pos => pos.department).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              {assignedPositions.length} assigned, {openPositions.length} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPositions.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((assignedPositions.length / positions.length) * 100)}% filled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPositions.length}</div>
            <p className="text-xs text-muted-foreground">
              Need assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Org Chart Preview */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Organization Structure</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('/org', '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Chart
            </Button>
          </div>
        </div>

        {positions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No positions yet</h3>
              <p className="text-muted-foreground mb-4">
                Create users and assign them to organizational positions to build your org chart.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Render by levels */}
            {[1, 2, 3, 4, 5].map(level => {
              const positionsAtLevel = positions.filter(position => position.level === level)
              if (positionsAtLevel.length === 0) return null

              return (
                <div key={level} className="space-y-4">
                  <h4 className="text-md font-medium text-muted-foreground">
                    Level {level} {level === 1 ? '(Executive)' : level === 2 ? '(Senior Leadership)' : level === 3 ? '(Directors)' : level === 4 ? '(Managers)' : '(Individual Contributors)'}
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {positionsAtLevel.map((position) => (
                      <Card key={position.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="text-center pb-2">
                          <div className="flex justify-center mb-2">
                            <div className={`h-10 w-10 rounded-full ${getLevelColor(position.level)} flex items-center justify-center text-white font-bold text-sm`}>
                              {position.user?.image ? (
                                <img 
                                  src={position.user.image} 
                                  alt={position.user.name || ''} 
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                getInitials(position.user?.name || position.title)
                              )}
                            </div>
                          </div>
                          <CardTitle className="text-sm">
                            {position.user?.name || position.title}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {position.user ? position.title : 'Open Position'}
                          </CardDescription>
                          {position.department && (
                            <Badge className={`${getDepartmentColor(position.department)} text-xs`}>
                              {position.department}
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="text-center pt-0">
                          {position.user?.email && (
                            <p className="text-xs text-muted-foreground truncate">
                              {position.user.email}
                            </p>
                          )}
                          {position.children && position.children.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {position.children.length} direct report{position.children.length !== 1 ? 's' : ''}
                            </p>
                          )}
                          {!position.user && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Open Position
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Department Breakdown */}
      {departments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Department Breakdown</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => {
              const deptPositions = positions.filter(pos => pos.department === dept)
              const assignedInDept = deptPositions.filter(pos => pos.user).length
              
              return (
                <Card key={dept}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-base">{dept}</span>
                      <Badge variant="secondary">
                        {assignedInDept}/{deptPositions.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {Math.round((assignedInDept / deptPositions.length) * 100)}% positions filled
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deptPositions.slice(0, 3).map((position) => (
                        <div key={position.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">
                            {position.user?.name || position.title}
                          </span>
                          <Badge 
                            variant={position.user ? "default" : "outline"}
                            className="text-xs"
                          >
                            {position.user ? 'Assigned' : 'Open'}
                          </Badge>
                        </div>
                      ))}
                      {deptPositions.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{deptPositions.length - 3} more positions
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

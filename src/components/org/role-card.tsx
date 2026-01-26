"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Building, 
  Users, 
  Target, 
  Award, 
  DollarSign,
  BarChart3,
  Edit,
  MoreHorizontal,
  UserPlus,
  CheckCircle,
  Clock,
  TrendingUp,
  Star
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RoleCardData {
  id: string
  title: string
  department: string | null
  level: number
  isActive: boolean
  // Contextual AI fields (optional for backward compatibility)
  roleDescription?: string | null
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  keyMetrics?: string[]
  teamSize?: number | null
  budget?: string | null
  reportingStructure?: string | null
  // User assignment
  user?: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  } | null
}

interface RoleCardProps {
  role: RoleCardData
  onEdit?: (role: RoleCardData) => void
  onAssignUser?: (role: RoleCardData) => void
  showActions?: boolean
  compact?: boolean
}

export function RoleCard({ 
  role, 
  onEdit, 
  onAssignUser,
  showActions = true,
  compact = false 
}: RoleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

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

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return "Executive"
      case 2: return "Senior Leadership"
      case 3: return "Director"
      case 4: return "Manager"
      case 5: return "Individual Contributor"
      default: return "Level " + level
    }
  }

  const hasContextualData = role.roleDescription || 
    (role.responsibilities && role.responsibilities.length > 0) || 
    (role.requiredSkills && role.requiredSkills.length > 0) ||
    (role.keyMetrics && role.keyMetrics.length > 0) ||
    role.teamSize || role.budget

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-full ${getLevelColor(role.level)} flex items-center justify-center text-white font-bold text-sm`}>
              {role.user?.image ? (
                <img 
                  src={role.user.image} 
                  alt={role.user.name || ''} 
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                getInitials(role.user?.name || role.title)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">
                {role.user?.name || role.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {role.user ? role.title : 'Open Position'}
              </p>
              {role.department && (
                <Badge className={`${getDepartmentColor(role.department)} text-xs mt-1`}>
                  {role.department}
                </Badge>
              )}
            </div>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(role)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Role
                    </DropdownMenuItem>
                  )}
                  {onAssignUser && !role.user && (
                    <DropdownMenuItem onClick={() => onAssignUser(role)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign User
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className={`h-16 w-16 rounded-full ${getLevelColor(role.level)} flex items-center justify-center text-white font-bold text-xl`}>
            {role.user?.image ? (
              <img 
                src={role.user.image} 
                alt={role.user.name || ''} 
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              getInitials(role.user?.name || role.title)
            )}
          </div>
        </div>
        <CardTitle className="text-lg">
          {role.user?.name || role.title}
        </CardTitle>
        <div className="space-y-2">
          <CardDescription>
            {role.user ? role.title : 'Open Position'}
          </CardDescription>
          <div className="flex justify-center space-x-2">
            {role.department && (
              <Badge className={`${getDepartmentColor(role.department)} text-xs`}>
                {role.department}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {getLevelLabel(role.level)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Role Description */}
        {role.roleDescription && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center">
              <Building className="h-4 w-4 mr-1" />
              Role Overview
            </h4>
            <p className="text-sm text-muted-foreground">{role.roleDescription}</p>
          </div>
        )}

        {/* Key Responsibilities */}
        {role.responsibilities && role.responsibilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Key Responsibilities
            </h4>
            <ul className="space-y-1">
              {role.responsibilities.slice(0, isExpanded ? role.responsibilities.length : 3).map((responsibility, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500" />
                  <span>{responsibility}</span>
                </li>
              ))}
              {role.responsibilities.length > 3 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{role.responsibilities.length - 3} more responsibilities
                </Button>
              )}
            </ul>
          </div>
        )}

        {/* Required Skills */}
        {role.requiredSkills && role.requiredSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-1" />
              Required Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {role.requiredSkills.slice(0, isExpanded ? role.requiredSkills.length : 4).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {role.requiredSkills.length > 4 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{role.requiredSkills.length - 4} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Preferred Skills */}
        {role.preferredSkills && role.preferredSkills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Star className="h-4 w-4 mr-1" />
              Preferred Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {role.preferredSkills.slice(0, isExpanded ? role.preferredSkills.length : 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {role.preferredSkills.length > 3 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{role.preferredSkills.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {role.keyMetrics && role.keyMetrics.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <BarChart3 className="h-4 w-4 mr-1" />
              Key Metrics
            </h4>
            <ul className="space-y-1">
              {role.keyMetrics.slice(0, isExpanded ? role.keyMetrics.length : 2).map((metric, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <TrendingUp className="h-3 w-3 mr-2 mt-0.5 text-blue-500" />
                  <span>{metric}</span>
                </li>
              ))}
              {role.keyMetrics.length > 2 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{role.keyMetrics.length - 2} more metrics
                </Button>
              )}
            </ul>
          </div>
        )}

        {/* Additional Info */}
        <div className="space-y-2">
          {role.teamSize && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Team Size: {role.teamSize}</span>
            </div>
          )}
          {role.budget && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Budget: {role.budget}</span>
            </div>
          )}
          {role.reportingStructure && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>Reports to: {role.reportingStructure}</span>
            </div>
          )}
        </div>

        {/* AI Context Indicator */}
        {hasContextualData && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                AI Context Available
              </span>
              <Badge variant="outline" className="text-xs">
                Enhanced Role
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="pt-2 border-t space-y-2">
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(role)}
                className="w-full"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Role
              </Button>
            )}
            {onAssignUser && !role.user && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onAssignUser(role)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign User
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

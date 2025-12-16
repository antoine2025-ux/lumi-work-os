"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Target, 
  Star,
  Edit,
  MoreHorizontal,
  Building,
  Calendar,
  Award
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  // Contextual AI fields (optional for backward compatibility)
  bio?: string | null
  skills?: string[]
  currentGoals?: string[]
  interests?: string[]
  timezone?: string | null
  location?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  personalWebsite?: string | null
}

interface UserProfileCardProps {
  user: UserProfile
  position?: {
    title: string
    department: string | null
    level: number
  } | null
  onEdit?: (user: UserProfile) => void
  showActions?: boolean
  compact?: boolean
}

export function UserProfileCard({ 
  user, 
  position, 
  onEdit, 
  showActions = true,
  compact = false 
}: UserProfileCardProps) {
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

  const hasContextualData = user.bio || 
    (user.skills && user.skills.length > 0) || 
    (user.currentGoals && user.currentGoals.length > 0) ||
    (user.interests && user.interests.length > 0) ||
    user.location || user.phone || user.linkedinUrl || user.githubUrl

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className={position ? getLevelColor(position.level) : "bg-gray-500"}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{user.name}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {position?.title || user.email}
              </p>
              {position?.department && (
                <Badge className={`${getDepartmentColor(position.department)} text-xs mt-1`}>
                  {position.department}
                </Badge>
              )}
            </div>
            {showActions && onEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(user)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </DropdownMenuItem>
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
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className={position ? getLevelColor(position.level) : "bg-gray-500"}>
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-lg">{user.name}</CardTitle>
        <div className="space-y-2">
          <CardDescription>
            {position?.title || "Team Member"}
          </CardDescription>
          {position?.department && (
            <Badge className={`${getDepartmentColor(position.department)} text-xs`}>
              {position.department}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        <div className="space-y-2">
          {user.email && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{user.phone}</span>
            </div>
          )}
          {user.location && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{user.location}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium flex items-center">
              <User className="h-4 w-4 mr-1" />
              About
            </h4>
            <p className="text-sm text-muted-foreground">{user.bio}</p>
          </div>
        )}

        {/* Skills */}
        {user.skills && user.skills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Award className="h-4 w-4 mr-1" />
              Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {user.skills.slice(0, isExpanded ? user.skills.length : 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {user.skills.length > 3 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{user.skills.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Current Goals */}
        {user.currentGoals && user.currentGoals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Current Goals
            </h4>
            <ul className="space-y-1">
              {user.currentGoals.slice(0, isExpanded ? user.currentGoals.length : 2).map((goal, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start">
                  <span className="mr-2">•</span>
                  <span>{goal}</span>
                </li>
              ))}
              {user.currentGoals.length > 2 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{user.currentGoals.length - 2} more goals
                </Button>
              )}
            </ul>
          </div>
        )}

        {/* Professional Interests */}
        {user.interests && user.interests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Star className="h-4 w-4 mr-1" />
              Interests
            </h4>
            <div className="flex flex-wrap gap-1">
              {user.interests.slice(0, isExpanded ? user.interests.length : 3).map((interest, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {user.interests.length > 3 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setIsExpanded(true)}
                >
                  +{user.interests.length - 3} more
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(user.linkedinUrl || user.githubUrl || user.personalWebsite) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              Links
            </h4>
            <div className="flex space-x-2">
              {user.linkedinUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {user.githubUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={user.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {user.personalWebsite && (
                <Button variant="outline" size="sm" asChild>
                  <a href={user.personalWebsite} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* AI Context Indicator */}
        {hasContextualData && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                AI Context Available
              </span>
              <Badge variant="outline" className="text-xs">
                Enhanced
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && onEdit && (
          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onEdit(user)}
              className="w-full"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

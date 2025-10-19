"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PermissionLevel, PermissionService } from "@/lib/permissions"
import { X, Users, Shield, Lock, Globe } from "lucide-react"

interface PermissionManagerProps {
  pageId: string
  currentLevel: PermissionLevel
  onLevelChange: (level: PermissionLevel) => void
  onClose: () => void
}

export function PermissionManager({ 
  pageId, 
  currentLevel, 
  onLevelChange, 
  onClose 
}: PermissionManagerProps) {
  const [selectedLevel, setSelectedLevel] = useState<PermissionLevel>(currentLevel)

  const handleSave = () => {
    onLevelChange(selectedLevel)
    onClose()
  }

  const getLevelIcon = (level: PermissionLevel) => {
    switch (level) {
      case 'public':
        return <Globe className="h-4 w-4" />
      case 'team':
        return <Users className="h-4 w-4" />
      case 'private':
        return <Lock className="h-4 w-4" />
      case 'restricted':
        return <Shield className="h-4 w-4" />
      default:
        return <Lock className="h-4 w-4" />
    }
  }

  const getLevelDescription = (level: PermissionLevel) => {
    switch (level) {
      case 'public':
        return 'Anyone with access to the workspace can view this page'
      case 'team':
        return 'All team members can view and edit this page'
      case 'private':
        return 'Only specific users can view this page'
      case 'restricted':
        return 'Very limited access - only administrators and specific users'
      default:
        return 'Private access'
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Page Permissions</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Permission Level</label>
          <Select value={selectedLevel} onValueChange={(value) => setSelectedLevel(value as PermissionLevel)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Public</span>
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Team</span>
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Private</span>
                </div>
              </SelectItem>
              <SelectItem value="restricted">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Restricted</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            {getLevelIcon(selectedLevel)}
            <span className="font-medium">{PermissionService.getPermissionLevelDisplay(selectedLevel)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {getLevelDescription(selectedLevel)}
          </p>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
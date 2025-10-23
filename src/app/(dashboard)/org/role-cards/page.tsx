"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateRoleCardDialog } from '@/components/org/create-role-card-dialog'
import { 
  Building, 
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Edit,
  Trash2,
  Calendar,
  User
} from 'lucide-react'

interface RoleCard {
  id: string
  roleName: string
  department: string
  jobFamily: string
  level: string
  roleDescription: string
  createdAt: string
  createdBy: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export default function RoleCardsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [roleCards, setRoleCards] = useState<RoleCard[]>([])
  const [loadingCards, setLoadingCards] = useState(true)

  const workspaceId = 'cmgl0f0wa00038otlodbw5jhn' // Use the actual workspace ID

  const loadRoleCards = async () => {
    try {
      setLoadingCards(true)
      const response = await fetch(`/api/role-cards?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setRoleCards(data || [])
      } else {
        console.error('Failed to load role cards')
        setRoleCards([])
      }
    } catch (error) {
      console.error('Error loading role cards:', error)
      setRoleCards([])
    } finally {
      setLoadingCards(false)
    }
  }

  useEffect(() => {
    loadRoleCards()
  }, [])

  const handleCreateRoleCard = async (data: { roleName: string; department: string; roleDescription: string; jobFamily: string; level: string }) => {
    setLoading(true)
    try {
      const response = await fetch('/api/role-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          workspaceId
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Role card created:', result.roleCard)
        
        // Close dialog
        setShowCreateDialog(false)
        
        // Reload role cards
        await loadRoleCards()
        
        alert(`Role card "${data.roleName}" (${data.level} ${data.jobFamily}) in ${data.department} created successfully!`)
      } else {
        const errorData = await response.json()
        console.error('Error creating role card:', errorData)
        alert('Failed to create role card. Please try again.')
      }
    } catch (error) {
      console.error('Error creating role card:', error)
      alert('Failed to create role card. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/org')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Org Chart
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building className="h-8 w-8" />
              Role Cards
            </h1>
            <p className="text-muted-foreground">
              Manage and organize role definitions across your organization
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role Card
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search role cards..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Area */}
      <div className="space-y-4">
        {loadingCards ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading role cards...</p>
              </div>
            </CardContent>
          </Card>
        ) : roleCards && roleCards.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Role Cards Yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first role card to define positions, responsibilities, and requirements for your organization.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Role Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Role Cards Grid/List */
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {roleCards && roleCards.map((card) => (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{card.roleName}</CardTitle>
                      <div className="mt-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">{card.department}</Badge>
                          <Badge variant="outline">{card.jobFamily}</Badge>
                          <Badge variant="outline">{card.level}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: card.roleDescription }}
                  />
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{card.createdBy.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(card.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Role Card Dialog */}
      <CreateRoleCardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreateRoleCard}
        loading={loading}
      />
    </div>
  )
}

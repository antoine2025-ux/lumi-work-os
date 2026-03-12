"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, MoreHorizontal, Edit, Trash2, Award } from "lucide-react";
import { PositionForm } from "@/components/org/position-form-simple";
import { RoleCardForm } from "@/components/org/role-card-form";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Team {
  id: string;
  name: string;
  departmentId?: string;
  department?: { id: string; name: string };
}

interface Position {
  id: string;
  title: string | null;
  level: number;
  teamId: string | null;
  teamName: string | null;
}

interface RoleTemplate {
  id: string;
  roleName: string;
  jobFamily: string;
  level: string;
  roleDescription: string;
  responsibilities: string[];
  keyMetrics: string[];
  positionId: string | null;
  skillsCount: number;
}

interface PositionsClientProps {
  positions: Position[];
  teams: Team[];
  roleTemplates: RoleTemplate[];
  workspaceId: string;
}

export function PositionsClient({ positions, teams, roleTemplates, workspaceId }: PositionsClientProps) {
  const router = useRouter();
  const permissions = useOrgPermissions();
  
  // Position form state
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  
  // Role template form state
  const [roleTemplateDialogMode, setRoleTemplateDialogMode] = useState<'create' | 'edit'>('create');
  const [roleTemplateDialogOpen, setRoleTemplateDialogOpen] = useState(false);
  const [editingRoleTemplate, setEditingRoleTemplate] = useState<RoleTemplate | null>(null);
  
  const [isDeleting, setIsDeleting] = useState(false);

  function handlePositionSuccess() {
    setPositionDialogOpen(false);
    router.refresh();
  }

  function handleRoleTemplateSuccess() {
    setRoleTemplateDialogOpen(false);
    setEditingRoleTemplate(null);
    router.refresh();
  }

  function openCreateRoleTemplate() {
    setRoleTemplateDialogMode('create');
    setEditingRoleTemplate(null);
    setRoleTemplateDialogOpen(true);
  }

  function openEditRoleTemplate(template: RoleTemplate) {
    setRoleTemplateDialogMode('edit');
    setEditingRoleTemplate(template);
    setRoleTemplateDialogOpen(true);
  }

  async function handleDeleteRoleTemplate(templateId: string, templateName: string) {
    if (!confirm(`Are you sure you want to delete the role template "${templateName}"? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/org/role-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete role template');
      }

      router.refresh();
    } catch (error: unknown) {
      console.error('Error deleting role template:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete role template');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      {/* Positions Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Positions</h2>
            <p className="text-sm text-muted-foreground">Job titles and organizational positions</p>
          </div>
          <Button
            className="bg-[#243B7D] hover:bg-[#1e3a6e] text-foreground"
            onClick={() => setPositionDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </div>

        {positions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {positions.map((pos) => (
              <Card key={pos.id} className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground text-base">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {pos.title ?? "Untitled"}
                    </span>
                    <Badge variant="outline" className="border-slate-600 text-muted-foreground">
                      L{pos.level}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {pos.teamName ?? "No team assigned"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No positions defined yet</p>
              <Button
                className="bg-[#243B7D] hover:bg-[#1e3a6e] text-foreground"
                onClick={() => setPositionDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Position
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Role Templates</h2>
            <p className="text-sm text-muted-foreground">Reusable role definitions with skills and responsibilities</p>
          </div>
          <OrgCapabilityGate
            capability="org:role:create"
            permissions={permissions}
            fallback={null}
          >
            <Button
              className="bg-[#243B7D] hover:bg-[#1e3a6e] text-foreground"
              onClick={openCreateRoleTemplate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Role Template
            </Button>
          </OrgCapabilityGate>
        </div>

        {roleTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleTemplates.map((template) => (
              <Card key={template.id} className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-foreground text-base">
                          {template.roleName}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                          {template.jobFamily} • {template.level}
                        </CardDescription>
                      </div>
                    </div>
                    <OrgCapabilityGate
                      capability="org:role:update"
                      permissions={permissions}
                      fallback={null}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditRoleTemplate(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <OrgCapabilityGate
                            capability="org:role:delete"
                            permissions={permissions}
                            fallback={null}
                          >
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRoleTemplate(template.id, template.roleName)}
                              className="text-destructive"
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </OrgCapabilityGate>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </OrgCapabilityGate>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.roleDescription}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {template.responsibilities.length > 0 && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {template.responsibilities.length} responsibilities
                      </Badge>
                    )}
                    {template.skillsCount > 0 && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {template.skillsCount} skills
                      </Badge>
                    )}
                    {template.keyMetrics.length > 0 && (
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {template.keyMetrics.length} metrics
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No role templates defined yet</p>
              <OrgCapabilityGate
                capability="org:role:create"
                permissions={permissions}
                fallback={null}
              >
                <Button
                  className="bg-[#243B7D] hover:bg-[#1e3a6e] text-foreground"
                  onClick={openCreateRoleTemplate}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Role Template
                </Button>
              </OrgCapabilityGate>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Position Form Dialog */}
      <PositionForm
        isOpen={positionDialogOpen}
        onClose={() => setPositionDialogOpen(false)}
        onSuccess={handlePositionSuccess}
        workspaceId={workspaceId}
        teams={teams}
      />

      {/* Role Template Form Dialog */}
      <RoleCardForm
        mode={roleTemplateDialogMode}
        initialData={editingRoleTemplate ?? undefined}
        workspaceId={workspaceId}
        isOpen={roleTemplateDialogOpen}
        onClose={() => {
          setRoleTemplateDialogOpen(false);
          setEditingRoleTemplate(null);
        }}
        onSuccess={handleRoleTemplateSuccess}
      />

    </>
  );
}

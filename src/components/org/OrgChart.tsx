"use client";

/**
 * Org Chart Component
 * 
 * Phase 4: Visual org chart that projects existing position/person data
 * into a hierarchical tree visualization.
 * 
 * Key principle: This is a VIEW, not a data source. All data comes from
 * the projection layer (buildOrgChartTree).
 */

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  User,
  Users,
  Building2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types from projection layer
type OrgChartNode = {
  id: string;
  type: "person" | "position" | "team" | "department";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  positionId?: string;
  positionTitle?: string;
  level?: number;
  personId?: string;
  personName?: string;
  personEmail?: string;
  teamId?: string;
  teamName?: string;
  departmentId?: string;
  departmentName?: string;
  parentId?: string;
  children: OrgChartNode[];
  childCount: number;
  isVacant: boolean;
  hasIssues: boolean;
  issueTypes?: string[];
  isExpanded?: boolean;
  hasHiddenChildren?: boolean;
};

type OrgChartTree = {
  root: OrgChartNode | null;
  nodes: OrgChartNode[];
  nodeCount: number;
  maxDepth: number;
  cycles: string[][];
  orphanNodes: OrgChartNode[];
  workspaceId: string;
  generatedAt: Date;
};

// Component props
interface OrgChartProps {
  workspaceId: string;
  className?: string;
  onNodeClick?: (node: OrgChartNode) => void;
  initiallyExpandedLevels?: number;
}

/**
 * Main Org Chart component
 */
export function OrgChart({
  workspaceId,
  className,
  onNodeClick,
  initiallyExpandedLevels = 3,
}: OrgChartProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Fetch org chart data
  const { data: tree, isLoading, error, refetch } = useQuery<OrgChartTree>({
    queryKey: ["org-chart", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/org/chart?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to load org chart");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize expanded state based on depth
  useMemo(() => {
    if (tree?.root) {
      const newExpanded = new Set<string>();
      
      function expandToDepth(node: OrgChartNode, depth: number) {
        if (depth <= initiallyExpandedLevels) {
          newExpanded.add(node.id);
          for (const child of node.children) {
            expandToDepth(child, depth + 1);
          }
        }
      }
      
      expandToDepth(tree.root, 1);
      setExpandedNodes(newExpanded);
    }
  }, [tree?.root, initiallyExpandedLevels]);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeClick = useCallback(
    (node: OrgChartNode) => {
      setSelectedNodeId(node.id);
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  const expandAll = useCallback(() => {
    if (tree) {
      setExpandedNodes(new Set(tree.nodes.map((n) => n.id)));
    }
  }, [tree]);

  const collapseAll = useCallback(() => {
    if (tree?.root) {
      setExpandedNodes(new Set([tree.root.id]));
    }
  }, [tree]);

  if (isLoading) {
    return <OrgChartSkeleton />;
  }

  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
          <p>Failed to load org chart</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!tree?.root) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No org structure defined yet</p>
          <p className="text-sm mt-1">Create positions to build your org chart</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {tree.nodeCount} positions
          </Badge>
          <Badge variant="outline">
            {tree.maxDepth} levels
          </Badge>
          {tree.cycles.length > 0 && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {tree.cycles.length} cycle(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            <Maximize2 className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            <Minimize2 className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Cycle warnings */}
      {tree.cycles.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center text-destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Circular Reporting Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground">
              {tree.cycles.length} circular reporting chain(s) found. 
              This may cause issues with org structure analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tree view */}
      <Card>
        <CardContent className="p-4">
          <OrgChartNodeView
            node={tree.root}
            depth={0}
            expandedNodes={expandedNodes}
            selectedNodeId={selectedNodeId}
            onToggle={toggleNode}
            onClick={handleNodeClick}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Individual node in the org chart
 */
interface OrgChartNodeViewProps {
  node: OrgChartNode;
  depth: number;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  onToggle: (nodeId: string) => void;
  onClick: (node: OrgChartNode) => void;
}

function OrgChartNodeView({
  node,
  depth,
  expandedNodes,
  selectedNodeId,
  onToggle,
  onClick,
}: OrgChartNodeViewProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="select-none">
      {/* Node */}
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-muted/50",
          isSelected && "bg-primary/10 ring-1 ring-primary/20"
        )}
        style={{ marginLeft: depth * 24 }}
        onClick={() => onClick(node)}
      >
        {/* Expand/collapse toggle */}
        <button
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          )}
        </button>

        {/* Avatar or icon */}
        {node.type === "person" ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={node.imageUrl} alt={node.title} />
            <AvatarFallback className="text-xs">
              {getInitials(node.title)}
            </AvatarFallback>
          </Avatar>
        ) : node.type === "position" ? (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : node.type === "team" ? (
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-purple-600" />
          </div>
        )}

        {/* Name and title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              node.isVacant && "text-muted-foreground italic"
            )}>
              {node.title}
            </span>
            {node.isVacant && (
              <Badge variant="outline" className="text-xs">Vacant</Badge>
            )}
            {node.hasIssues && (
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            )}
          </div>
          {node.subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {node.subtitle}
            </div>
          )}
        </div>

        {/* Team badge */}
        {node.teamName && (
          <Badge variant="secondary" className="text-xs">
            {node.teamName}
          </Badge>
        )}

        {/* Child count */}
        {hasChildren && !isExpanded && (
          <Badge variant="outline" className="text-xs">
            +{node.childCount}
          </Badge>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-muted ml-5">
          {node.children.map((child) => (
            <OrgChartNodeView
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              onToggle={onToggle}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton
 */
function OrgChartSkeleton() {
  return (
    <Card className="p-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="pl-6 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-2/3" />
          <div className="pl-6 space-y-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Get initials from name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default OrgChart;


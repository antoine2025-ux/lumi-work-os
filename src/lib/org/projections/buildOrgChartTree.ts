/**
 * Org Chart Tree Builder
 * 
 * Phase 4: Builds a hierarchical tree structure from existing org data
 * for rendering the org chart visualization.
 * 
 * Key principle: The org chart is a VIEW, not a data model.
 * It projects existing position/person relationships into a tree structure.
 */

import { prisma } from "@/lib/db";
import { detectReportingCycles } from "../deriveIssues";

// Org chart node representing a person/position
export type OrgChartNode = {
  id: string;
  type: "person" | "position" | "team" | "department";
  
  // Display info
  title: string;
  subtitle?: string;
  imageUrl?: string;
  
  // Position info
  positionId?: string;
  positionTitle?: string;
  level?: number;
  
  // Person info (if type === "person")
  personId?: string;
  personName?: string;
  personEmail?: string;
  
  // Team/Department info
  teamId?: string;
  teamName?: string;
  departmentId?: string;
  departmentName?: string;
  
  // Hierarchy
  parentId?: string;
  children: OrgChartNode[];
  childCount: number;
  
  // Status indicators
  isVacant: boolean;
  hasIssues: boolean;
  issueTypes?: string[];
  
  // Expansion state (for large orgs)
  isExpanded?: boolean;
  hasHiddenChildren?: boolean;
};

// Org chart tree with metadata
export type OrgChartTree = {
  root: OrgChartNode | null;
  nodes: OrgChartNode[];
  nodeCount: number;
  maxDepth: number;
  
  // Warnings
  cycles: string[][]; // Position IDs in cycles
  orphanNodes: OrgChartNode[]; // Nodes without valid parent
  
  // Metadata
  workspaceId: string;
  generatedAt: Date;
};

// Position data from database
type PositionData = {
  id: string;
  title: string | null;
  level: number;
  parentId: string | null;
  teamId: string | null;
  userId: string | null;
  isActive: boolean;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
    departmentId: string | null;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
  // Issue flags
  managerIntentionallyUnassigned?: boolean;
  teamIntentionallyUnassigned?: boolean;
};

/**
 * Build org chart tree from positions
 */
export async function buildOrgChartTree(
  workspaceId: string,
  options?: {
    maxDepth?: number;
    includeVacant?: boolean;
    rootPositionId?: string; // Start from specific position
  }
): Promise<OrgChartTree> {
  const includeVacant = options?.includeVacant ?? true;
  const maxDepth = options?.maxDepth ?? 10;

  // Fetch all positions with relationships
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      ...(includeVacant ? {} : { userId: { not: null } }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      team: {
        include: {
          department: true,
        },
      },
    },
    orderBy: [{ level: "asc" }, { title: "asc" }],
  });

  // Detect cycles first
  const cycleResult = detectReportingCycles(
    positions.map((p) => ({ id: p.id, parentId: p.parentId }))
  );

  // Build position map for quick lookup
  const positionMap = new Map<string, PositionData>();
  for (const pos of positions) {
    positionMap.set(pos.id, pos);
  }

  // Build nodes
  const nodeMap = new Map<string, OrgChartNode>();
  const orphanNodes: OrgChartNode[] = [];

  for (const pos of positions) {
    const node = buildNodeFromPosition(pos, cycleResult.cyclePositionIds);
    nodeMap.set(pos.id, node);
  }

  // Build parent-child relationships
  for (const pos of positions) {
    const node = nodeMap.get(pos.id)!;
    
    if (pos.parentId && nodeMap.has(pos.parentId)) {
      node.parentId = pos.parentId;
      const parentNode = nodeMap.get(pos.parentId)!;
      parentNode.children.push(node);
      parentNode.childCount = parentNode.children.length;
    } else if (pos.parentId) {
      // Parent doesn't exist - orphan
      orphanNodes.push(node);
    }
  }

  // Find root nodes (no parent or parent not in set)
  const rootNodes = Array.from(nodeMap.values()).filter(
    (n) => !n.parentId || !nodeMap.has(n.parentId)
  );

  // Calculate max depth
  let calculatedMaxDepth = 0;
  function calculateDepth(node: OrgChartNode, depth: number): void {
    calculatedMaxDepth = Math.max(calculatedMaxDepth, depth);
    if (depth < maxDepth) {
      for (const child of node.children) {
        calculateDepth(child, depth + 1);
      }
    } else {
      // Mark as having hidden children
      if (node.children.length > 0) {
        node.hasHiddenChildren = true;
      }
    }
  }

  for (const root of rootNodes) {
    calculateDepth(root, 1);
  }

  // Sort children by level then name
  function sortChildren(node: OrgChartNode): void {
    node.children.sort((a, b) => {
      const levelDiff = (a.level ?? 0) - (b.level ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return (a.title || "").localeCompare(b.title || "");
    });
    for (const child of node.children) {
      sortChildren(child);
    }
  }

  for (const root of rootNodes) {
    sortChildren(root);
  }

  // Create a virtual root if multiple roots
  let root: OrgChartNode | null = null;
  if (rootNodes.length === 1) {
    root = rootNodes[0];
  } else if (rootNodes.length > 1) {
    // Create virtual organization root
    root = {
      id: `org-root-${workspaceId}`,
      type: "department",
      title: "Organization",
      children: rootNodes,
      childCount: rootNodes.length,
      isVacant: false,
      hasIssues: false,
    };
  }

  return {
    root,
    nodes: Array.from(nodeMap.values()),
    nodeCount: nodeMap.size,
    maxDepth: calculatedMaxDepth,
    cycles: cycleResult.cycleChains,
    orphanNodes,
    workspaceId,
    generatedAt: new Date(),
  };
}

/**
 * Build a node from position data
 */
function buildNodeFromPosition(
  pos: PositionData,
  cyclePositionIds: string[]
): OrgChartNode {
  const isVacant = !pos.userId;
  const isInCycle = cyclePositionIds.includes(pos.id);
  
  // Determine issues
  const issueTypes: string[] = [];
  if (isInCycle) issueTypes.push("CYCLE_DETECTED");
  if (isVacant) issueTypes.push("ORPHAN_POSITION");
  if (!pos.teamId && !pos.teamIntentionallyUnassigned) issueTypes.push("MISSING_TEAM");
  if (!pos.parentId && !pos.managerIntentionallyUnassigned) issueTypes.push("MISSING_MANAGER");

  const node: OrgChartNode = {
    id: pos.id,
    type: isVacant ? "position" : "person",
    
    // Display info
    title: isVacant 
      ? (pos.title || "Vacant Position") 
      : (pos.user?.name || pos.user?.email || "Unknown"),
    subtitle: isVacant ? undefined : pos.title || undefined,
    imageUrl: pos.user?.image || undefined,
    
    // Position info
    positionId: pos.id,
    positionTitle: pos.title || undefined,
    level: pos.level,
    
    // Person info
    personId: pos.userId || undefined,
    personName: pos.user?.name || undefined,
    personEmail: pos.user?.email || undefined,
    
    // Team/Department info
    teamId: pos.team?.id,
    teamName: pos.team?.name,
    departmentId: pos.team?.department?.id,
    departmentName: pos.team?.department?.name,
    
    // Hierarchy
    parentId: pos.parentId || undefined,
    children: [],
    childCount: 0,
    
    // Status
    isVacant,
    hasIssues: issueTypes.length > 0,
    issueTypes: issueTypes.length > 0 ? issueTypes : undefined,
    
    // Expansion
    isExpanded: true,
    hasHiddenChildren: false,
  };

  return node;
}

/**
 * Build org chart grouped by department/team
 */
export async function buildOrgChartByDepartment(
  workspaceId: string
): Promise<{
  departments: {
    id: string;
    name: string;
    teams: {
      id: string;
      name: string;
      tree: OrgChartTree;
    }[];
  }[];
}> {
  // Get departments
  const departments = await prisma.orgDepartment.findMany({
    where: { workspaceId, isActive: true },
    include: {
      teams: {
        where: { isActive: true },
      },
    },
    orderBy: { order: "asc" },
  });

  const result: {
    departments: {
      id: string;
      name: string;
      teams: { id: string; name: string; tree: OrgChartTree }[];
    }[];
  } = { departments: [] };

  for (const dept of departments) {
    const deptData: {
      id: string;
      name: string;
      teams: { id: string; name: string; tree: OrgChartTree }[];
    } = {
      id: dept.id,
      name: dept.name,
      teams: [],
    };

    for (const team of dept.teams) {
      // Build tree for this team's positions
      const positions = await prisma.orgPosition.findMany({
        where: {
          workspaceId,
          teamId: team.id,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          team: {
            include: {
              department: true,
            },
          },
        },
      });

      // Build mini tree for team
      const tree = await buildTeamSubtree(workspaceId, team.id, positions);

      deptData.teams.push({
        id: team.id,
        name: team.name,
        tree,
      });
    }

    result.departments.push(deptData);
  }

  return result;
}

/**
 * Build a subtree for a specific team
 */
async function buildTeamSubtree(
  workspaceId: string,
  teamId: string,
  positions: PositionData[]
): Promise<OrgChartTree> {
  const cycleResult = detectReportingCycles(
    positions.map((p) => ({ id: p.id, parentId: p.parentId }))
  );

  const nodeMap = new Map<string, OrgChartNode>();

  for (const pos of positions) {
    const node = buildNodeFromPosition(pos, cycleResult.cyclePositionIds);
    nodeMap.set(pos.id, node);
  }

  // Build relationships (only within team)
  for (const pos of positions) {
    const node = nodeMap.get(pos.id)!;
    if (pos.parentId && nodeMap.has(pos.parentId)) {
      node.parentId = pos.parentId;
      const parentNode = nodeMap.get(pos.parentId)!;
      parentNode.children.push(node);
      parentNode.childCount = parentNode.children.length;
    }
  }

  const rootNodes = Array.from(nodeMap.values()).filter(
    (n) => !n.parentId || !nodeMap.has(n.parentId)
  );

  let root: OrgChartNode | null = null;
  if (rootNodes.length === 1) {
    root = rootNodes[0];
  } else if (rootNodes.length > 1) {
    root = {
      id: `team-root-${teamId}`,
      type: "team",
      title: "Team",
      children: rootNodes,
      childCount: rootNodes.length,
      isVacant: false,
      hasIssues: false,
    };
  }

  return {
    root,
    nodes: Array.from(nodeMap.values()),
    nodeCount: nodeMap.size,
    maxDepth: calculateTreeDepth(root),
    cycles: cycleResult.cycleChains,
    orphanNodes: [],
    workspaceId,
    generatedAt: new Date(),
  };
}

/**
 * Calculate tree depth
 */
function calculateTreeDepth(node: OrgChartNode | null): number {
  if (!node) return 0;
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(calculateTreeDepth));
}

/**
 * Flatten tree to array (for list views)
 */
export function flattenOrgChartTree(
  tree: OrgChartTree
): (OrgChartNode & { depth: number })[] {
  const result: (OrgChartNode & { depth: number })[] = [];

  function traverse(node: OrgChartNode, depth: number): void {
    result.push({ ...node, depth });
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  if (tree.root) {
    traverse(tree.root, 0);
  }

  return result;
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(
  tree: OrgChartTree,
  id: string
): OrgChartNode | null {
  function search(node: OrgChartNode): OrgChartNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  if (tree.root) {
    return search(tree.root);
  }
  return null;
}

/**
 * Get path from root to a node
 */
export function getPathToNode(
  tree: OrgChartTree,
  nodeId: string
): OrgChartNode[] {
  const path: OrgChartNode[] = [];

  function search(node: OrgChartNode, currentPath: OrgChartNode[]): boolean {
    currentPath.push(node);
    if (node.id === nodeId) {
      path.push(...currentPath);
      return true;
    }
    for (const child of node.children) {
      if (search(child, [...currentPath])) {
        return true;
      }
    }
    return false;
  }

  if (tree.root) {
    search(tree.root, []);
  }

  return path;
}


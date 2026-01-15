/**
 * Types for Organization Structure Tree View
 */

export type OrgTreeNodeType = "department" | "team";

export interface OrgTreeNode {
  id: string;
  type: OrgTreeNodeType;
  name: string;
  peopleCount: number;
  teamCount?: number; // only for departments
  lead?: {
    id: string;
    name: string;
    initials: string;
  };
  children?: OrgTreeNode[]; // teams under department
}

export type ViewMode = "list" | "tree";


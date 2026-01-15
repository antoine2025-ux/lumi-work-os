export type OrgChartNode = {
  id: string;
  name: string;
  type: "department" | "team";
  parentId?: string | null;
  children?: OrgChartNode[];

  // Existing
  memberCount?: number;

  // New, optional metadata
  leadName?: string;
  leadRole?: string;
  openRolesCount?: number;
};

export type OrgChartExpandState = {
  expanded: Record<string, boolean>;
};


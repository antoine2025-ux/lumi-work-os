"use client";

import { TreeNode } from "./TreeNode";
import type { OrgTreeNode } from "./types";

type TreeViewProps = {
  nodes: OrgTreeNode[];
};

/**
 * Tree View - Hierarchical display of departments and teams
 */
export function TreeView({ nodes }: TreeViewProps) {
  return (
    <div className="space-y-4">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} level={1} />
      ))}
    </div>
  );
}


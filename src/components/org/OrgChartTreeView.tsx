"use client";

import { useMemo, useCallback, useState } from "react";
import Tree, { RawNodeDatum, TreeNodeDatum, TreeNodeEventCallback } from "react-d3-tree";
import { OrgChartTree, OrgChartNode } from "@/lib/org/projections/buildOrgChartTree";
import { OrgChartNodeCard } from "./OrgChartNodeCard";

interface OrgChartTreeViewProps {
  tree: OrgChartTree;
  onNodeClick?: (node: OrgChartNode) => void;
}

/**
 * OrgChartTreeView
 * 
 * Renders a hierarchical org chart using react-d3-tree.
 * Clean nodes on dark page with subtle blue glow, muted connecting lines.
 * Linear / Vercel dashboard aesthetic.
 */
export function OrgChartTreeView({ tree, onNodeClick }: OrgChartTreeViewProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Convert OrgChartNode → react-d3-tree RawNodeDatum
  const treeData = useMemo(() => {
    if (!tree.root) return null;

    function convertNode(node: OrgChartNode): RawNodeDatum {
      return {
        name: node.personName || node.title || "Unknown",
        attributes: {
          title: node.positionTitle || "",
          department: node.departmentName || "",
          team: node.teamName || "",
          id: node.id,
          isVacant: node.isVacant ? "true" : "false",
          isRoot: !node.parentId ? "true" : "false",
        },
        children: node.children.map(convertNode),
      };
    }

    return convertNode(tree.root);
  }, [tree]);

  // Handle node click
  const handleNodeClick: TreeNodeEventCallback = useCallback(
    (nodeDatum) => {
      const datum = nodeDatum.data as TreeNodeDatum;
      if (onNodeClick && datum.attributes?.id) {
        const nodeId = datum.attributes.id as string;
        const node = tree.nodes.find((n) => n.id === nodeId);
        if (node) onNodeClick(node);
      }
    },
    [onNodeClick, tree.nodes]
  );

  // ── Node renderer ──────────────────────────────────────────────────
  const renderNode = useCallback(
    ({ nodeDatum }: { nodeDatum: TreeNodeDatum }) => {
      const nodeId = nodeDatum.attributes?.id as string;
      const node = tree.nodes.find((n) => n.id === nodeId);
      
      if (!node) return null;

      const isHovered = hoveredNodeId === nodeId;
      const cardWidth = 220;
      const cardHeight = 140;

      return (
        <g>
          <foreignObject
            x={-cardWidth / 2}
            y={-cardHeight / 2}
            width={cardWidth}
            height={cardHeight}
          >
            <OrgChartNodeCard
              node={node}
              isHovered={isHovered}
              onHover={(hovered) => setHoveredNodeId(hovered ? nodeId : null)}
              onClick={() => onNodeClick?.(node)}
            />
          </foreignObject>
        </g>
      );
    },
    [hoveredNodeId, tree.nodes, onNodeClick]
  );

  // ── Empty state ────────────────────────────────────────────────────
  if (!treeData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "500px", color: "#94a3b8" }}>
        No org chart data available
      </div>
    );
  }

  // ── Tree ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-slate-800/50 bg-slate-900/40 p-6">
      <div style={{ position: "relative", width: "100%", height: "600px" }}>
        {/* Subtle hint — muted slate, top-left */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            zIndex: 10,
            fontSize: "11px",
            color: "#64748b",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          Drag to pan &middot; Scroll to zoom &middot; Click to view
        </div>

        {/* Stats — top-right */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            zIndex: 10,
            fontSize: "11px",
            color: "#64748b",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {tree.nodeCount} people &middot; {tree.maxDepth} levels
          {tree.cycles.length > 0 && (
            <span style={{ color: "#f59e0b" }}> &middot; {tree.cycles.length} cycles</span>
          )}
        </div>

        {/* Lines: subtle slate-600 with reduced opacity */}
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 100 }}
          nodeSize={{ x: 260, y: 180 }}
          separation={{ siblings: 1.2, nonSiblings: 1.5 }}
          renderCustomNodeElement={renderNode}
          onNodeClick={handleNodeClick}
          zoomable
          draggable
          enableLegacyTransitions
        />
      </div>
    </div>
  );
}

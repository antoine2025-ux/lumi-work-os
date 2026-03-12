"use client";

import { useMemo, useCallback, useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { tree as d3Tree, hierarchy } from "d3-hierarchy";
import Tree, { RawNodeDatum, TreeNodeDatum, TreeNodeEventCallback } from "react-d3-tree";
import { OrgChartTree, OrgChartNode } from "@/lib/org/projections/buildOrgChartTree";
import { OrgChartNodeCard } from "./OrgChartNodeCard";

const NODE_SIZE = { x: 260, y: 180 };
const SEPARATION = { siblings: 1.2, nonSiblings: 1.5 };
const CONTAINER_HEIGHT = 600;
const DEFAULT_ZOOM = 0.9;

export interface OrgChartTreeViewRef {
  centerOnMe: () => void;
}

interface OrgChartTreeViewProps {
  tree: OrgChartTree;
  currentUserId?: string | null;
  onNodeClick?: (node: OrgChartNode) => void;
}

/**
 * Compute node position using same d3 layout as react-d3-tree
 */
function getNodePosition(
  treeData: RawNodeDatum,
  targetNodeId: string
): { x: number; y: number } | null {
  const root = hierarchy(treeData);
  const treeLayout = d3Tree<RawNodeDatum>()
    .nodeSize([NODE_SIZE.x, NODE_SIZE.y])
    .separation(() => 1);
  const laidOut = treeLayout(root);

  let found: { x: number; y: number } | null = null;
  laidOut.each((node) => {
    const attrs = node.data?.attributes as Record<string, unknown> | undefined;
    if (attrs?.id === targetNodeId) {
      found = { x: node.x, y: node.y };
    }
  });
  return found;
}

/**
 * OrgChartTreeView
 *
 * Renders a hierarchical org chart using react-d3-tree.
 * Centers on current user by default; supports "Find me" via ref.
 */
export const OrgChartTreeView = forwardRef<OrgChartTreeViewRef, OrgChartTreeViewProps>(
  function OrgChartTreeView({ tree, currentUserId, onNodeClick }, ref) {
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const treeRef = useRef<{ centerNode: (node: { x: number; y: number }) => void } | null>(null);
    const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
    const [initialTranslate, setInitialTranslate] = useState<{ x: number; y: number }>({ x: 400, y: 100 });
    const [initialZoom] = useState(DEFAULT_ZOOM);

    // Measure container for dimensions
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        if (el) {
          setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
        }
      });
      ro.observe(el);
      setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
      return () => ro.disconnect();
    }, []);

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

    // Expose centerOnMe via ref
    useImperativeHandle(
      ref,
      () => ({
        centerOnMe: () => {
          if (!treeData || !currentUserId || !dimensions) return;
          const myNode = tree.nodes.find((n) => n.personId === currentUserId);
          if (!myNode) return;
          const pos = getNodePosition(treeData, myNode.id);
          if (!pos) return;
          treeRef.current?.centerNode(pos);
        },
      }),
      [treeData, currentUserId, tree.nodes, dimensions]
    );

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
        const isCurrentUser = Boolean(currentUserId && node.personId === currentUserId);
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
                isCurrentUser={isCurrentUser}
                onHover={(hovered) => setHoveredNodeId(hovered ? nodeId : null)}
                onClick={() => onNodeClick?.(node)}
              />
            </foreignObject>
          </g>
        );
      },
      [hoveredNodeId, tree.nodes, onNodeClick, currentUserId]
    );

    // ── Empty state ────────────────────────────────────────────────────
    if (!treeData) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "500px",
            color: "#94a3b8",
          }}
        >
          No org chart data available
        </div>
      );
    }

    // ── Tree ───────────────────────────────────────────────────────────
    return (
      <div className="rounded-2xl border border-border/50 bg-card/40 p-6">
        <div
          ref={containerRef}
          style={{ position: "relative", width: "100%", height: `${CONTAINER_HEIGHT}px` }}
        >
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
            ref={treeRef as React.RefObject<never>}
            data={treeData}
            orientation="vertical"
            pathFunc="step"
            translate={initialTranslate}
            zoom={initialZoom}
            dimensions={dimensions ?? undefined}
            nodeSize={NODE_SIZE}
            separation={SEPARATION}
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
);

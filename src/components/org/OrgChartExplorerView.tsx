"use client";

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { ChevronUp, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepartmentAccent } from "@/components/org/structure/accent-colors";
import type { OrgChartTree, OrgChartNode } from "@/lib/org/projections/buildOrgChartTree";

// ── Constants ────────────────────────────────────────────────────────────────

const CARD_WIDTH = 200;
const CARD_GAP = 24;
const CONNECTOR_HEIGHT = 64;

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgChartExplorerViewRef {
  resetToMe: () => void;
}

interface OrgChartExplorerViewProps {
  tree: OrgChartTree;
  currentUserId?: string | null;
  onNodeClick?: (node: OrgChartNode) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEPARTMENT_ACCENT_MAP: Record<string, number> = {
  Design: 0,
  Engineering: 1,
  Marketing: 2,
  Product: 3,
  Sales: 4,
  Operations: 5,
  People: 6,
};

function getDeptIndex(name?: string): number {
  if (!name) return 0;
  if (name in DEPARTMENT_ACCENT_MAP) return DEPARTMENT_ACCENT_MAP[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 7;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ── Connector Lines (SVG) ────────────────────────────────────────────────────

function ConnectorLines({
  parentCenterX,
  childCenterXs,
  width,
}: {
  parentCenterX: number;
  childCenterXs: number[];
  width: number;
}) {
  if (childCenterXs.length === 0) return null;

  const railY = CONNECTOR_HEIGHT / 2;
  const leftX = Math.min(...childCenterXs);
  const rightX = Math.max(...childCenterXs);

  return (
    <svg
      width={width}
      height={CONNECTOR_HEIGHT}
      className="shrink-0"
      style={{ display: "block" }}
    >
      {/* Vertical from parent down to rail */}
      <line
        x1={parentCenterX}
        y1={0}
        x2={parentCenterX}
        y2={railY}
        className="stroke-border"
        strokeWidth={1.5}
      />
      {/* Horizontal rail */}
      {childCenterXs.length > 1 && (
        <line
          x1={leftX}
          y1={railY}
          x2={rightX}
          y2={railY}
          className="stroke-border"
          strokeWidth={1.5}
        />
      )}
      {/* Vertical from rail down to each child */}
      {childCenterXs.map((cx, i) => (
        <line
          key={i}
          x1={cx}
          y1={railY}
          x2={cx}
          y2={CONNECTOR_HEIGHT}
          className="stroke-border"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

// ── Explorer Node Card ───────────────────────────────────────────────────────

function ExplorerNodeCard({
  node,
  isCurrentUser,
  isExpanded,
  onToggleExpand,
  onExpandParent,
  onClick,
  parentName,
}: {
  node: OrgChartNode;
  isCurrentUser: boolean;
  isExpanded: boolean;
  onToggleExpand?: () => void;
  onExpandParent?: () => void;
  onClick: () => void;
  parentName?: string | null;
}) {
  const accent = getDepartmentAccent(getDeptIndex(node.departmentName));
  const displayName = node.personName || node.positionTitle || "Unknown";
  const title = node.positionTitle || "";
  const team = node.teamName || node.departmentName || "";
  const initials = getInitials(node.personName);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-4 cursor-pointer",
        "transition-all duration-200 shrink-0",
        "shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        "hover:border-primary/50 hover:shadow-[0_6px_20px_rgba(0,0,0,0.35)]",
        isCurrentUser && "border-primary ring-1 ring-primary/20",
        !isCurrentUser && "border-border"
      )}
      style={{ width: CARD_WIDTH }}
      onClick={onClick}
    >
      {/* "You" badge */}
      {isCurrentUser && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm z-10">
          You
        </span>
      )}

      {/* Reports-to link (above card content) */}
      {parentName && onExpandParent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpandParent();
          }}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-2 -mt-0.5"
        >
          <ChevronUp className="h-3 w-3" />
          <span className="truncate">Reports to {parentName}</span>
        </button>
      )}

      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg shrink-0 text-xs font-semibold",
            accent.iconBg,
            "border",
            accent.iconBorder
          )}
        >
          {node.imageUrl ? (
            <img
              src={node.imageUrl}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
          ) : node.isVacant ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="text-foreground">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "text-sm font-medium leading-snug truncate",
              node.isVacant ? "text-muted-foreground italic" : "text-foreground"
            )}
            title={displayName}
          >
            {displayName}
          </div>
        </div>
      </div>

      {/* Title */}
      {title && (
        <div className="text-xs text-muted-foreground truncate mb-0.5" title={title}>
          {title}
        </div>
      )}

      {/* Team */}
      {team && (
        <div className="text-xs text-muted-foreground/70 truncate" title={team}>
          {team}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reports pill */}
      {node.childCount > 0 && onToggleExpand && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={cn(
            "mt-3 mx-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            isExpanded
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-accent text-accent-foreground hover:bg-accent/80 border border-transparent"
          )}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
          {node.childCount} {node.childCount === 1 ? "report" : "reports"}
        </button>
      )}

      {/* Vacant badge */}
      {node.isVacant && (
        <div className="mt-2 text-center">
          <span className="text-[10px] uppercase tracking-wider text-amber-400/80">
            Vacant
          </span>
        </div>
      )}
    </div>
  );
}

// ── Level Row ────────────────────────────────────────────────────────────────

function LevelRow({
  nodes,
  currentUserId,
  expandedNodeIds,
  nodeMap,
  onToggleExpand,
  onExpandParent,
  onNodeClick,
  rowRef,
}: {
  nodes: OrgChartNode[];
  currentUserId?: string | null;
  expandedNodeIds: Set<string>;
  nodeMap: Map<string, OrgChartNode>;
  onToggleExpand: (nodeId: string) => void;
  onExpandParent: (nodeId: string) => void;
  onNodeClick: (node: OrgChartNode) => void;
  rowRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const needsScroll = nodes.length > 6;

  return (
    <div
      ref={rowRef}
      className={cn(
        "flex justify-center",
        needsScroll
          ? "overflow-x-auto pb-2 max-w-full px-4 scrollbar-thin"
          : "flex-wrap"
      )}
      style={{ gap: CARD_GAP }}
    >
      {nodes.map((node) => {
        const parent = node.parentId ? nodeMap.get(node.parentId) : undefined;
        return (
          <ExplorerNodeCard
            key={node.id}
            node={node}
            isCurrentUser={Boolean(currentUserId && node.personId === currentUserId)}
            isExpanded={expandedNodeIds.has(node.id)}
            onToggleExpand={
              node.childCount > 0 ? () => onToggleExpand(node.id) : undefined
            }
            onExpandParent={
              parent ? () => onExpandParent(node.id) : undefined
            }
            onClick={() => onNodeClick(node)}
            parentName={parent?.personName || parent?.positionTitle}
          />
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const OrgChartExplorerView = forwardRef<
  OrgChartExplorerViewRef,
  OrgChartExplorerViewProps
>(function OrgChartExplorerView({ tree, currentUserId, onNodeClick }, ref) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const focusRowRef = useRef<HTMLDivElement>(null);

  // Build lookup maps
  const nodeMap = useMemo(() => {
    const map = new Map<string, OrgChartNode>();
    for (const n of tree.nodes) map.set(n.id, n);
    return map;
  }, [tree.nodes]);

  // Find current user's node
  const myNode = useMemo(
    () =>
      currentUserId
        ? tree.nodes.find((n) => n.personId === currentUserId) ?? tree.root
        : tree.root,
    [tree.nodes, tree.root, currentUserId]
  );

  // Initialize: expand just the user's node
  useEffect(() => {
    if (myNode) {
      setExpandedNodeIds(new Set([myNode.id]));
    }
  }, [myNode]);

  // Scroll focus row into view on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      focusRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // resetToMe
  useImperativeHandle(
    ref,
    () => ({
      resetToMe: () => {
        if (myNode) {
          setExpandedNodeIds(new Set([myNode.id]));
          setTimeout(() => {
            focusRowRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 50);
        }
      },
    }),
    [myNode]
  );

  // Toggle expand/collapse
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        // Also collapse all descendants
        const removeDescendants = (id: string) => {
          const n = nodeMap.get(id);
          if (!n) return;
          for (const child of n.children) {
            next.delete(child.id);
            removeDescendants(child.id);
          }
        };
        removeDescendants(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, [nodeMap]);

  // Expand parent: reveal the parent and its children (siblings)
  const handleExpandParent = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node?.parentId) return;
      const parent = nodeMap.get(node.parentId);
      if (!parent) return;
      setExpandedNodeIds((prev) => {
        const next = new Set(prev);
        next.add(parent.id);
        // If parent has a parent, we want to show the parent in context
        // but we don't auto-expand grandparent's children
        return next;
      });
    },
    [nodeMap]
  );

  const handleNodeClick = useCallback(
    (node: OrgChartNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Build visible levels: walk from ancestors down through expanded nodes
  const levels = useMemo(() => {
    if (!myNode) return [];

    // Collect ancestor chain up to root (or first unexpanded ancestor)
    const ancestorChain: OrgChartNode[] = [];
    let current: OrgChartNode | undefined = myNode;
    while (current?.parentId) {
      const parent = nodeMap.get(current.parentId);
      if (!parent) break;
      ancestorChain.unshift(parent);
      if (!expandedNodeIds.has(parent.id)) {
        // This parent is the topmost visible — show it but don't go further
        break;
      }
      current = parent;
    }

    // Build levels top-down
    type Level = { parentId: string | null; nodes: OrgChartNode[]; isFocusLevel: boolean };
    const result: Level[] = [];

    // Render ancestor levels
    for (const ancestor of ancestorChain) {
      if (expandedNodeIds.has(ancestor.id)) {
        // Show this ancestor as a single-node level (unless it's already shown as a child)
        const alreadyShown = result.some((lvl) =>
          lvl.nodes.some((n) => n.id === ancestor.id)
        );
        if (!alreadyShown) {
          result.push({
            parentId: ancestor.parentId ?? null,
            nodes: [ancestor],
            isFocusLevel: false,
          });
        }
        // Show its children (which includes the next ancestor or myNode)
        if (ancestor.children.length > 0) {
          result.push({
            parentId: ancestor.id,
            nodes: ancestor.children,
            isFocusLevel: ancestor.children.some((c) => c.id === myNode.id),
          });
        }
      } else {
        // Topmost unexpanded ancestor: show just it
        result.push({
          parentId: ancestor.parentId ?? null,
          nodes: [ancestor],
          isFocusLevel: false,
        });
      }
    }

    // If myNode is root or has no ancestors in the chain, ensure it's shown
    if (ancestorChain.length === 0) {
      result.push({
        parentId: myNode.parentId ?? null,
        nodes: [myNode],
        isFocusLevel: true,
      });
    }

    // Walk down from myNode through expanded descendants
    const queue: OrgChartNode[] = [myNode];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      if (expandedNodeIds.has(parent.id) && parent.children.length > 0) {
        const alreadyShown = result.some(
          (lvl) =>
            lvl.parentId === parent.id &&
            lvl.nodes.length === parent.children.length
        );
        if (!alreadyShown) {
          result.push({
            parentId: parent.id,
            nodes: parent.children,
            isFocusLevel: false,
          });
        }
        for (const child of parent.children) {
          if (expandedNodeIds.has(child.id)) {
            queue.push(child);
          }
        }
      }
    }

    return result;
  }, [myNode, expandedNodeIds, nodeMap]);

  // Empty state
  if (!myNode || tree.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No org chart data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-border/50 bg-card/40 p-6 overflow-auto"
      style={{ minHeight: 400, maxHeight: 700 }}
    >
      {/* Stats strip */}
      <div className="flex items-center justify-between mb-4 text-[11px] text-muted-foreground">
        <span>Click cards to explore · Expand reports to drill down</span>
        <span>
          {tree.nodeCount} people · {tree.maxDepth} levels
        </span>
      </div>

      {/* Levels */}
      <div className="flex flex-col items-center">
        {levels.map((level, idx) => {
          const parentNode = level.parentId
            ? nodeMap.get(level.parentId)
            : undefined;

          // Compute connector positions
          const totalWidth =
            level.nodes.length * CARD_WIDTH +
            (level.nodes.length - 1) * CARD_GAP;
          const startX =
            level.nodes.length <= 6
              ? 0
              : 0;
          const childCenterXs = level.nodes.map(
            (_, i) => startX + i * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2
          );
          const parentCenterX = totalWidth / 2;

          return (
            <div key={`level-${idx}`} className="flex flex-col items-center w-full">
              {/* Connector from previous level */}
              {idx > 0 && parentNode && (
                <ConnectorLines
                  parentCenterX={parentCenterX}
                  childCenterXs={childCenterXs}
                  width={totalWidth}
                />
              )}

              {/* Row of cards */}
              <LevelRow
                nodes={level.nodes}
                currentUserId={currentUserId}
                expandedNodeIds={expandedNodeIds}
                nodeMap={nodeMap}
                onToggleExpand={handleToggleExpand}
                onExpandParent={handleExpandParent}
                onNodeClick={handleNodeClick}
                rowRef={level.isFocusLevel ? focusRowRef : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

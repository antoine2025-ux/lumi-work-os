"use client";

import { useState, useRef, useEffect } from "react";
import { DepartmentNode } from "./DepartmentNode";
import { TeamNode } from "./TeamNode";
import type { OrgTreeNode } from "./types";

type TreeNodeProps = {
  node: OrgTreeNode;
  level: number;
  index?: number;
};

/**
 * Recursive tree node component that handles expand/collapse logic
 * and renders appropriate presentational components
 */
export function TreeNode({ node, level, index = 0 }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll into view when opened (smooth behavior)
  useEffect(() => {
    if (isOpen && contentRef.current && level === 1) {
      const timer = setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, level]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  // Team nodes are leaf nodes - no expansion
  if (node.type === "team") {
    return <TeamNode node={node} index={index} />;
  }

  // Department nodes can expand to show teams
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-4">
      <DepartmentNode node={node} open={isOpen} onToggle={handleToggle} />

      {/* Collapsible children container with premium animation */}
      {hasChildren && (
        <div
          ref={contentRef}
          className={`overflow-hidden ${
            isOpen
              ? "max-h-[2000px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
          style={{
            transition: isOpen
              ? "max-height 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease-out"
              : "max-height 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 140ms ease-out",
          }}
        >
          <div className="pt-4 px-6">
            <div className="grid gap-4 md:grid-cols-2">
              {node.children!.map((child, childIndex) => (
                <div
                  key={child.id}
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(4px)",
                    transition: isOpen
                      ? `opacity 200ms ease-out ${childIndex * 30}ms, transform 200ms ease-out ${childIndex * 30}ms`
                      : "opacity 140ms ease-out, transform 140ms ease-out",
                  }}
                >
                  <TreeNode
                    node={child}
                    level={level + 1}
                    index={childIndex}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


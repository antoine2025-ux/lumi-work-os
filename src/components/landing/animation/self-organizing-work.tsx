"use client";

/**
 * Self-Organizing Work Animation
 * 
 * Visually demonstrates how Loopwell transforms unstructured inputs
 * into an organized system through contextual understanding.
 * 
 * Phases:
 * 1. Raw inputs - Scattered nodes with gentle drift
 * 2. Context formation - Connections appear, central glow pulses
 * 3. Self-organization - Nodes migrate toward clusters
 * 4. Result - Stable equilibrium
 */

import { useEffect, useRef, useState, useCallback } from "react";

type AnimationPhase = 1 | 2 | 3 | 4;

interface NodeConfig {
  id: number;
  initialX: number;
  initialY: number;
  finalX: number;
  finalY: number;
  size: number;
  delay: number;
}

interface ConnectionConfig {
  id: number;
  fromNode: number;
  toNode: number;
  delay: number;
}

interface NodeState {
  x: number;
  y: number;
  opacity: number;
}

// Node configurations - scattered initial, clustered final
const nodeConfigs: NodeConfig[] = [
  // Cluster 1 (top-left area)
  { id: 1, initialX: 15, initialY: 20, finalX: 22, finalY: 28, size: 16, delay: 0 },
  { id: 2, initialX: 75, initialY: 15, finalX: 28, finalY: 22, size: 12, delay: 200 },
  { id: 3, initialX: 10, initialY: 70, finalX: 18, finalY: 35, size: 10, delay: 400 },
  
  // Cluster 2 (center area)
  { id: 4, initialX: 85, initialY: 45, finalX: 48, finalY: 45, size: 20, delay: 100 },
  { id: 5, initialX: 25, initialY: 85, finalX: 52, finalY: 52, size: 14, delay: 300 },
  { id: 6, initialX: 60, initialY: 10, finalX: 45, finalY: 38, size: 12, delay: 500 },
  { id: 7, initialX: 40, initialY: 60, finalX: 55, finalY: 42, size: 10, delay: 150 },
  
  // Cluster 3 (right area)
  { id: 8, initialX: 90, initialY: 75, finalX: 75, finalY: 55, size: 18, delay: 250 },
  { id: 9, initialX: 5, initialY: 50, finalX: 80, finalY: 48, size: 12, delay: 350 },
  { id: 10, initialX: 70, initialY: 90, finalX: 72, finalY: 62, size: 10, delay: 450 },
  
  // Scattered outliers
  { id: 11, initialX: 50, initialY: 5, finalX: 35, finalY: 30, size: 8, delay: 550 },
  { id: 12, initialX: 95, initialY: 25, finalX: 65, finalY: 50, size: 8, delay: 600 },
  { id: 13, initialX: 30, initialY: 40, finalX: 42, finalY: 55, size: 14, delay: 200 },
  { id: 14, initialX: 80, initialY: 60, finalX: 58, finalY: 48, size: 10, delay: 400 },
];

// Connections between nodes
const connections: ConnectionConfig[] = [
  { id: 1, fromNode: 1, toNode: 2, delay: 0 },
  { id: 2, fromNode: 2, toNode: 3, delay: 300 },
  { id: 3, fromNode: 1, toNode: 3, delay: 600 },
  { id: 4, fromNode: 4, toNode: 5, delay: 200 },
  { id: 5, fromNode: 5, toNode: 6, delay: 500 },
  { id: 6, fromNode: 6, toNode: 7, delay: 800 },
  { id: 7, fromNode: 4, toNode: 7, delay: 400 },
  { id: 8, fromNode: 8, toNode: 9, delay: 100 },
  { id: 9, fromNode: 9, toNode: 10, delay: 700 },
  { id: 10, fromNode: 2, toNode: 6, delay: 1000 },
  { id: 11, fromNode: 7, toNode: 8, delay: 1200 },
  { id: 12, fromNode: 13, toNode: 4, delay: 900 },
];

// Easing function for smooth animation
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Linear interpolation
function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function SelfOrganizingWork() {
  const [phase, setPhase] = useState<AnimationPhase>(1);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [nodeStates, setNodeStates] = useState<Map<number, NodeState>>(new Map());
  const [connectionOpacity, setConnectionOpacity] = useState<Map<number, number>>(new Map());
  const [centralGlowOpacity, setCentralGlowOpacity] = useState(0);
  const [driftTime, setDriftTime] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const phaseStartTimeRef = useRef<number>(0);

  // Initialize node states
  useEffect(() => {
    const initialStates = new Map<number, NodeState>();
    nodeConfigs.forEach((node) => {
      initialStates.set(node.id, {
        x: node.initialX,
        y: node.initialY,
        opacity: 0,
      });
    });
    setNodeStates(initialStates);
  }, []);

  // Intersection Observer to trigger animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasStarted) {
            setIsVisible(true);
            setHasStarted(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  // Phase progression
  useEffect(() => {
    if (!isVisible) return;

    const timers: NodeJS.Timeout[] = [];
    phaseStartTimeRef.current = Date.now();

    // Phase 2: Context formation (after 1.5s)
    timers.push(setTimeout(() => {
      setPhase(2);
      phaseStartTimeRef.current = Date.now();
    }, 1500));

    // Phase 3: Self-organization (after 3s)
    timers.push(setTimeout(() => {
      setPhase(3);
      phaseStartTimeRef.current = Date.now();
    }, 3000));

    // Phase 4: Result (after 5s)
    timers.push(setTimeout(() => {
      setPhase(4);
      phaseStartTimeRef.current = Date.now();
    }, 5000));

    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  // Animation loop
  const animate = useCallback(() => {
    if (!isVisible) return;

    const now = Date.now();
    const phaseElapsed = now - phaseStartTimeRef.current;

    setDriftTime((prev) => prev + 16); // ~60fps

    setNodeStates((prevStates) => {
      const newStates = new Map(prevStates);
      
      nodeConfigs.forEach((node) => {
        const current = prevStates.get(node.id);
        if (!current) return;

        let newX = current.x;
        let newY = current.y;
        let newOpacity = current.opacity;

        // Phase 1: Fade in and drift
        if (phase === 1) {
          const fadeProgress = Math.min(1, phaseElapsed / (500 + node.delay));
          newOpacity = fadeProgress;
          
          // Gentle drift
          const driftX = Math.sin((driftTime + node.id * 1000) / 3000) * 0.5;
          const driftY = Math.cos((driftTime + node.id * 500) / 2500) * 0.4;
          newX = node.initialX + driftX;
          newY = node.initialY + driftY;
        }
        
        // Phase 2: Continue drift, full opacity
        if (phase === 2) {
          newOpacity = 1;
          const driftX = Math.sin((driftTime + node.id * 1000) / 3000) * 0.5;
          const driftY = Math.cos((driftTime + node.id * 500) / 2500) * 0.4;
          newX = node.initialX + driftX;
          newY = node.initialY + driftY;
        }

        // Phase 3: Migrate to final positions
        if (phase === 3) {
          const migrationDuration = 1200;
          const startDelay = node.delay;
          const elapsed = Math.max(0, phaseElapsed - startDelay);
          const progress = Math.min(1, elapsed / migrationDuration);
          const easedProgress = easeInOutCubic(progress);
          
          newX = lerp(node.initialX, node.finalX, easedProgress);
          newY = lerp(node.initialY, node.finalY, easedProgress);
          newOpacity = 1;
        }

        // Phase 4: Stable at final positions
        if (phase === 4) {
          newX = node.finalX;
          newY = node.finalY;
          newOpacity = 1;
        }

        newStates.set(node.id, { x: newX, y: newY, opacity: newOpacity });
      });

      return newStates;
    });

    // Connection opacity (Phase 2+)
    if (phase >= 2) {
      setConnectionOpacity((prev) => {
        const newOpacity = new Map(prev);
        connections.forEach((conn) => {
          const fadeIn = Math.min(0.4, (phaseElapsed - conn.delay) / 1000);
          newOpacity.set(conn.id, Math.max(0, fadeIn));
        });
        return newOpacity;
      });
    }

    // Central glow (Phase 2+)
    if (phase >= 2) {
      const glowProgress = Math.min(1, phaseElapsed / 1500);
      const pulse = 0.3 + Math.sin(driftTime / 1000) * 0.15;
      setCentralGlowOpacity(glowProgress * pulse);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isVisible, phase, driftTime]);

  // Start animation loop
  useEffect(() => {
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, animate]);

  // Get node position for connections
  const getNodePosition = (nodeId: number): { x: number; y: number } => {
    const state = nodeStates.get(nodeId);
    if (state) return { x: state.x, y: state.y };
    const config = nodeConfigs.find((n) => n.id === nodeId);
    return config ? { x: config.initialX, y: config.initialY } : { x: 50, y: 50 };
  };

  // Opacity multiplier for visibility
  const ambientOpacity = 0.75;

  return (
    <div
      ref={containerRef}
      className="relative w-full -mt-8 mb-4"
    >
      {/* SVG Animation Canvas */}
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <svg
          viewBox="0 0 100 70"
          className="w-full h-auto"
          style={{ height: "380px" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Central glow - LoopBrain presence */}
          <circle
            cx="50"
            cy="40"
            r="28"
            fill="rgb(59, 130, 246)"
            opacity={centralGlowOpacity * 0.5}
            style={{ filter: "blur(18px)" }}
          />

          {/* Connections */}
          {connections.map((conn) => {
            const from = getNodePosition(conn.fromNode);
            const to = getNodePosition(conn.toNode);
            const opacity = (connectionOpacity.get(conn.id) ?? 0) * 0.8;

            return (
              <line
                key={conn.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgb(148, 163, 184)"
                strokeWidth="0.15"
                opacity={opacity}
              />
            );
          })}

          {/* Nodes */}
          {nodeConfigs.map((node) => {
            const state = nodeStates.get(node.id);
            if (!state) return null;
            
            const sizeInSvg = node.size / 10;
            const isSettled = phase >= 3;

            return (
              <g key={node.id}>
                {/* Glow for settled nodes */}
                {isSettled && (
                  <circle
                    cx={state.x}
                    cy={state.y}
                    r={sizeInSvg * 1.8}
                    fill="rgb(59, 130, 246)"
                    opacity={0.12}
                  />
                )}
                
                {/* Main node */}
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={sizeInSvg}
                  fill={isSettled ? "rgb(148, 163, 184)" : "rgb(100, 116, 139)"}
                  opacity={state.opacity * ambientOpacity}
                />
              </g>
            );
          })}
        </svg>
      </div>

    </div>
  );
}

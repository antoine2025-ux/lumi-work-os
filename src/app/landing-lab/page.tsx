"use client";

/**
 * Landing Lab - Design Variant Explorer
 * 
 * A parallel route for exploring different landing page visual directions
 * without affecting the production landing page.
 * 
 * Access at: /landing-lab
 */

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VariantA } from "@/components/landing/variants/variant-a";
import { VariantB } from "@/components/landing/variants/variant-b";
import { VariantC } from "@/components/landing/variants/variant-c";

type VariantKey = "a" | "b" | "c";

interface VariantInfo {
  key: VariantKey;
  label: string;
  description: string;
}

const variants: VariantInfo[] = [
  {
    key: "a",
    label: "A",
    description: "Calm Intelligence — Typography-first, editorial feel",
  },
  {
    key: "b",
    label: "B",
    description: "Blueprint — Structure-first, system diagram aesthetic",
  },
  {
    key: "c",
    label: "C",
    description: "Layers — Depth-first, floating panels with motion",
  },
];

export default function LandingLabPage() {
  const [activeVariant, setActiveVariant] = useState<VariantKey>("a");
  const [mounted, setMounted] = useState(false);

  // Ensure dark mode is applied
  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    if (!root.classList.contains("dark")) {
      root.classList.add("dark");
    }
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky variant switcher bar */}
      <div className="sticky top-0 z-[100] bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Lab indicator */}
            <div className="flex items-center gap-3">
              <div className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-mono uppercase tracking-wider rounded">
                Lab
              </div>
              <span className="text-sm text-slate-400">
                Landing Page Variants
              </span>
            </div>

            {/* Variant tabs */}
            <Tabs
              value={activeVariant}
              onValueChange={(v) => setActiveVariant(v as VariantKey)}
              className="w-auto"
            >
              <TabsList className="bg-slate-800/50 border border-slate-700/50">
                {variants.map((variant) => (
                  <TabsTrigger
                    key={variant.key}
                    value={variant.key}
                    className="px-6 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                    title={variant.description}
                  >
                    <span className="font-mono">{variant.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Current variant description */}
            <div className="hidden lg:block text-sm text-slate-500 max-w-xs truncate">
              {variants.find((v) => v.key === activeVariant)?.description}
            </div>
          </div>
        </div>
      </div>

      {/* Variant content */}
      <div>
        {activeVariant === "a" && <VariantA />}
        {activeVariant === "b" && <VariantB />}
        {activeVariant === "c" && <VariantC />}
      </div>
    </div>
  );
}


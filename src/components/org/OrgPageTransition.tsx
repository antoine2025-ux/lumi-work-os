"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

type OrgPageTransitionProps = {
  children: ReactNode;
};

/**
 * Smooth page transition wrapper for Org Center pages.
 * Provides fade/slide animation without blocking data load.
 */
export function OrgPageTransition({ children }: OrgPageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.15,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}


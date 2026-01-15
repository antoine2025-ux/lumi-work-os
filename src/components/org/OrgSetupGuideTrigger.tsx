"use client";

import { useState, useRef } from "react";
import { OrgSetupGuidePanel } from "./OrgSetupGuidePanel";

type OrgSetupGuideTriggerProps = {
  className?: string;
};

export function OrgSetupGuideTrigger({ className }: OrgSetupGuideTriggerProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClose = () => {
    setOpen(false);
    // Return focus to button after drawer closes
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 100);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Open setup guide"
      >
        Setup guide
      </button>
      <OrgSetupGuidePanel open={open} onClose={handleClose} />
    </>
  );
}


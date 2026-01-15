"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function StructurePageActions() {
  const handleAddDepartment = () => {
    // TODO: Open Add Department drawer
    // This will be wired to open a drawer in a future step
  };

  return (
    <Button variant="secondary" onClick={handleAddDepartment}>
      Add department
    </Button>
  );
}


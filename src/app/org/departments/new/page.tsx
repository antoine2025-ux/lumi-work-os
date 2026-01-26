/**
 * New Department Page
 * 
 * Route for creating a new department in the org.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStatus } from "@/hooks/use-user-status";
import { DepartmentForm } from "@/components/org/department-form";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export default function NewDepartmentPage() {
  const router = useRouter();
  const { userStatus, loading, error } = useUserStatus();
  const workspaceId = userStatus?.workspaceId || "";
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push("/org/structure");
  };

  const handleSuccess = () => {
    router.push("/org/structure");
    router.refresh();
  };

  // Show loading state while fetching workspaceId - AFTER all hooks
  if (loading) {
    return (
      <div className="px-10 pb-10">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if workspaceId couldn't be fetched - AFTER all hooks
  if (error || (!loading && !workspaceId)) {
    return (
      <div className="px-10 pb-10">
        <div className="text-center py-10">
          <p className="text-red-600">Failed to load workspace. Please try again.</p>
          <button 
            onClick={() => router.push("/org/structure")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Structure
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / DEPARTMENTS / ADD"
        title="Add department"
        description="Create a new department in your organization."
      />
      <div className="px-10 pb-10">
        <DepartmentForm
          workspaceId={workspaceId}
          isOpen={isOpen}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </>
  );
}


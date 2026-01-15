"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EditDepartmentDrawer } from "@/components/org/EditDepartmentDrawer";

type PersonOption = {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export function DepartmentPageClient(props: {
  department: {
    id: string;
    name: string;
    ownerId?: string | null;
    teamCount?: number;
  };
  people: PersonOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="secondary" className="h-10" onClick={() => setOpen(true)}>
        Edit department
      </Button>

      <EditDepartmentDrawer
        open={open}
        onOpenChange={setOpen}
        onSaved={async () => {
          router.refresh();
        }}
        department={props.department}
        people={props.people}
      />
    </>
  );
}


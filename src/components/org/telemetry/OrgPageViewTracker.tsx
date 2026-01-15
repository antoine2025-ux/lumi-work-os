"use client";

import { useEffect } from "react";
import { trackOrgEvent } from "@/lib/org/track.client";

type Props = {
  route: string;
  name: string;
};

export function OrgPageViewTracker({ route, name }: Props) {
  useEffect(() => {
    trackOrgEvent({
      type: "ORG_CENTER_PAGE_VIEW",
      category: "org_center",
      name,
      route,
    });
  }, [route, name]);

  return null;
}


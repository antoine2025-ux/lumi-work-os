"use client";

import { Component, ReactNode } from "react";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class InvitesSectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[InvitesSectionErrorBoundary] Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4">
            <OrgEmptyState
              title="Unable to load invites"
              description="Something went wrong while loading invites. Try refreshing the page or come back later."
            />
          </div>
        )
      );
    }

    return this.props.children;
  }
}


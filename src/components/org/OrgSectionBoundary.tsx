/**
 * Org Section Error Boundary
 * 
 * Wraps Org sections to catch React errors and display user-safe error states.
 * Prevents one failing section from breaking the entire page.
 */

"use client";

import { Component, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class OrgSectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (but don't expose to user)
    console.error(`[OrgSectionBoundary] Error in ${this.props.title}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>{this.props.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>Failed to load this section. Please refresh and try again.</div>
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

export function OrgSectionBoundary({ title, children }: Props) {
  return <OrgSectionErrorBoundary title={title}>{children}</OrgSectionErrorBoundary>;
}


/**
 * Phase K: Responsibility Settings Page
 *
 * Manage responsibility tags and role profiles.
 */

import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TagsManagementClient } from "@/components/org/responsibility/TagsManagementClient";

export const metadata: Metadata = {
  title: "Responsibility Settings | Org",
  description: "Manage responsibility tags and role profiles",
};

type PageProps = {
  searchParams: Promise<{ returnTo?: string; roleType?: string }>;
};

export default async function ResponsibilitySettingsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // O1: returnTo affordance — visible link back to work request during onboarding
  const returnTo = params.returnTo;

  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-8">
      {returnTo && (
        <Link
          href={decodeURIComponent(returnTo)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to work request
        </Link>
      )}
      <div>
        <h1 className="text-2xl font-semibold">Responsibility Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure responsibility tags and role profiles for alignment checking.
        </p>
      </div>

      <TagsManagementClient />
    </div>
  );
}

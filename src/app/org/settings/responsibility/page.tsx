/**
 * Phase K: Responsibility Settings Page
 *
 * Manage responsibility tags and role profiles.
 */

import { Metadata } from "next";
import { TagsManagementClient } from "@/components/org/responsibility/TagsManagementClient";

export const metadata: Metadata = {
  title: "Responsibility Settings | Org",
  description: "Manage responsibility tags and role profiles",
};

export default function ResponsibilitySettingsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-8">
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

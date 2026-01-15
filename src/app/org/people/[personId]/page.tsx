/**
 * Person Profile Page
 * 
 * Route for viewing an individual person's profile.
 * Uses PersonProfilePageClient component for client-side rendering.
 */

import { PersonProfilePageClient } from "./PersonProfilePageClient";

export default async function PersonProfilePage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  
  return <PersonProfilePageClient personId={personId} />;
}


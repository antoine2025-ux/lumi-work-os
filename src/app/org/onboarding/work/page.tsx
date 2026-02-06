/**
 * O1: Intent-Driven Onboarding - Work Question Entry Page
 *
 * Server component that renders the onboarding work question form.
 * This replaces the old checklist-style onboarding as the default first step.
 */

import { WorkOnboardingClient } from "@/components/org/work/WorkOnboardingClient";

export default function WorkOnboardingPage() {
  return <WorkOnboardingClient />;
}

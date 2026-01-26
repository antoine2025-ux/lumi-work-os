/**
 * Legacy Decision Page - Redirects to new location
 * 
 * Old route: /org/decision
 * New route: /org/settings/decision-authority
 */

import { redirect } from "next/navigation";

export default function OrgDecisionPage() {
  redirect("/org/settings/decision-authority");
}

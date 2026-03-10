"use client"

import { CompanyWikiView } from "@/components/spaces/CompanyWikiView"

/**
 * Company Wiki home page.
 * Shows sections (folders), recent updates, and all company wiki pages.
 * Only pages where spaceId = companyWikiSpaceId.
 */
export default function CompanyWikiHomePage() {
  return <CompanyWikiView />
}

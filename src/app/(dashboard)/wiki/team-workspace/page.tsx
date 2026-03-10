import { redirect } from 'next/navigation'

/**
 * Legacy route: /wiki/team-workspace redirects to Company Wiki.
 * The team workspace UI has been unified into Spaces; Company Wiki is at /wiki/home.
 */
export default function TeamWorkspaceRedirectPage() {
  redirect('/wiki/home')
}

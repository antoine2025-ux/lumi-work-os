import { redirect } from "next/navigation"

/**
 * /wiki redirects to /wiki/home (Company Wiki view).
 */
export default function WikiPage() {
  redirect("/wiki/home")
}

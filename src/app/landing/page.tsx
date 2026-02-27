import { redirect } from "next/navigation";

/**
 * /landing redirects to the canonical landing page at /.
 * The full landing page (typewriter hero, 5 mock sections, architecture diagram)
 * lives at src/app/page.tsx.
 */
export default function LandingRedirectPage() {
  redirect("/");
}

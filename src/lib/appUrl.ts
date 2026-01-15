export function getAppBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL;
  const fromApp = process.env.APP_URL;
  const fromVercel = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  const candidate = fromPublic || fromApp || fromVercel || "http://localhost:3000";

  // Strip trailing slashes to avoid '//' in URLs.
  return candidate.replace(/\/+$/, "");
}


import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/authOptions";
import { acceptOrgInvitationByToken } from "@/server/data/acceptOrgInvitation";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // Redirect to login with callback URL
    const callbackUrl = `/invite/${token}`;
    const signInUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full border rounded-xl p-6 space-y-4 bg-background">
          <h1 className="text-xl font-semibold">Join this organization</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to join an organization in Loopwell. Please sign
            in or create an account to continue.
          </p>
          <div className="flex gap-3">
            <Link
              href={signInUrl}
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Sign in to accept invite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let error: string | null = null;
  let workspaceName: string | null = null;
  let workspaceId: string | null = null;
  let membershipCreated = false;

  try {
    const result = await acceptOrgInvitationByToken(token, session.user.id);
    workspaceName = result.workspace.name ?? "this organization";
    workspaceId = result.workspace.id;
    membershipCreated = result.membershipCreated;
  } catch (err: unknown) {
    error =
      err instanceof Error
        ? err.message
        : "We couldn&apos;t process this invitation.";
  }

  const orgHref = workspaceId ? `/org` : "/";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full border rounded-xl p-6 space-y-4 bg-background">
        {!error ? (
          <>
            <h1 className="text-xl font-semibold">
              {membershipCreated ? "You&apos;re in! 🎉" : "You&apos;re already a member"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {membershipCreated
                ? `You have successfully joined ${workspaceName}.`
                : `You already belong to ${workspaceName}.`}
            </p>
            <div className="flex gap-3">
              <Link
                href={orgHref}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Go to organization
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Invitation issue</h1>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, please contact the person who invited
              you or your workspace administrator.
            </p>
            <div className="flex gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


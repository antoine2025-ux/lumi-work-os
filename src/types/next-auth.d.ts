// Module augmentation for next-auth types.
// IMPORTANT: The bare imports below are required to make this file a
// TypeScript "module" (as opposed to a global declaration file), which
// enables declaration merging (augmentation) rather than replacing the
// module entirely. Without these imports the declare-module blocks act
// as ambient declarations and wipe out all original next-auth exports
// (NextAuth, NextAuthOptions, getToken, encode, User, etc.).
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
      workspaceId?: string;
      isFirstTime?: boolean;
      onboardingComplete?: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    activeOrgId?: string | null;
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string;
    workspaceId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    id?: string;
    email?: string | null;
    role?: string;
    workspaceId?: string;
    isFirstTime?: boolean;
    onboardingComplete?: boolean;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    activeOrgId?: string | null;
  }
}

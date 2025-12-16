import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Persist user id
      if (user) token.sub = (user as any).id || token.sub;

      // Allow client to update activeOrgId via session update
      if (trigger === "update" && session) {
        const nextOrg = (session as any).activeOrgId;
        if (typeof nextOrg === "string") {
          (token as any).activeOrgId = nextOrg;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      (session as any).activeOrgId = (token as any).activeOrgId || null;
      return session;
    },
  },
};

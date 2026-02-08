import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [GitHub, Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the GitHub access token on initial sign-in
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      if (profile) {
        token.picture = profile.avatar_url ?? profile.picture ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose provider info and picture in session
      if (token) {
        session.user.id = token.sub!;
        session.user.image = token.picture as string | undefined;
        // Add provider to session for backend sync
        (session.user as any).provider = token.provider;
      }
      return session;
    },
  },
  trustHost: true,
});

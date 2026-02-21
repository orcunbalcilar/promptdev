import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { findOrCreateUser } from "@/lib/services/user-service";

const providers = [];

if (process.env.ENABLE_DEV_CREDENTIALS === "true") {
  providers.push(
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        const devPassword = process.env.DEV_PASSWORD;
        if (devPassword && credentials.password === devPassword) {
          return {
            id: "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0",
            email: "bob@alice.com",
            name: "Bob Alice",
            image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
          };
        }
        return null;
      },
    }),
  );
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [...providers, GitHub, Google],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && user?.email) {
        // Sync user to database on initial sign-in
        try {
          const dbUser = await findOrCreateUser(
            account.provider,
            account.providerAccountId,
            user.email,
            user.name || undefined,
            user.image || undefined,
          );
          token.sub = dbUser.id; // Use DB ID as subject
        } catch (e) {
          console.error("Failed to sync user to DB", e);
        }

        // Persist the GitHub access token on initial sign-in
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
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
        // Add provider to session for user sync
        (session.user as unknown as Record<string, unknown>).provider = token.provider;
      }
      return session;
    },
  },
  trustHost: true,
});

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

const providers = [];

if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        if (credentials.password === "password") {
          return {
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
        (session.user as Record<string, unknown>).provider = token.provider;
      }
      return session;
    },
  },
  trustHost: true,
});

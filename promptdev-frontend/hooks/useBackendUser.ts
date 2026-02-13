import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { syncUser, type UserProfile } from "@/lib/user";

/**
 * Hook to sync NextAuth OAuth session with backend database user.
 * 
 * After OAuth authentication via NextAuth, we need to:
 * 1. Call /users/sync to find/create the user in our database
 * 2. Get the actual database UUID (not the OAuth provider ID)
 * 3. Use this UUID for all backend API calls
 * 
 * This hook handles the sync and provides the database user ID and profile.
 */
export function useBackendUser() {
  const { data: session, status } = useSession();

  const { data: backendUser, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["backendUser", session?.user?.id],
    queryFn: async () => {
      if (!session?.user) {
        throw new Error("No session available");
      }

      // Extract OAuth provider info from session
      // NextAuth stores the OAuth user ID in session.user.id (token.sub)
      // We need to determine the provider and provider account ID
      const sessionWithProvider = session as typeof session & { 
        user?: typeof session.user & { provider?: string } 
      };
      const provider = sessionWithProvider.user?.provider || "github"; // fallback to github
      const providerAccountId = session.user.id ?? "";
      const email = session.user.email ?? "";
      const name = session.user.name || undefined;
      const avatarUrl = session.user.image || undefined;

      if (!providerAccountId || !email) {
        throw new Error("Session missing required user fields (id, email)");
      }

      // Sync with backend - this will create user if not exists
      const profile = await syncUser({
        provider,
        providerAccountId,
        email,
        name,
        avatarUrl,
      });

      return profile;
    },
    enabled: status === "authenticated" && !!session?.user,
    staleTime: Infinity, // User data doesn't change within a session
    retry: 3,
  });

  return {
    userId: backendUser?.id,
    profile: backendUser,
    isLoading: status === "loading" || (status === "authenticated" && isLoading),
    error,
    isAuthenticated: status === "authenticated",
  };
}

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { syncUser, getUserProfile, type UserProfile } from "@/lib/user";

/**
 * Hook to sync NextAuth OAuth session with the database user record.
 *
 * After OAuth authentication via NextAuth, we need to:
 * 1. Call /users/sync to find/create the user in our database
 * 2. Get the actual database UUID (not the OAuth provider ID)
 * 3. Use this UUID for all API calls
 *
 * This hook handles the sync and provides the database user ID and profile.
 */
export function useUserSync() {
  const { data: session, status } = useSession();

  const { data: syncedUser, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["userSync", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("No session available");
      }

      // If the session ID is already a UUID, it means NextAuth has already synced
      // with the DB (via auth.ts callbacks). We can just fetch the profile.
      // GitHub IDs are integers, Google IDs are numeric strings. UUIDs are distinct.
      const userId = session.user.id || "";
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      if (isUuid) {
        try {
          return await getUserProfile(session.user.id);
        } catch (e) {
          // If profile fetch fails (e.g. user deleted), try syncing again as fallback
          console.warn("User profile fetch failed, falling back to sync", e);
        }
      }

      // Extract OAuth provider info from session
      const sessionWithProvider = session as typeof session & {
        user?: typeof session.user & { provider?: string }
      };
      const provider = sessionWithProvider.user?.provider || "github";
      const providerAccountId = session.user.id ?? "";
      const email = session.user.email ?? "";
      const name = session.user.name || undefined;
      const avatarUrl = session.user.image || undefined;

      if (!providerAccountId || !email) {
        throw new Error("Session missing required user fields (id, email)");
      }

      // Sync user — this will create if not exists
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
    userId: syncedUser?.id,
    profile: syncedUser,
    isLoading: status === "loading" || (status === "authenticated" && isLoading),
    error,
    isAuthenticated: status === "authenticated",
  };
}

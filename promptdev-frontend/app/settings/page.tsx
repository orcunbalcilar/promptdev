"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBackendUser } from "@/hooks/useBackendUser";
import { getUserProfile } from "@/lib/user";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import {
  BitbucketCard,
  ByokProviderCard,
  CopilotTokenCard,
  JiraCard,
  ProfileCard,
  SecurityNoteCard,
  SystemPromptCard,
} from "./_components";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const {
    userId,
    isLoading: isLoadingBackendUser,
    error: backendUserError,
  } = useBackendUser();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  });

  if (isLoading || isLoadingBackendUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (backendUserError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to sync user with backend. Please try signing out and
              signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {session.user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Use profile.id as key to re-mount cards when profile changes */}
      {profile && userId && (
        <main
          key={profile.id}
          className="container mx-auto px-4 py-8 max-w-3xl space-y-6"
        >
          <ProfileCard profile={profile} session={session} />
          <BitbucketCard userId={userId} profile={profile} />
          <CopilotTokenCard userId={userId} profile={profile} />
          <ByokProviderCard userId={userId} profile={profile} />
          <SecurityNoteCard />
          <JiraCard userId={userId} profile={profile} />
          <SystemPromptCard userId={userId} profile={profile} />
        </main>
      )}
    </div>
  );
}

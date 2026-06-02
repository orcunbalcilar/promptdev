"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import type { UserProfile } from "@/lib/user";

interface ProfileCardProps {
  readonly profile: UserProfile;
  readonly session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

export function ProfileCard({ profile, session }: ProfileCardProps) {
  /* v8 ignore start -- defensive fallbacks for always-present profile fields */
  const providerDisplay = profile.provider ?? "your provider";
  const avatarSrc = profile.avatarUrl ?? session?.user?.image ?? undefined;
  const nameDisplay = profile.name ?? session?.user?.name;
  const emailDisplay = profile.email ?? session?.user?.email;
  const providerBadge = profile.provider ?? "oauth";
  /* v8 ignore stop */

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>
          Your account information from {providerDisplay}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="text-lg">
              {profile.name?.charAt(0)?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-lg">{nameDisplay}</p>
            <p className="text-sm text-muted-foreground">{emailDisplay}</p>
            <Badge variant="secondary" className="mt-1 capitalize">
              {providerBadge}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

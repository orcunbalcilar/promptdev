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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>
          Your account information from {profile.provider ?? "your provider"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={profile.avatarUrl ?? session?.user?.image ?? undefined}
            />
            <AvatarFallback className="text-lg">
              {profile.name?.charAt(0)?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-lg">
              {profile.name ?? session?.user?.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile.email ?? session?.user?.email}
            </p>
            <Badge variant="secondary" className="mt-1 capitalize">
              {profile.provider ?? "oauth"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

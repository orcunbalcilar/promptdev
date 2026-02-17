"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

export function SecurityNoteCard() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Security note</p>
            <p className="text-xs text-muted-foreground">
              All sensitive tokens (Bitbucket, GitHub/Copilot, Jira) are
              encrypted using AES-256-GCM before being stored in the database.
              Tokens are never returned in API responses — only a boolean
              indicator showing whether a token has been set.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

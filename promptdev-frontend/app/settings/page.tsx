"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Check,
  Cloud,
  Eye,
  EyeOff,
  GitBranch,
  Key,
  Loader2,
  LogOut,
  Save,
  Shield,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { getUserProfile, updateUserSettings } from "@/lib/user"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBackendUser } from "@/hooks/useBackendUser"

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  // Get the actual database user ID (not the OAuth provider ID)
  const { userId, isLoading: isLoadingBackendUser, error: backendUserError } = useBackendUser()

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  })

  // --- Bitbucket form state ---
  const [bitbucketUrl, setBitbucketUrl] = useState("")
  const [bitbucketProjectKey, setBitbucketProjectKey] = useState("")
  const [bitbucketUsername, setBitbucketUsername] = useState("")
  const [bitbucketToken, setBitbucketToken] = useState("")
  const [showBitbucketToken, setShowBitbucketToken] = useState(false)

  // --- Copilot token state ---
  const [copilotToken, setCopilotToken] = useState("")
  const [showCopilotToken, setShowCopilotToken] = useState(false)

  // --- BYOK provider state ---
  const [byokProviderType, setByokProviderType] = useState("")
  const [byokBaseUrl, setByokBaseUrl] = useState("")
  const [byokApiKey, setByokApiKey] = useState("")
  const [showByokApiKey, setShowByokApiKey] = useState(false)
  const [byokAzureApiVersion, setByokAzureApiVersion] = useState("")

  // Populate form when profile loads
  const [initialized, setInitialized] = useState(false)
  if (profile && !initialized) {
    setBitbucketUrl(profile.bitbucketUrl ?? "")
    setBitbucketProjectKey(profile.bitbucketProjectKey ?? "")
    setBitbucketUsername(profile.bitbucketUsername ?? "")
    setByokProviderType(profile.byokProviderType ?? "")
    setByokBaseUrl(profile.byokBaseUrl ?? "")
    setInitialized(true)
  }

  // --- Save mutations ---
  const saveBitbucket = useMutation({
    mutationFn: () =>
      updateUserSettings(userId!, {
        bitbucketUrl: bitbucketUrl || undefined,
        bitbucketProjectKey: bitbucketProjectKey || undefined,
        bitbucketUsername: bitbucketUsername || undefined,
        bitbucketToken: bitbucketToken || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] })
      setBitbucketToken("")
    },
  })

  const saveCopilotToken = useMutation({
    mutationFn: () =>
      updateUserSettings(userId!, {
        copilotToken: copilotToken || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] })
      setCopilotToken("")
    },
  })

  const saveByokProvider = useMutation({
    mutationFn: () =>
      updateUserSettings(userId!, {
        byokProviderType: byokProviderType || undefined,
        byokBaseUrl: byokBaseUrl || undefined,
        byokApiKey: byokApiKey || undefined,
        byokAzureApiVersion: byokAzureApiVersion || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", userId] })
      setByokApiKey("")
    },
  })

  if (isLoading || isLoadingBackendUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (backendUserError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to sync user with backend. Please try signing out and signing in again.
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
    )
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

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Your account information from {profile?.provider ?? "your provider"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatarUrl ?? session?.user?.image ?? undefined} />
                <AvatarFallback className="text-lg">
                  {profile?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{profile?.name ?? session?.user?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.email ?? session?.user?.email}</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {profile?.provider ?? "oauth"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bitbucket Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Bitbucket Configuration
            </CardTitle>
            <CardDescription>
              Connect your Bitbucket Server instance. These settings are saved once and used for all your tasks.
              Tokens are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bitbucket-url">Bitbucket Server URL</Label>
                <Input
                  id="bitbucket-url"
                  placeholder="https://bitbucket.yourcompany.com"
                  value={bitbucketUrl}
                  onChange={(e) => setBitbucketUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bitbucket-project">Project Key</Label>
                <Input
                  id="bitbucket-project"
                  placeholder="MYPROJECT"
                  value={bitbucketProjectKey}
                  onChange={(e) => setBitbucketProjectKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bitbucket-user">Username</Label>
                <Input
                  id="bitbucket-user"
                  placeholder="your.username"
                  value={bitbucketUsername}
                  onChange={(e) => setBitbucketUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bitbucket-token">
                  Personal Access Token
                  {profile?.bitbucketTokenSet && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Set
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="bitbucket-token"
                    type={showBitbucketToken ? "text" : "password"}
                    placeholder={profile?.bitbucketTokenSet ? "••••••••" : "Enter token"}
                    value={bitbucketToken}
                    onChange={(e) => setBitbucketToken(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowBitbucketToken(!showBitbucketToken)}
                  >
                    {showBitbucketToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveBitbucket.mutate()}
                disabled={saveBitbucket.isPending}
              >
                {saveBitbucket.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : saveBitbucket.isSuccess ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Bitbucket Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Copilot / GitHub Token */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              GitHub Copilot Token
            </CardTitle>
            <CardDescription>
              Set a personal GitHub token for isolated Copilot sessions. Supported token types:
              <code className="mx-1 text-xs bg-muted px-1 rounded">gho_</code>,
              <code className="mx-1 text-xs bg-muted px-1 rounded">ghu_</code>,
              <code className="mx-1 text-xs bg-muted px-1 rounded">github_pat_</code>.
              Your token is encrypted at rest and never exposed via the API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copilot-token">
                GitHub Token
                {profile?.copilotTokenSet && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Set
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="copilot-token"
                  type={showCopilotToken ? "text" : "password"}
                  placeholder={profile?.copilotTokenSet ? "••••••••" : "github_pat_... or gho_..."}
                  value={copilotToken}
                  onChange={(e) => setCopilotToken(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setShowCopilotToken(!showCopilotToken)}
                >
                  {showCopilotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If set, each Copilot session will use your personal token instead of the shared server token.
                This enables per-user session isolation and personal usage tracking.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveCopilotToken.mutate()}
                disabled={saveCopilotToken.isPending}
              >
                {saveCopilotToken.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : saveCopilotToken.isSuccess ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Copilot Token
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BYOK Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Custom AI Provider (BYOK)
            </CardTitle>
            <CardDescription>
              Bring your own API key to use any OpenAI-compatible, Azure, or Anthropic provider.
              This allows connecting to on-prem or cloud-hosted models. API keys are encrypted at rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="byok-provider">Provider Type</Label>
                <Select value={byokProviderType} onValueChange={setByokProviderType}>
                  <SelectTrigger id="byok-provider">
                    <SelectValue placeholder="Select provider type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI / Compatible</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="byok-url">Base URL</Label>
                <Input
                  id="byok-url"
                  placeholder={
                    byokProviderType === "azure"
                      ? "https://your-resource.openai.azure.com"
                      : byokProviderType === "anthropic"
                        ? "https://api.anthropic.com"
                        : "https://api.openai.com/v1"
                  }
                  value={byokBaseUrl}
                  onChange={(e) => setByokBaseUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="byok-key">
                  API Key
                  {profile?.byokApiKeySet && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Set
                    </Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="byok-key"
                    type={showByokApiKey ? "text" : "password"}
                    placeholder={profile?.byokApiKeySet ? "••••••••" : "sk-... or your API key"}
                    value={byokApiKey}
                    onChange={(e) => setByokApiKey(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => setShowByokApiKey(!showByokApiKey)}
                  >
                    {showByokApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {byokProviderType === "azure" && (
                <div className="space-y-2">
                  <Label htmlFor="byok-azure-version">Azure API Version</Label>
                  <Input
                    id="byok-azure-version"
                    placeholder="2024-10-21"
                    value={byokAzureApiVersion}
                    onChange={(e) => setByokAzureApiVersion(e.target.value)}
                  />
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              For local models (Ollama, vLLM), use the OpenAI-compatible type with your local endpoint
              (e.g., http://localhost:11434/v1). No API key is needed for local providers.
            </p>

            <div className="flex justify-end">
              <Button
                onClick={() => saveByokProvider.mutate()}
                disabled={saveByokProvider.isPending}
              >
                {saveByokProvider.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {saveByokProvider.isSuccess && (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {!saveByokProvider.isPending && !saveByokProvider.isSuccess && (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Provider Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info card about how tokens are stored */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Security note</p>
                <p className="text-xs text-muted-foreground">
                  All sensitive tokens (Bitbucket, GitHub/Copilot) are encrypted using AES-256-GCM before being
                  stored in the database. Tokens are never returned in API responses — only a boolean indicator
                  showing whether a token has been set.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

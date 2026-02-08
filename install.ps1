# ============================================================================
# PromptDev — Windows Installer (PowerShell)
# ============================================================================
# One-command installation for the PromptDev AI development platform on Windows.
#
# Usage (PowerShell):
#   irm https://raw.githubusercontent.com/orcunbalcilar/promptdev/main/install.ps1 | iex
#
# Or locally:
#   .\install.ps1
#
# What this script does:
#   1. Checks prerequisites (Java, Node.js, Git)
#   2. Installs missing prerequisites via winget or chocolatey (with user consent)
#   3. Asks for configuration (Slack secrets, Bitbucket, install dir)
#   4. Clones the repository
#   5. Configures environment variables
#   6. Starts all services
#
# PostgreSQL is required — the installer detects it via:
#   local install → Docker → Podman
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-Log  { param([string]$Msg) Write-Host "[PromptDev] $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "[PromptDev] $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg) Write-Host "[PromptDev] $Msg" -ForegroundColor Red }
function Write-Info { param([string]$Msg) Write-Host "[PromptDev] $Msg" -ForegroundColor Cyan }
function Write-Hr  { Write-Host ("─" * 56) -ForegroundColor Green }

$RepoUrl = "https://github.com/orcunbalcilar/promptdev.git"
$DefaultInstallDir = Join-Path $env:USERPROFILE "promptdev"
$InstallDir = ""
$ContainerEngine = $null

# ── Package Manager Detection ──────────────────────────────────────────────

$PackageManager = "none"
if (Get-Command winget -ErrorAction SilentlyContinue) { $PackageManager = "winget" }
elseif (Get-Command choco -ErrorAction SilentlyContinue) { $PackageManager = "choco" }

# ── Helper Functions ───────────────────────────────────────────────────────

function Test-CommandExists {
    param([string]$Command)
    return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

function Install-Prerequisite {
    param([string]$Tool, [string]$WingetId, [string]$ChocoId, [string]$ManualUrl)

    Write-Host ""
    Write-Warn "$Tool is not installed."
    $answer = Read-Host "[PromptDev] Install $Tool? [Y/n]"
    if ([string]::IsNullOrEmpty($answer)) { $answer = "y" }

    if ($answer -match "^[Yy]$") {
        switch ($PackageManager) {
            "winget" {
                Write-Log "Installing $Tool via winget..."
                winget install --id $WingetId --accept-source-agreements --accept-package-agreements
            }
            "choco" {
                Write-Log "Installing $Tool via chocolatey..."
                choco install $ChocoId -y
            }
            default {
                Write-Err "No package manager found (winget or chocolatey)."
                Write-Err "Please install $Tool manually from: $ManualUrl"
                Write-Err "Then re-run this installer."
                exit 1
            }
        }
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        Write-Log "$Tool installed successfully."
    } else {
        Write-Err "$Tool is required. Please install it and re-run the installer."
        exit 1
    }
}

# ── Prerequisites Check ───────────────────────────────────────────────────

function Test-Prerequisites {
    Write-Hr
    Write-Log "Checking prerequisites..."
    Write-Host ""

    if (Test-CommandExists "java") {
        $jv = & java --version 2>&1 | Select-Object -First 1
        Write-Log "✓ Java: $jv"
    } else {
        Install-Prerequisite -Tool "Java 21" -WingetId "EclipseAdoptium.Temurin.21.JDK" -ChocoId "temurin21" -ManualUrl "https://adoptium.net"
    }

    if (Test-CommandExists "node") {
        $nv = & node --version
        Write-Log "✓ Node.js: $nv"
    } else {
        Install-Prerequisite -Tool "Node.js" -WingetId "OpenJS.NodeJS.LTS" -ChocoId "nodejs-lts" -ManualUrl "https://nodejs.org"
    }

    if (Test-CommandExists "npm") {
        $npmv = & npm --version
        Write-Log "✓ npm: $npmv"
    } else {
        Install-Prerequisite -Tool "npm" -WingetId "OpenJS.NodeJS.LTS" -ChocoId "nodejs-lts" -ManualUrl "https://nodejs.org"
    }

    if (Test-CommandExists "git") {
        $gv = & git --version
        Write-Log "✓ Git: $gv"
    } else {
        Install-Prerequisite -Tool "Git" -WingetId "Git.Git" -ChocoId "git" -ManualUrl "https://git-scm.com"
    }

    if (Test-CommandExists "docker") {
        $script:ContainerEngine = "docker"
        Write-Log "✓ Container engine: docker"
    } elseif (Test-CommandExists "podman") {
        $script:ContainerEngine = "podman"
        Write-Log "✓ Container engine: podman"
    } else {
        Write-Warn "No container engine (Docker/Podman) found."
        Write-Warn "PostgreSQL must be installed and running locally on :5432."
    }

    Write-Host ""
    Write-Log "All prerequisites satisfied."
}

# ── User Configuration ─────────────────────────────────────────────────────

function Read-InstallDir {
    Write-Hr
    Write-Host ""
    $dir = Read-Host "[PromptDev] Installation directory [$DefaultInstallDir]"
    if ([string]::IsNullOrEmpty($dir)) { $dir = $DefaultInstallDir }
    $script:InstallDir = $dir
    Write-Log "Will install to: $InstallDir"
}

function Read-SlackConfig {
    Write-Hr
    Write-Host ""
    Write-Info "Slack Bot configuration (optional — press Enter to skip)"
    Write-Host ""
    Write-Host "  To set up the Slack bot, you need:"
    Write-Host "  1. Create a Slack App at https://api.slack.com/apps"
    Write-Host "  2. Enable Socket Mode → generate an App-Level Token (connections:write scope)"
    Write-Host "  3. Add OAuth scopes: chat:write, commands"
    Write-Host "  4. Install the app to your workspace"
    Write-Host ""

    $script:SlackBotToken = Read-Host "[PromptDev] Slack Bot Token (xoxb-...)"
    $script:SlackAppToken = Read-Host "[PromptDev] Slack App Token (xapp-...)"
    $script:SlackSigningSecret = Read-Host "[PromptDev] Slack Signing Secret"

    if ($SlackBotToken) {
        Write-Log "Slack bot configuration saved."
    } else {
        Write-Warn "Skipping Slack bot setup. You can configure it later."
    }
}

function Read-BitbucketConfig {
    Write-Hr
    Write-Host ""
    Write-Info "Bitbucket Server configuration (optional — press Enter to skip)"
    Write-Host "  Or configure in the web UI Settings page after installation."
    Write-Host ""

    $script:BitbucketUrl = Read-Host "[PromptDev] Bitbucket Server URL (e.g. https://bitbucket.company.com)"
    $script:BitbucketProjectKey = Read-Host "[PromptDev] Bitbucket Project Key"
    $script:BitbucketUsername = Read-Host "[PromptDev] Bitbucket Username"
    $script:BitbucketToken = Read-Host "[PromptDev] Bitbucket Token" -MaskInput

    if ($BitbucketUrl) {
        Write-Log "Bitbucket configuration saved."
    } else {
        Write-Warn "Skipping Bitbucket setup. Configure via Settings in the web UI."
    }
}

function Read-GithubToken {
    Write-Hr
    Write-Host ""
    Write-Info "GitHub / Copilot token (optional — press Enter to skip)"
    Write-Host "  Provide a personal GitHub token for Copilot SDK sessions."
    Write-Host "  Supported types: github_pat_..., gho_..., ghu_..."
    Write-Host "  Or configure per-user in the web UI Settings page."
    Write-Host ""

    $script:GithubToken = Read-Host "[PromptDev] GitHub Token" -MaskInput

    if ($GithubToken) {
        Write-Log "GitHub token saved."
    } else {
        Write-Warn "Skipping. Configure per-user via Settings in the web UI."
    }
}

# ── Installation ───────────────────────────────────────────────────────────

function Install-Repository {
    Write-Hr
    Write-Host ""
    Write-Log "Cloning PromptDev..."

    if (Test-Path $InstallDir) {
        Write-Warn "Directory already exists: $InstallDir"
        $update = Read-Host "[PromptDev] Update existing installation? [Y/n]"
        if ([string]::IsNullOrEmpty($update)) { $update = "y" }

        if ($update -match "^[Yy]$") {
            Push-Location $InstallDir
            git pull origin main 2>$null
            Pop-Location
            Write-Log "Repository updated."
        }
    } else {
        $parent = Split-Path $InstallDir -Parent
        if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
        git clone $RepoUrl $InstallDir
        Write-Log "Repository cloned to $InstallDir"
    }
}

function Set-Environment {
    Write-Hr
    Write-Host ""
    Write-Log "Configuring environment..."

    $bytes = New-Object byte[] 33
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $AuthSecret = [Convert]::ToBase64String($bytes)

    # Frontend .env.local
    $envContent = @"
# =============================================================================
# PromptDev Frontend — Auto-generated by installer
# =============================================================================

# NextAuth.js v5
AUTH_SECRET=$AuthSecret

# GitHub OAuth (configure at https://github.com/settings/developers)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# Google OAuth (configure at https://console.cloud.google.com/apis/credentials)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080/api
"@
    if ($GithubToken) {
        $envContent += "`n`n# Copilot SDK`nGITHUB_TOKEN=$GithubToken"
    }
    $envContent | Out-File -FilePath (Join-Path $InstallDir "promptdev-frontend\.env.local") -Encoding utf8

    # Slack bot .env
    if ($SlackBotToken) {
        @"
SLACK_BOT_TOKEN=$SlackBotToken
SLACK_APP_TOKEN=$SlackAppToken
SLACK_SIGNING_SECRET=$SlackSigningSecret
PROMPTDEV_API_URL=http://localhost:8080/api
"@ | Out-File -FilePath (Join-Path $InstallDir "promptdev-bot\.env") -Encoding utf8
        Write-Log "Slack bot environment configured."
    }

    # Set session environment for Bitbucket
    if ($BitbucketUrl) {
        $env:BITBUCKET_URL = $BitbucketUrl
        $env:BITBUCKET_PROJECT_KEY = $BitbucketProjectKey
        $env:BITBUCKET_USERNAME = $BitbucketUsername
        $env:BITBUCKET_TOKEN = $BitbucketToken
    }

    Write-Log "Environment configured."
}

function Install-Dependencies {
    Write-Hr
    Write-Host ""
    Write-Log "Installing dependencies..."

    Push-Location (Join-Path $InstallDir "promptdev-frontend")
    npm install --silent 2>$null
    Pop-Location
    Write-Log "Frontend dependencies installed."

    if ($SlackBotToken) {
        Push-Location (Join-Path $InstallDir "promptdev-bot")
        npm install --silent 2>$null
        Pop-Location
        Write-Log "Slack bot dependencies installed."
    }

    Push-Location (Join-Path $InstallDir "promptdev-cli")
    npm install --silent 2>$null
    Pop-Location
    Write-Log "CLI dependencies installed."
}

function Start-Services {
    Write-Hr
    Write-Host ""
    Write-Log "Starting services via start-all.ps1..."

    Push-Location $InstallDir

    if ($SlackBotToken) {
        $env:SLACK_BOT_TOKEN = $SlackBotToken
        $env:SLACK_APP_TOKEN = $SlackAppToken
        $env:SLACK_SIGNING_SECRET = $SlackSigningSecret
        & ".\start-all.ps1" -Bot
    } else {
        & ".\start-all.ps1"
    }
}

# ── Main ───────────────────────────────────────────────────────────────────

function Main {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║    PromptDev Installer (Windows)      ║" -ForegroundColor Green
    Write-Host "  ║    AI-Powered Development Platform    ║" -ForegroundColor Green
    Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Test-Prerequisites
    Read-InstallDir
    Read-SlackConfig
    Read-BitbucketConfig
    Read-GithubToken

    Install-Repository
    Set-Environment
    Install-Dependencies
    Start-Services
}

Main

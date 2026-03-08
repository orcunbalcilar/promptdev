"use client";

import {
  ArrowLeft,
  Bot,
  Copy,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// AI Elements
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

import { useCopilotSession } from "@/hooks/useCopilotSession";
import { DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import { cn } from "@/lib/utils";

import { stateColors } from "@/components/copilot/constants";
import {
  CopilotMessageDisplay,
  StreamingAssistantMessage,
} from "@/components/copilot/copilot-messages";
import { SessionHistorySidebar } from "@/components/copilot/session-history-sidebar";
import { SettingsDialog } from "@/components/copilot/settings-dialog";
import { StartSessionDialog } from "@/components/copilot/start-session-dialog";
import { TokenUsageDisplay } from "@/components/copilot/token-usage-display";

const QUICK_PROMPTS = [
  { label: "Review my code", prompt: "Review the code in all changed files. Focus on bugs, security, and best practices." },
  { label: "Explain this project", prompt: "Explain the architecture and key components of this project." },
  { label: "Write tests", prompt: "Generate comprehensive unit tests for the most recently changed files." },
  { label: "Find bugs", prompt: "Analyze the codebase for potential bugs, race conditions, and edge cases." },
];

/**
 * Copilot Agent Page — redesigned with session history, export, and rich UX
 */
export default function CopilotAgentPage() {
  const router = useRouter();
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [reasoningEffort, setReasoningEffort] = useState<
    "low" | "medium" | "high" | "xhigh"
  >("medium");
  const [input, setInput] = useState("");
  const [showStartDialog, setShowStartDialog] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const {
    session,
    availableModels,
    state,
    messages,
    tools,
    streamingContent,
    streamingReasoning,
    isStreaming,
    error,
    inputTokens,
    outputTokens,
    createSession,
    resumeSession,
    sendMessage,
    abort,
    destroy,
    clearError,
    exportConversation,
  } = useCopilotSession({
    model,
    reasoningEffort,
  });

  const handleStartSession = useCallback(async () => {
    setShowStartDialog(false);
    await createSession({ model, reasoningEffort });
  }, [model, reasoningEffort, createSession]);

  useEffect(() => {
    const reinitSession = async () => {
      if (session && !showStartDialog) {
        await destroy();
        await createSession({ model, reasoningEffort });
      }
    };
    reinitSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, reasoningEffort]);

  const handleNewSession = useCallback(async () => {
    if (session) {
      await destroy();
    }
    setShowStartDialog(true);
  }, [session, destroy]);

  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      setShowStartDialog(false);
      await resumeSession(sessionId);
    },
    [resumeSession],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await fetch(`/api/copilot/sessions/${sessionId}`, { method: "DELETE" });
      } catch {
        // Non-critical
      }
    },
    [],
  );

  const handleExport = useCallback(() => {
    const md = exportConversation();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copilot-${/* v8 ignore next -- footer line 565 crashes before fallback can trigger */ session?.id?.slice(0, 8) ?? "session"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportConversation, session]);

  const handleCopyConversation = useCallback(() => {
    const md = exportConversation();
    navigator.clipboard.writeText(md);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [exportConversation]);

  const handleSubmit = useCallback(
    async (msg: { text: string }) => {
      const text = msg.text.trim();
      if (!text) return;
      setInput("");

      if (text.startsWith("/")) {
        const parts = text.split(/\s+/);
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
          case "/model": {
            const newModelId = parts[1];
            if (newModelId) {
              const found = availableModels.find((m) => m.id === newModelId);
              if (found) setModel(newModelId);
            }
            return;
          }
          case "/review": {
            const repo = parts[1] ?? "";
            const branch = parts[2] ?? "main";
            if (repo) {
              await sendMessage(
                `Review the code changes in the ${branch} branch of ${repo}. Focus on code quality, potential bugs, security issues, and best practices. Provide actionable feedback.`,
              );
            }
            return;
          }
          case "/fleet": {
            await sendMessage(
              "Show the current fleet status — list all active tasks, their statuses, and any recent completions or failures.",
            );
            return;
          }
          case "/clear": {
            await handleNewSession();
            return;
          }
          case "/help": {
            await sendMessage(
              "List all available slash commands and their usage.",
            );
            return;
          }
          default:
            break;
        }
      }

      await sendMessage(text);
    },
    [sendMessage, handleNewSession, availableModels],
  );

  const renderConversationArea = () => {
    if (showStartDialog) {
      return (
        <StartSessionDialog
          model={model}
          setModel={setModel}
          reasoningEffort={reasoningEffort}
          setReasoningEffort={(v) =>
            setReasoningEffort(v as typeof reasoningEffort)
          }
          models={availableModels}
          onStart={handleStartSession}
        />
      );
    }

    if (session) {
      return (
        <>
          <div className="flex-1 min-h-0">
            <Conversation className="h-full">
              <ConversationContent className="p-6">
                {messages.length === 0 && !isStreaming ? (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <ConversationEmptyState
                      icon={<Sparkles className="h-12 w-12" />}
                      title="Start a conversation"
                      description="Ask Copilot to help you with coding tasks, debugging, or any development questions."
                    />
                    {/* Quick prompts */}
                    <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                      {QUICK_PROMPTS.map((qp) => (
                        <Button
                          key={qp.label}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs h-auto py-2 px-3 text-left"
                          onClick={() => sendMessage(qp.prompt)}
                        >
                          <Sparkles className="h-3 w-3 mr-2 shrink-0 text-primary" />
                          {qp.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <CopilotMessageDisplay
                        key={message.id}
                        message={message}
                        isLast={index === messages.length - 1}
                        isStreaming={isStreaming}
                        streamingContent={streamingContent}
                        streamingReasoning={streamingReasoning}
                        activeTools={index === messages.length - 1 ? tools : []}
                      />
                    ))}

                    {messages.length > 0 &&
                      messages.at(-1)?.role === "user" &&
                      isStreaming && (
                        <StreamingAssistantMessage
                          streamingContent={streamingContent}
                          streamingReasoning={streamingReasoning}
                          tools={tools}
                        />
                      )}
                  </>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>

          {/* Input area */}
          <div className="border-t p-4">
            <PromptInput onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Copilot anything... (/ for commands)"
                className="min-h-12"
              />
              <PromptInputFooter>
                <PromptInputTools>
                  {isStreaming && (
                    <PromptInputButton
                      onClick={abort}
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Stop
                    </PromptInputButton>
                  )}
                </PromptInputTools>
                <PromptInputSubmit
                  status={(() => {
                    if (isStreaming) return "streaming";
                    if (state === "processing") return "submitted";
                    return "ready";
                  })()}
                  disabled={!input.trim() || !session}
                  onStop={abort}
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          {error ? (
            <>
              <div className="bg-destructive/10 p-6 rounded-full w-fit mx-auto">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Failed to Initialize</h2>
              <p className="text-muted-foreground max-w-sm">{error}</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStartDialog(true)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleStartSession}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto animate-pulse">
                <Bot className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Initializing Copilot...</h2>
              <p className="text-muted-foreground">
                Setting up your AI agent session
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10 shrink-0">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  {showSidebar ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1.5 rounded-full">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <h1 className="text-base font-bold">Copilot Agent</h1>
                  {session?.title && (
                    <span className="text-sm text-muted-foreground truncate max-w-48">
                      — {session.title}
                    </span>
                  )}
                  {session && (
                    <Badge variant="outline" className="font-mono text-xs">
                      {model}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Token usage */}
                {session && (inputTokens > 0 || outputTokens > 0) && (
                  <TokenUsageDisplay
                    inputTokens={inputTokens}
                    outputTokens={outputTokens}
                  />
                )}

                {/* Session state indicator */}
                {session && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        stateColors[state],
                      )}
                    />
                    <span className="text-xs font-medium capitalize">
                      {state}
                    </span>
                  </div>
                )}

                {/* Export actions */}
                {session && messages.length > 0 && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCopyConversation}
                        >
                          <Copy
                            className={cn(
                              "h-4 w-4",
                              copyFeedback && "text-green-500",
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {copyFeedback
                          ? "Copied!"
                          : "Copy conversation"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleExport}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Export as Markdown</TooltipContent>
                    </Tooltip>
                  </>
                )}

                <SettingsDialog
                  model={model}
                  setModel={setModel}
                  reasoningEffort={reasoningEffort}
                  setReasoningEffort={(v) =>
                    setReasoningEffort(v as typeof reasoningEffort)
                  }
                  models={availableModels}
                />

                {session && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewSession}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      New
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={destroy}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Destroy session</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-destructive hover:text-destructive"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div className="flex-1 flex min-h-0">
          {/* Session history sidebar */}
          {showSidebar && (
            <SessionHistorySidebar
              activeSessionId={session?.id}
              onResumeSession={handleResumeSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {/* Conversation area */}
          <main className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderConversationArea()}
            </div>

            {/* Session info bar */}
            {session && (
              <div className="border-t px-4 py-2 bg-muted/30 shrink-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>
                      Session:{" "}
                      <span className="font-mono">{session.id.slice(0, 12)}...</span>
                    </span>
                    <span>Model: <span className="font-medium">{session.model}</span></span>
                    <span>Messages: <span className="font-medium">{messages.length}</span></span>
                  </div>
                  <span>
                    Started:{" "}
                    {new Date(session.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

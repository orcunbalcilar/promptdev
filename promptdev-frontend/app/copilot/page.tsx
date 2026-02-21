"use client";

import {
  ArrowLeft,
  Bot,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { SettingsDialog } from "@/components/copilot/settings-dialog";
import { StartSessionDialog } from "@/components/copilot/start-session-dialog";

/**
 * Copilot Agent Page
 */
export default function CopilotAgentPage() {
  const router = useRouter();
  const [model, setModel] = useState(DEFAULT_MODEL_ID);
  const [reasoningEffort, setReasoningEffort] = useState<
    "low" | "medium" | "high" | "xhigh"
  >("medium");
  const [input, setInput] = useState("");
  const [showStartDialog, setShowStartDialog] = useState(true);

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
    createSession,
    sendMessage,
    abort,
    destroy,
    clearError,
  } = useCopilotSession({
    model,
    reasoningEffort,
  });

  // Create session only when user chooses to start
  const handleStartSession = useCallback(async () => {
    setShowStartDialog(false);
    await createSession({ model, reasoningEffort });
  }, [model, reasoningEffort, createSession]);

  // Re-create if model or reasoning effort changes (only if already started)
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

  const handleSubmit = useCallback(
    async (msg: { text: string }) => {
      const text = msg.text.trim();
      if (!text) return;
      setInput("");

      // Handle slash commands
      if (text.startsWith("/")) {
        const parts = text.split(/\s+/);
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
          case "/model": {
            const newModelId = parts[1];
            if (newModelId) {
              const found = availableModels.find((m) => m.id === newModelId);
              if (found) {
                setModel(newModelId);
              }
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

  const renderContent = () => {
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
                  <ConversationEmptyState
                    icon={<Sparkles className="h-12 w-12" />}
                    title="Start a conversation"
                    description="Ask Copilot to help you with coding tasks, debugging, or any development questions."
                  />
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

                    {/* Show streaming assistant message if no messages yet */}
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
                placeholder="Ask Copilot anything..."
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-lg font-bold">Copilot Agent</h1>
                {session && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {model}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Session state indicator */}
              {session && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                  <div
                    className={cn("h-2 w-2 rounded-full", stateColors[state])}
                  />
                  <span className="text-xs font-medium capitalize">
                    {state}
                  </span>
                </div>
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
                    New Session
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={destroy}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
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

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
          {renderContent()}
        </div>

        {/* Session info card */}
        {session && (
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">
                Session Info
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Session ID</span>
                  <p className="font-mono text-xs truncate">{session.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model</span>
                  <p className="font-medium">{session.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Messages</span>
                  <p className="font-medium">{messages.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">
                    {new Date(session.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

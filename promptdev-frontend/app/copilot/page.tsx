"use client";

import {
  ArrowLeft,
  Bot,
  Settings,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// AI Elements
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";

import { useCopilotSession } from "@/hooks/useCopilotSession";
import { COPILOT_MODELS, DEFAULT_MODEL_ID } from "@/lib/copilot/models";
import type {
  CopilotMessage,
  CopilotToolExecution,
  SessionState,
} from "@/lib/copilot/types";
import { cn } from "@/lib/utils";

// Copilot slash commands
const COPILOT_COMMANDS = [
  {
    name: "/model",
    description: "Switch AI model",
    usage: "/model <model-id>",
  },
  {
    name: "/review",
    description: "Review code in a repository",
    usage: "/review <repo> [branch]",
  },
  { name: "/fleet", description: "Show agent fleet status", usage: "/fleet" },
  {
    name: "/clear",
    description: "Clear conversation history",
    usage: "/clear",
  },
  { name: "/help", description: "Show available commands", usage: "/help" },
];

// Reasoning effort levels
const REASONING_EFFORTS = [
  { id: "low", name: "Low", description: "Fast responses" },
  { id: "medium", name: "Medium", description: "Balanced" },
  { id: "high", name: "High", description: "Detailed reasoning" },
  { id: "xhigh", name: "Extra High", description: "Maximum depth" },
];

// Session state colors
const stateColors: Record<SessionState, string> = {
  idle: "bg-green-500",
  processing: "bg-blue-500 animate-pulse",
  streaming: "bg-blue-500 animate-pulse",
  error: "bg-red-500",
  disconnected: "bg-gray-500",
};

/**
 * Tool execution display component
 */
function ToolExecution({ tool }: { tool: CopilotToolExecution }) {
  const getToolState = () => {
    switch (tool.state) {
      case "pending":
        return "input-streaming";
      case "running":
        return "input-available";
      case "completed":
        return "output-available";
      case "error":
        return "output-error";
      default:
        return "input-streaming";
    }
  };

  return (
    <Tool defaultOpen={tool.state === "error" || tool.state === "completed"}>
      <ToolHeader
        type={`tool-${tool.name}`}
        state={getToolState()}
        title={tool.name}
      />
      <ToolContent>
        <ToolInput input={tool.input} />
        {(tool.output || tool.error) && (
          <ToolOutput output={tool.output} errorText={tool.error} />
        )}
        {tool.duration && (
          <div className="text-xs text-muted-foreground">
            Duration: {tool.duration}ms
          </div>
        )}
      </ToolContent>
    </Tool>
  );
}

/**
 * Message display component
 */
function CopilotMessageDisplay({
  message,
  isLast,
  isStreaming,
  streamingContent,
  streamingReasoning,
  activeTools,
}: Readonly<{
  message: CopilotMessage;
  isLast: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingReasoning: string;
  activeTools: CopilotToolExecution[];
}>) {
  const showStreamingContent = isLast && isStreaming;

  return (
    <Message from={message.role}>
      <MessageContent>
        {/* Reasoning */}
        {(message.reasoning || (isLast && streamingReasoning)) && (
          <Reasoning
            isStreaming={isLast && isStreaming && !!streamingReasoning}
            defaultOpen={isLast && isStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>
              {isLast && streamingReasoning
                ? streamingReasoning
                : message.reasoning || ""}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Tool executions */}
        {message.tools?.map((tool) => (
          <ToolExecution key={tool.id} tool={tool} />
        ))}

        {/* Active tools (for streaming message) */}
        {isLast &&
          activeTools.map((tool) => (
            <ToolExecution key={tool.id} tool={tool} />
          ))}

        {/* Message content */}
        {showStreamingContent ? (
          streamingContent ? (
            <MessageResponse>{streamingContent}</MessageResponse>
          ) : !streamingReasoning && activeTools.length === 0 ? (
            <Shimmer duration={1.5}>Thinking...</Shimmer>
          ) : null
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}

/**
 * Settings dialog component
 */
function SettingsDialog({
  model,
  setModel,
  reasoningEffort,
  setReasoningEffort,
}: Readonly<{
  model: string;
  setModel: (v: string) => void;
  reasoningEffort: string;
  setReasoningEffort: (v: string) => void;
}>) {
  const selectedModel = COPILOT_MODELS.find((m) => m.id === model);
  const supportsReasoning = selectedModel?.capabilities.reasoning ?? false;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Configure the AI model and reasoning settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {COPILOT_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span>{m.name}</span>
                        {m.multiplier && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {m.multiplier}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="reasoning"
              className={supportsReasoning ? "" : "text-muted-foreground"}
            >
              Reasoning Effort{" "}
              {!supportsReasoning && "(Not supported by this model)"}
            </Label>
            <Select
              value={reasoningEffort}
              onValueChange={setReasoningEffort}
              disabled={!supportsReasoning}
            >
              <SelectTrigger id="reasoning">
                <SelectValue placeholder="Select effort" />
              </SelectTrigger>
              <SelectContent>
                {REASONING_EFFORTS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <div className="flex flex-col">
                      <span>{r.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
              const found = COPILOT_MODELS.find((m) => m.id === newModelId);
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
    [sendMessage, handleNewSession],
  );

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
          {showStartDialog ? (
            // Start dialog - choose model before creating session
            <div className="flex-1 flex items-center justify-center p-6">
              <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                  <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Start Copilot Agent</CardTitle>
                  <CardDescription>
                    Choose your AI model and preferences before starting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-model">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger id="start-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {COPILOT_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span>{m.name}</span>
                                {m.multiplier && (
                                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    {m.multiplier}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {m.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-reasoning">Reasoning Effort</Label>
                    <Select
                      value={reasoningEffort}
                      onValueChange={(v) =>
                        setReasoningEffort(v as typeof reasoningEffort)
                      }
                    >
                      <SelectTrigger id="start-reasoning">
                        <SelectValue placeholder="Select effort" />
                      </SelectTrigger>
                      <SelectContent>
                        {REASONING_EFFORTS.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex flex-col">
                              <span>{r.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {r.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleStartSession}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Start Agent
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : session ? (
            // Conversation
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
                            activeTools={
                              index === messages.length - 1 ? tools : []
                            }
                          />
                        ))}

                        {/* Show streaming assistant message if no messages yet */}
                        {messages.length > 0 &&
                          messages.at(-1)?.role === "user" &&
                          isStreaming && (
                            <Message from="assistant">
                              <MessageContent>
                                {streamingReasoning && (
                                  <Reasoning isStreaming defaultOpen>
                                    <ReasoningTrigger />
                                    <ReasoningContent>
                                      {streamingReasoning}
                                    </ReasoningContent>
                                  </Reasoning>
                                )}
                                {tools.map((tool) => (
                                  <ToolExecution key={tool.id} tool={tool} />
                                ))}
                                {streamingContent ? (
                                  <MessageResponse>
                                    {streamingContent}
                                  </MessageResponse>
                                ) : (
                                  !streamingReasoning &&
                                  tools.length === 0 && (
                                    <Shimmer duration={1.5}>
                                      Thinking...
                                    </Shimmer>
                                  )
                                )}
                              </MessageContent>
                            </Message>
                          )}
                      </>
                    )}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
              </div>

              {/* Input area */}
              <div className="border-t p-4">
                <PromptInput
                  onSubmit={handleSubmit}
                  className="max-w-4xl mx-auto"
                >
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
          ) : (
            // Loading state
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto animate-pulse">
                  <Bot className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">
                  Initializing Copilot...
                </h2>
                <p className="text-muted-foreground">
                  Setting up your AI agent session
                </p>
              </div>
            </div>
          )}
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

/**
 * Tests for copilot/types.ts
 *
 * Since types.ts is primarily a type-only module (interfaces, type aliases, re-exports),
 * these tests verify that the runtime-accessible exports are importable and have the expected shape.
 */

import { describe, it, expect } from "vitest";

// Import all runtime values and types that can be verified at runtime
import type {
  ReasoningEffort,
  ToolResultType,
  ToolBinaryResult,
  ToolResult,
  UserInputRequest,
  UserInputHandler,
  PreToolUseHandler,
  PostToolUseHandler,
  SessionStartHandler,
  SessionEndHandler,
  ErrorOccurredHandler,
  SessionHooks,
  SDKProviderConfig,
  CopilotEventType,
  CopilotEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  AssistantMessageDeltaEvent,
  AssistantReasoningEvent,
  AssistantReasoningDeltaEvent,
  AssistantTurnStartEvent,
  AssistantTurnEndEvent,
  AssistantIntentEvent,
  AssistantUsageEvent,
  ToolExecutionStartEvent,
  ToolExecutionEndEvent,
  ToolExecutionProgressEvent,
  ToolExecutionPartialResultEvent,
  SessionIdleEvent,
  SessionCompactionStartEvent,
  SessionCompactionCompleteEvent,
  SessionUsageInfoEvent,
  SessionTitleChangedEvent,
  SessionModelChangeEvent,
  SubagentStartedEvent,
  SubagentCompletedEvent,
  SubagentFailedEvent,
  SkillInvokedEvent,
  ErrorEvent,
  SessionErrorEvent,
  PendingMessagesModifiedEvent,
  TypedCopilotEvent,
  SessionState,
  CopilotSession,
  CopilotMessage,
  CopilotToolExecution,
  ProviderType,
  BYOKProvider,
  SessionHooksConfig,
  UserInputRequestHandler,
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
} from "../types";

describe("copilot/types - runtime shape checks", () => {
  describe("ReasoningEffort values", () => {
    it("should accept valid ReasoningEffort strings", () => {
      const values: ReasoningEffort[] = ["low", "medium", "high", "xhigh"];
      expect(values).toHaveLength(4);
      expect(values).toContain("low");
      expect(values).toContain("xhigh");
    });
  });

  describe("ToolResultType values", () => {
    it("should accept valid ToolResultType strings", () => {
      const values: ToolResultType[] = [
        "success",
        "failure",
        "rejected",
        "denied",
      ];
      expect(values).toHaveLength(4);
    });
  });

  describe("ToolResult union", () => {
    it("should accept a string result", () => {
      const result: ToolResult = "success output";
      expect(typeof result).toBe("string");
    });

    it("should accept an object result", () => {
      const result: ToolResult = { type: "success", output: "done" };
      expect(typeof result).toBe("object");
    });
  });

  describe("ToolBinaryResult shape", () => {
    it("should satisfy the interface with required + optional fields", () => {
      const r1: ToolBinaryResult = { type: "success" };
      const r2: ToolBinaryResult = { type: "failure", output: "error msg" };
      expect(r1.type).toBe("success");
      expect(r2.output).toBe("error msg");
    });
  });

  describe("CopilotEventType values", () => {
    it("should allow all known session event types", () => {
      const sessionEvents: CopilotEventType[] = [
        "session.start",
        "session.resume",
        "session.error",
        "session.idle",
        "session.title_changed",
        "session.shutdown",
      ];
      expect(sessionEvents.length).toBeGreaterThan(0);
    });

    it("should allow tool event types", () => {
      const toolEvents: CopilotEventType[] = [
        "tool.user_requested",
        "tool.execution_start",
        "tool.execution_complete",
        "tool.execution_end",
      ];
      expect(toolEvents).toHaveLength(4);
    });

    it("should allow subagent event types", () => {
      const subagentEvents: CopilotEventType[] = [
        "subagent.started",
        "subagent.completed",
        "subagent.failed",
        "subagent.selected",
      ];
      expect(subagentEvents).toHaveLength(4);
    });

    it("should allow legacy compat types", () => {
      const legacy: CopilotEventType[] = ["tool.execution_end", "error"];
      expect(legacy).toHaveLength(2);
    });
  });

  describe("CopilotEvent base interface", () => {
    it("should satisfy the base event shape", () => {
      const event: CopilotEvent = {
        id: "evt-1",
        type: "session.idle",
        timestamp: new Date().toISOString(),
        sessionId: "sess-1",
        data: {},
      };
      expect(event.id).toBe("evt-1");
      expect(event.type).toBe("session.idle");
    });
  });

  describe("typed event interfaces", () => {
    it("UserMessageEvent should carry content", () => {
      const event: UserMessageEvent = {
        id: "e1",
        type: "user.message",
        timestamp: "",
        sessionId: "s1",
        data: { content: "Hello" },
      };
      expect(event.data.content).toBe("Hello");
    });

    it("AssistantMessageEvent should carry content", () => {
      const event: AssistantMessageEvent = {
        id: "e2",
        type: "assistant.message",
        timestamp: "",
        sessionId: "s1",
        data: { content: "World", messageId: "m1" },
      };
      expect(event.data.content).toBe("World");
      expect(event.data.messageId).toBe("m1");
    });

    it("AssistantMessageDeltaEvent should carry deltaContent", () => {
      const event: AssistantMessageDeltaEvent = {
        id: "e3",
        type: "assistant.message_delta",
        timestamp: "",
        sessionId: "s1",
        data: { deltaContent: "chunk" },
      };
      expect(event.data.deltaContent).toBe("chunk");
    });

    it("ToolExecutionStartEvent should carry toolName and toolId", () => {
      const event: ToolExecutionStartEvent = {
        id: "e4",
        type: "tool.execution_start",
        timestamp: "",
        sessionId: "s1",
        data: { toolName: "read_file", toolId: "t1", input: { path: "/a" } },
      };
      expect(event.data.toolName).toBe("read_file");
    });

    it("ToolExecutionEndEvent should carry optional output/error", () => {
      const event: ToolExecutionEndEvent = {
        id: "e5",
        type: "tool.execution_complete",
        timestamp: "",
        sessionId: "s1",
        data: {
          toolName: "read_file",
          toolId: "t1",
          output: "ok",
          duration: 42,
        },
      };
      expect(event.data.duration).toBe(42);
    });

    it("ErrorEvent should carry message", () => {
      const event: ErrorEvent = {
        id: "e6",
        type: "error",
        timestamp: "",
        sessionId: "s1",
        data: { message: "boom" },
      };
      expect(event.data.message).toBe("boom");
    });

    it("SessionErrorEvent should carry errorType", () => {
      const event: SessionErrorEvent = {
        id: "e7",
        type: "session.error",
        timestamp: "",
        sessionId: "s1",
        data: { errorType: "rate_limit", message: "too many" },
      };
      expect(event.data.errorType).toBe("rate_limit");
    });

    it("AssistantUsageEvent should carry token counts", () => {
      const event: AssistantUsageEvent = {
        id: "e8",
        type: "assistant.usage",
        timestamp: "",
        sessionId: "s1",
        data: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      };
      expect(event.data.inputTokens).toBe(100);
    });

    it("SubagentStartedEvent should carry agentName", () => {
      const event: SubagentStartedEvent = {
        id: "e9",
        type: "subagent.started",
        timestamp: "",
        sessionId: "s1",
        data: { agentName: "Explorer" },
      };
      expect(event.data.agentName).toBe("Explorer");
    });
  });

  describe("SessionState values", () => {
    it("should accept all valid session states", () => {
      const states: SessionState[] = [
        "idle",
        "processing",
        "streaming",
        "error",
        "disconnected",
      ];
      expect(states).toHaveLength(5);
    });
  });

  describe("CopilotSession interface", () => {
    it("should satisfy the session shape", () => {
      const session: CopilotSession = {
        id: "sess-1",
        model: "gpt-5-mini",
        createdAt: new Date().toISOString(),
        state: "idle",
      };
      expect(session.id).toBe("sess-1");
    });

    it("should allow optional fields", () => {
      const session: CopilotSession = {
        id: "sess-2",
        model: "gpt-5-mini",
        createdAt: new Date().toISOString(),
        state: "idle",
        workspacePath: "/tmp/ws",
        title: "My Session",
      };
      expect(session.workspacePath).toBe("/tmp/ws");
      expect(session.title).toBe("My Session");
    });
  });

  describe("CopilotMessage interface", () => {
    it("should satisfy the message shape", () => {
      const msg: CopilotMessage = {
        id: "m1",
        role: "user",
        content: "Hello",
        timestamp: new Date().toISOString(),
      };
      expect(msg.role).toBe("user");
    });

    it("should allow optional fields", () => {
      const msg: CopilotMessage = {
        id: "m2",
        role: "assistant",
        content: "Hi",
        timestamp: new Date().toISOString(),
        reasoning: "thinking...",
        isStreaming: true,
        tools: [],
      };
      expect(msg.reasoning).toBe("thinking...");
      expect(msg.isStreaming).toBe(true);
    });
  });

  describe("CopilotToolExecution interface", () => {
    it("should satisfy the tool execution shape", () => {
      const tool: CopilotToolExecution = {
        id: "t1",
        name: "read_file",
        input: { path: "/tmp" },
        state: "running",
        startedAt: new Date().toISOString(),
      };
      expect(tool.state).toBe("running");
    });

    it("should accept all valid states", () => {
      const states: CopilotToolExecution["state"][] = [
        "pending",
        "running",
        "completed",
        "error",
      ];
      expect(states).toHaveLength(4);
    });
  });

  describe("BYOKProvider interface", () => {
    it("should allow valid provider types", () => {
      const types: ProviderType[] = ["openai", "azure", "anthropic"];
      expect(types).toHaveLength(3);
    });

    it("should satisfy the provider shape", () => {
      const provider: BYOKProvider = {
        type: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: "sk-xxx",
      };
      expect(provider.baseUrl).toBeTruthy();
    });

    it("should allow azure config", () => {
      const provider: BYOKProvider = {
        type: "azure",
        baseUrl: "https://my.azure.endpoint",
        bearerToken: "tok",
        wireApi: "completions",
        azure: { apiVersion: "2024-01-01" },
      };
      expect(provider.azure?.apiVersion).toBe("2024-01-01");
    });
  });

  describe("CreateSessionRequest interface", () => {
    it("should satisfy the create session request shape", () => {
      const req: CreateSessionRequest = {
        model: "gpt-5-mini",
        reasoningEffort: "high",
      };
      expect(req.model).toBe("gpt-5-mini");
    });

    it("should allow system message config", () => {
      const req: CreateSessionRequest = {
        systemMessage: { content: "Be helpful", mode: "append" },
      };
      expect(req.systemMessage?.mode).toBe("append");
    });
  });

  describe("CreateSessionResponse interface", () => {
    it("should satisfy the session response shape", () => {
      const resp: CreateSessionResponse = {
        sessionId: "s1",
        model: "gpt-5-mini",
      };
      expect(resp.sessionId).toBe("s1");
    });
  });

  describe("SendMessageRequest interface", () => {
    it("should satisfy the send message request shape", () => {
      const req: SendMessageRequest = {
        prompt: "Hello",
      };
      expect(req.prompt).toBe("Hello");
    });

    it("should allow attachments", () => {
      const req: SendMessageRequest = {
        prompt: "Check this",
        attachments: [
          { type: "file", path: "/tmp/foo.ts", displayName: "foo.ts" },
        ],
      };
      expect(req.attachments).toHaveLength(1);
    });
  });

  describe("SessionHooks interface", () => {
    it("should allow all optional hooks", () => {
      const hooks: SessionHooks = {};
      expect(hooks.onPreToolUse).toBeUndefined();
      expect(hooks.onPostToolUse).toBeUndefined();
      expect(hooks.onSessionStart).toBeUndefined();
      expect(hooks.onSessionEnd).toBeUndefined();
      expect(hooks.onErrorOccurred).toBeUndefined();
    });
  });

  describe("SDKProviderConfig interface", () => {
    it("should satisfy the config shape", () => {
      const config: SDKProviderConfig = {
        type: "openai",
        baseUrl: "https://api.openai.com",
      };
      expect(config.type).toBe("openai");
    });

    it("should allow optional fields", () => {
      const config: SDKProviderConfig = {
        type: "azure",
        baseUrl: "https://my.azure.com",
        apiKey: "key",
        bearerToken: "tok",
        wireApi: "responses",
        azure: { apiVersion: "2024-01" },
      };
      expect(config.wireApi).toBe("responses");
    });
  });

  describe("TypedCopilotEvent union", () => {
    it("should discriminate on type field", () => {
      const event: TypedCopilotEvent = {
        id: "e1",
        type: "user.message",
        timestamp: "",
        sessionId: "s1",
        data: { content: "test" },
      };

      if (event.type === "user.message") {
        expect(event.data.content).toBe("test");
      }
    });
  });

  describe("UserInputRequest interface", () => {
    it("should satisfy the request shape", () => {
      const req: UserInputRequest = {
        prompt: "Enter your name",
        options: ["Alice", "Bob"],
      };
      expect(req.prompt).toBe("Enter your name");
      expect(req.options).toHaveLength(2);
    });
  });
});

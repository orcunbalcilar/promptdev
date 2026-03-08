"use client";

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
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import type {
  CopilotMessage,
  CopilotToolExecution,
} from "@/lib/copilot/types";

/** Tool execution display component */
function ToolExecution({ tool }: Readonly<{ tool: CopilotToolExecution }>) {
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

function getMessageContent(
  streamingContent: string,
  streamingReasoning: string,
  activeTools: CopilotToolExecution[],
) {
  if (streamingContent) {
    return <MessageResponse>{streamingContent}</MessageResponse>;
  }
  if (!streamingReasoning && activeTools.length === 0) {
    return <Shimmer duration={1.5}>Thinking...</Shimmer>;
  }
  return null;
}

/** Message display component */
export function CopilotMessageDisplay({
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

  /* v8 ignore start — JSX key/fallback branches */
  const reasoningText = isLast && streamingReasoning
    ? streamingReasoning
    : message.reasoning || "";
  const toolKey = (tool: CopilotToolExecution, idx: number) =>
    tool.id ? `msg-${tool.id}` : `msg-tool-${idx}`;
  const activeToolKey = (tool: CopilotToolExecution, idx: number) =>
    tool.id ? `active-${tool.id}` : `active-tool-${idx}`;
  /* v8 ignore stop */

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
              {reasoningText}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Tool executions */}
        {message.tools?.map((tool, idx) => (
          <ToolExecution key={toolKey(tool, idx)} tool={tool} />
        ))}

        {/* Active tools (for streaming message) */}
        {isLast && activeTools.length > 0 &&
          activeTools.map((tool, idx) => (
            <ToolExecution key={activeToolKey(tool, idx)} tool={tool} />
          ))
        }

        {/* Message content */}
        {showStreamingContent ? (
          getMessageContent(streamingContent, streamingReasoning, activeTools)
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}
      </MessageContent>
    </Message>
  );
}

/** Streaming assistant message (shown when last message is from user and still streaming) */
export function StreamingAssistantMessage({
  streamingContent,
  streamingReasoning,
  tools,
}: Readonly<{
  streamingContent: string;
  streamingReasoning: string;
  tools: CopilotToolExecution[];
}>) {
  return (
    <Message from="assistant">
      <MessageContent>
        {streamingReasoning && (
          <Reasoning isStreaming defaultOpen>
            <ReasoningTrigger />
            <ReasoningContent>{streamingReasoning}</ReasoningContent>
          </Reasoning>
        )}
        {tools.map((tool) => (
          <ToolExecution key={tool.id} tool={tool} />
        ))}
        {streamingContent ? (
          <MessageResponse>{streamingContent}</MessageResponse>
        ) : (
          !streamingReasoning &&
          tools.length === 0 && <Shimmer duration={1.5}>Thinking...</Shimmer>
        )}
      </MessageContent>
    </Message>
  );
}

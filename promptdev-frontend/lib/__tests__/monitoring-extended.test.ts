import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch before importing the module
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import {
  registerMonitoringSession,
  endMonitoringSession,
  trackOperation,
  trackOperationsBatch,
  getMonitoringDashboard,
  getMonitoringSessions,
  getSessionOperations,
  getMonitoringOperations,
  queueOperation,
  flushOperations,
} from "@/lib/monitoring";

function mockOkResponse(data: unknown = {}) {
  return {
    ok: true,
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function mockErrorResponse(status = 500) {
  return {
    ok: false,
    status,
    statusText: "Internal Server Error",
    text: () => Promise.resolve(""),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(mockOkResponse());
});

afterEach(async () => {
  // Drain any pending operations to avoid leaking between tests
  await flushOperations();
  vi.useRealTimers();
});

describe("registerMonitoringSession", () => {
  it("POST /monitoring/sessions with correct body", async () => {
    await registerMonitoringSession({
      sdkSessionId: "sdk-123",
      model: "gpt-5-mini",
      reasoningEffort: "high",
      taskId: "task-1",
      source: "web",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/monitoring/sessions");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).toEqual({
      sdkSessionId: "sdk-123",
      model: "gpt-5-mini",
      reasoningEffort: "high",
      taskId: "task-1",
      source: "web",
    });
  });

  it("handles API failure gracefully without throwing", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500));
    await expect(registerMonitoringSession({
      sdkSessionId: "sdk-fail",
      model: "gpt-5-mini",
    })).resolves.toBeUndefined();
  });

  it("handles network failure gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    await expect(registerMonitoringSession({
      sdkSessionId: "sdk-net",
      model: "gpt-5-mini",
    })).resolves.toBeUndefined();
  });
});

describe("endMonitoringSession", () => {
  it("DELETE /monitoring/sessions/:sdkSessionId", async () => {
    await endMonitoringSession("sdk-456");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/monitoring/sessions/sdk-456");
    expect(options.method).toBe("DELETE");
  });
});

describe("trackOperation", () => {
  it("POST /monitoring/operations with params", async () => {
    await trackOperation({
      sessionId: "sess-1",
      operationType: "MESSAGE_SENT",
      message: "hello",
      toolName: "createFile",
      inputTokens: 100,
      outputTokens: 200,
      durationMs: 500,
      success: true,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/monitoring/operations");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body.operationType).toBe("MESSAGE_SENT");
    expect(body.inputTokens).toBe(100);
  });
});

describe("trackOperationsBatch", () => {
  it("does nothing for empty operations array", async () => {
    await trackOperationsBatch([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POST /monitoring/operations/batch with array body", async () => {
    await trackOperationsBatch([
      { operationType: "MESSAGE_SENT", message: "a" },
      { operationType: "TOOL_EXECUTION", toolName: "readFile" },
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/monitoring/operations/batch");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).toHaveLength(2);
  });
});

describe("getMonitoringDashboard", () => {
  it("GET /monitoring/dashboard with default days=7", async () => {
    const dashboardData = {
      totalSessions: 10,
      activeSessions: 2,
      totalOperations: 50,
    };
    mockFetch.mockResolvedValue(mockOkResponse(dashboardData));

    const result = await getMonitoringDashboard();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/dashboard?days=7");
    expect(result).toEqual(dashboardData);
  });

  it("GET /monitoring/dashboard with custom days", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({}));
    await getMonitoringDashboard(30);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/dashboard?days=30");
  });

  it("returns empty object on API error", async () => {
    mockFetch.mockResolvedValue(mockErrorResponse(500));
    const result = await getMonitoringDashboard();
    expect(result).toEqual({});
  });
});

describe("getMonitoringSessions", () => {
  it("GET /monitoring/sessions with default pagination", async () => {
    const data = { content: [], totalElements: 0, totalPages: 0 };
    mockFetch.mockResolvedValue(mockOkResponse(data));

    const result = await getMonitoringSessions();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/sessions?page=0&size=20");
    expect(result).toEqual(data);
  });

  it("GET /monitoring/sessions with custom pagination", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ content: [] }));
    await getMonitoringSessions(2, 50);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/sessions?page=2&size=50");
  });
});

describe("getSessionOperations", () => {
  it("GET /monitoring/sessions/:sdkSessionId/operations", async () => {
    const ops = [
      { id: "op-1", operationType: "MESSAGE_SENT" },
      { id: "op-2", operationType: "TOOL_EXECUTION" },
    ];
    mockFetch.mockResolvedValue(mockOkResponse(ops));

    const result = await getSessionOperations("sdk-abc");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/sessions/sdk-abc/operations");
    expect(result).toEqual(ops);
  });
});

describe("getMonitoringOperations", () => {
  it("GET /monitoring/operations with default pagination", async () => {
    const data = { content: [], totalElements: 0 };
    mockFetch.mockResolvedValue(mockOkResponse(data));

    const result = await getMonitoringOperations();

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/operations?page=0&size=50");
    expect(result).toEqual(data);
  });

  it("GET /monitoring/operations with custom pagination", async () => {
    mockFetch.mockResolvedValue(mockOkResponse({ content: [] }));
    await getMonitoringOperations(3, 100);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toBe("/api/monitoring/operations?page=3&size=100");
  });
});

describe("monitoringFetch – edge cases", () => {
  it("returns empty object when response body is empty", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const result = await getMonitoringDashboard();
    expect(result).toEqual({});
  });

  it("returns empty object on fetch exception (network failure)", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await getMonitoringDashboard();
    expect(result).toEqual({});
  });

  it("always sets Content-Type: application/json header", async () => {
    await trackOperation({ operationType: "TEST" });
    const options = mockFetch.mock.calls[0][1];
    expect(options.headers["Content-Type"]).toBe("application/json");
  });
});

describe("queueOperation – extended edge cases", () => {
  it("queues operations and flushes on timer", async () => {
    queueOperation({ operationType: "OP_1" });
    queueOperation({ operationType: "OP_2" });

    expect(mockFetch).not.toHaveBeenCalled();

    // Advance past FLUSH_INTERVAL (3000ms)
    await vi.advanceTimersByTimeAsync(3500);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toHaveLength(2);
  });

  it("flushes immediately when reaching FLUSH_SIZE (10)", async () => {
    for (let i = 0; i < 10; i++) {
      queueOperation({ operationType: `OP_${i}` });
    }

    // Should flush immediately without waiting for timer
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toHaveLength(10);
  });

  it("does not double-flush after immediate size-based flush", async () => {
    // Fill buffer to trigger immediate flush
    for (let i = 0; i < 10; i++) {
      queueOperation({ operationType: `OP_${i}` });
    }

    await vi.runAllTimersAsync();

    // Advance timer well past interval — should not trigger another flush
    await vi.advanceTimersByTimeAsync(5000);

    // Only 1 fetch call from the size-based flush
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("timer-based flush clears the timeout", async () => {
    queueOperation({ operationType: "OP_TIMER" });

    await vi.advanceTimersByTimeAsync(3500);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Another advance should not trigger another flush
    await vi.advanceTimersByTimeAsync(3500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("flushOperations – extended", () => {
  it("is safe to call multiple times when buffer is empty", async () => {
    await flushOperations();
    await flushOperations();
    await flushOperations();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("clears pending timeout when flushing manually", async () => {
    queueOperation({ operationType: "MANUAL_FLUSH" });

    // Manually flush before timer fires
    await flushOperations();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance past timer — should NOT trigger another flush
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

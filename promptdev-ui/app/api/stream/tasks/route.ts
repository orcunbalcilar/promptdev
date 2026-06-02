import { NextRequest } from "next/server";
import { subscribe } from "@/lib/services/sse-service";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(": heartbeat\n\n"));

      // Subscribe to ALL task updates (no taskId = global listener)
      const unsubscribe = subscribe((type, data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Stream closed
        }
      });

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Cleanup on abort
      _request.signal.addEventListener("abort", () => {
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

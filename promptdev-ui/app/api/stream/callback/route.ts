import { NextRequest, NextResponse } from "next/server";
import * as taskService from "@/lib/services/task-service";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const task = await taskService.processAgentCallback(body);
    return NextResponse.json(task);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Callback failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * API Route: Copilot Models
 *
 * GET /api/copilot/models - List available models (dynamic + static fallback)
 */

import { listAvailableModels } from "@/lib/copilot/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * List available Copilot models.
 * Attempts dynamic listing from the SDK, merges with static model metadata.
 */
export async function GET() {
  try {
    const dynamicModels = await listAvailableModels();

    if (dynamicModels.length > 0) {
      return NextResponse.json({ models: dynamicModels, source: "dynamic" });
    }

    // Return empty list if no dynamic models
    return NextResponse.json({ models: [], source: "empty" });
  } catch (error) {
    console.error("[API] Failed to list models:", error);

    // Return empty list on error
    return NextResponse.json({ models: [], source: "error" });
  }
}

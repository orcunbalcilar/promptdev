/**
 * API Route: Copilot Models
 *
 * GET /api/copilot/models - List available models (dynamic + static fallback)
 */

import { listAvailableModels } from "@/lib/copilot/client";
import { COPILOT_MODELS, mergeModels } from "@/lib/copilot/models";
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
      const merged = mergeModels(dynamicModels);
      return NextResponse.json({ models: merged, source: "dynamic" });
    }

    // Fallback to static list
    return NextResponse.json({ models: COPILOT_MODELS, source: "static" });
  } catch (error) {
    console.error("[API] Failed to list models:", error);

    // Always return static models as fallback
    return NextResponse.json({ models: COPILOT_MODELS, source: "static" });
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { adminConfigs } from "@/lib/db/schema";
import type { AdminConfig } from "@/types/config";
import { WEIGHT_PRESETS, RECOMMENDED_PRESET } from "@/lib/scoring/presets";
import { GRADE_THRESHOLDS } from "@/lib/scoring/grade";

export type AdminConfigRow = typeof adminConfigs.$inferSelect;

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  weights: WEIGHT_PRESETS[RECOMMENDED_PRESET].weights,
  thresholds: GRADE_THRESHOLDS,
  activePreset: RECOMMENDED_PRESET,
  modelTier: "balanced",
};

// Falls back to the recommended preset when the user hasn't saved a config.
export async function getConfigByUser(userId: string): Promise<AdminConfig> {
  const [row] = await db
    .select()
    .from(adminConfigs)
    .where(eq(adminConfigs.userId, userId));
  if (!row) return DEFAULT_ADMIN_CONFIG;
  return {
    weights: row.weights as AdminConfig["weights"],
    thresholds: row.thresholds as AdminConfig["thresholds"],
    activePreset:
      (row.activePreset as AdminConfig["activePreset"]) ?? "custom",
    modelTier: row.modelTier as AdminConfig["modelTier"],
  };
}

export async function upsertConfig(userId: string, config: AdminConfig) {
  const existing = await db
    .select({ id: adminConfigs.id })
    .from(adminConfigs)
    .where(eq(adminConfigs.userId, userId));

  if (existing.length > 0) {
    const [row] = await db
      .update(adminConfigs)
      .set({
        weights: config.weights,
        thresholds: config.thresholds,
        activePreset: config.activePreset,
        modelTier: config.modelTier,
        updatedAt: new Date(),
      })
      .where(eq(adminConfigs.userId, userId))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(adminConfigs)
    .values({
      userId,
      weights: config.weights,
      thresholds: config.thresholds,
      activePreset: config.activePreset,
      modelTier: config.modelTier,
    })
    .returning();
  return row;
}

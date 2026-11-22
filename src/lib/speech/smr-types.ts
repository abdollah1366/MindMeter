import type { AudioFrame, MptQuality } from "./mpt-types";

export type SmrTaskMetrics = {
  detectedSyllableCount: number;
  manualSyllableCount: number | null;
  syllableCount: number;
  cycleCount: number;
  ratePerSecond: number | null;
  meanIntervalMs: number | null;
  sdIntervalMs: number | null;
  cvPercent: number | null;
  activeDurationMs: number | null;
  pauseCount: number;
  pauseDurationMs: number;
  clippedRatio: number;
  noiseFloorRms: number;
  peakRms: number;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  needsManualReview: boolean;
  limitations: string[];
  quality: MptQuality;
  valid: boolean;
  onsetMs: number | null;
  offsetMs: number | null;
  attemptNumber: number;
};

export type SmrSummary = {
  task: SmrTaskMetrics;
  overallQuality: "acceptable" | "mixed" | "poor";
  algorithmVersion: string;
};

export type SmrStoredResult = SmrSummary & {
  key: "smr";
  version: 1;
  completedAt: string;
};

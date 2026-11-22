export type SmrConfig = {
  minSyllableGapMs: number;
  syllableOnsetRatio: number;
  minSyllableRms: number;
  unexpectedPauseMs: number;
  minSyllablesForValid: number;
  highCvThresholdPercent: number;
  manualReviewThreshold: number;
  algorithmVersion: string;
  targetDurationMs: number;
};

export const SMR_CONFIG: SmrConfig = {
  minSyllableGapMs: 100,
  syllableOnsetRatio: 2.2,
  minSyllableRms: 0.012,
  unexpectedPauseMs: 300,
  minSyllablesForValid: 6,
  highCvThresholdPercent: 25,
  manualReviewThreshold: 45,
  algorithmVersion: "smr-energy-onset-v1",
  targetDurationMs: 5000,
};

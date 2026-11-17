import { PD_LABELS, SCHEMAS, SCHEMA_DOMAINS, type DomainContent, type SchemaContent } from "@/data/schema-content";
import type { ResultLevel, ScaleScore } from "./types";

const SEVERITY: Record<ResultLevel, number> = {
  normal: 0,
  mild: 1,
  moderate: 2,
  high: 3,
  severe: 4,
};

export type SchemaScoreView = {
  schema: SchemaContent;
  score: ScaleScore;
  /** درصدی از دامنه‌ی امتیاز که پر شده است */
  percent: number;
  /** ۰ تا ۴ بر اساس سطح نتیجه */
  severity: number;
};

export type DomainSummary = {
  domain: DomainContent;
  score: ScaleScore;
  percent: number;
  members: SchemaScoreView[];
};

export type PdIndicator = {
  code: string;
  label: string;
  /** شاخص اکتشافی ۰ تا ۱۰۰؛ احتمال بالینی نیست */
  percent: number;
  /** نام طرحوارههایی که بیشترین سهم را در این شاخص دارند */
  drivers: string[];
};

export type SchemaReport = {
  schemas: SchemaScoreView[];
  domains: DomainSummary[];
  /** طرحوارههایی که دست کم در سطح متوسط اند، به ترتیب شدت */
  dominant: SchemaScoreView[];
  pd: PdIndicator[];
};

export function buildSchemaReport(scores: ScaleScore[]): SchemaReport {
  const byKey = new Map(scores.map((s) => [s.key, s]));

  const views: SchemaScoreView[] = SCHEMAS.flatMap((schema) => {
    const score = byKey.get(schema.key);
    if (!score) return [];
    const percent = Math.round(((score.score - score.min) / (score.max - score.min || 1)) * 100);
    const severity = SEVERITY[score.result?.level ?? "normal"];
    return [{ schema, score, percent, severity }];
  });

  const domains: DomainSummary[] = SCHEMA_DOMAINS.flatMap((domain) => {
    const score = byKey.get(`domain_${domain.key}`);
    if (!score) return [];
    const percent = Math.round(((score.score - score.min) / (score.max - score.min || 1)) * 100);
    return [{ domain, score, percent, members: views.filter((v) => v.schema.domain === domain.key) }];
  });

  const dominant = views
    .filter((v) => v.severity >= 2)
    .sort((a, b) => b.percent - a.percent || b.severity - a.severity);

  // شاخص اکتشافی الگوهای شخصیتی: جمع وزن طرحوارههای برجسته، تقسیم بر حداکثر ممکن.
  const pdMap = new Map<string, { total: number; max: number; drivers: { title: string; contribution: number }[] }>();
  for (const v of views) {
    for (const link of v.schema.pd) {
      const row = pdMap.get(link.code) ?? { total: 0, max: 0, drivers: [] };
      row.max += 4 * link.weight;
      const contribution = v.severity * link.weight;
      row.total += contribution;
      if (v.severity >= 2) row.drivers.push({ title: v.schema.title, contribution });
      pdMap.set(link.code, row);
    }
  }

  const pd: PdIndicator[] = [...pdMap.entries()]
    .map(([code, row]) => ({
      code,
      label: PD_LABELS[code] ?? code,
      percent: row.max ? Math.round((row.total / row.max) * 100) : 0,
      drivers: row.drivers
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3)
        .map((d) => d.title),
    }))
    .filter((row) => row.percent > 0)
    .sort((a, b) => b.percent - a.percent);

  return { schemas: views, domains, dominant, pd };
}

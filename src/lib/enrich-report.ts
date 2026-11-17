import {
  ENRICH_GROUPS,
  ENRICH_SCALES,
  type EnrichGroup,
  type EnrichScaleContent,
} from "@/data/enrich-content";
import type { ResultLevel, ScaleScore } from "@/lib/types";
import { toPersianDigits } from "@/lib/scoring";

const fa = (n: number | string) => toPersianDigits(n);

const RANK: Record<ResultLevel, number> = {
  normal: 0,
  mild: 1,
  moderate: 2,
  high: 3,
  severe: 4,
};

export type EnrichScaleView = {
  content: EnrichScaleContent;
  score: ScaleScore;
  percent: number;
  rank: number;
};

export type EnrichGroupSummary = {
  group: EnrichGroup;
  score: ScaleScore;
  percent: number;
  members: EnrichScaleView[];
};

export type EnrichReport = {
  overall: ScaleScore | undefined;
  scales: EnrichScaleView[];
  groups: EnrichGroupSummary[];
  strengths: EnrichScaleView[];
  growth: EnrichScaleView[];
  bandCounts: Record<ResultLevel, number>;
  summaryTitle: string;
  summaryParagraphs: string[];
};

function percentOf(score: ScaleScore): number {
  return Math.round(((score.score - score.min) / (score.max - score.min || 1)) * 100);
}

function names(list: EnrichScaleView[], limit: number): string {
  return list.slice(0, limit).map((v) => v.content.title).join("، ");
}

export function buildEnrichReport(scores: ScaleScore[]): EnrichReport {
  const byKey = new Map(scores.map((s) => [s.key, s]));

  const views = ENRICH_SCALES.flatMap<EnrichScaleView>((content) => {
    const score = byKey.get(content.key);
    if (!score) return [];
    return [{
      content,
      score,
      percent: percentOf(score),
      rank: RANK[score.result?.level ?? "normal"],
    }];
  });

  const groups = ENRICH_GROUPS.flatMap<EnrichGroupSummary>((group) => {
    const score = byKey.get(`group_${group.key}`);
    if (!score) return [];
    return [{
      group,
      score,
      percent: percentOf(score),
      members: views.filter((v) => v.content.group === group.key),
    }];
  });

  const strengths = [...views].sort((a, b) => b.percent - a.percent).filter((v) => v.rank <= 1);
  const growth = [...views].sort((a, b) => a.percent - b.percent).filter((v) => v.rank >= 2);

  const bandCounts: Record<ResultLevel, number> = {
    normal: 0,
    mild: 0,
    moderate: 0,
    high: 0,
    severe: 0,
  };
  for (const v of views) bandCounts[v.score.result?.level ?? "normal"] += 1;

  const overall = byKey.get("overall");
  const summaryTitle = overall?.result?.title
    ? `رضایت کلی: ${overall.result.title}`
    : "نیم رخ رضایت زناشویی شما";

  const summaryParagraphs: string[] = [];
  if (overall) {
    summaryParagraphs.push(
      `شاخص کلی رضایت زناشویی شما ${fa(percentOf(overall))}٪ است و در سطح «${overall.result?.title ?? "متوسط"}» قرار می گیرد. ` +
        `از ۱۵ مؤلفه بررسی شده، ${fa(bandCounts.normal + bandCounts.mild)} مؤلفه در سطح مطلوب، ` +
        `${fa(bandCounts.moderate)} مؤلفه متوسط و ${fa(bandCounts.high + bandCounts.severe)} مؤلفه نیازمند توجه است.`,
    );
  }
  if (strengths.length) {
    summaryParagraphs.push(
      `قوی ترین مؤلفه های رابطه شما عبارت اند از: ${names(strengths, 3)}. ` +
        `این حوزه ها را می توانید به عنوان منبعی برای تقویت سایر بخشها به کار بگیرید.`,
    );
  }
  if (growth.length) {
    summaryParagraphs.push(
      `حوزه هایی که بیشتر نیاز به کار دارند عبارت اند از: ${names(growth, 3)}. ` +
        `پیشنهاد می شود با مطالعه تفسیر اختصاصی هر مؤلفه، یک تمرین کوچک را از امروز آغاز کنید.`,
    );
  } else {
    summaryParagraphs.push(
      "هیچ مؤلفهای در سطح هشدار قرار نگرفت. با وجود این، مرور منظم نقاط قوت و گفتگوی مداوم با همسرتان، " +
        "به حفظ کیفیت رابطه کمک می کند.",
    );
  }

  return {
    overall,
    scales: views,
    groups,
    strengths,
    growth,
    bandCounts,
    summaryTitle,
    summaryParagraphs,
  };
}

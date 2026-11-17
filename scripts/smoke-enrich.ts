import enrich from "../src/data/tests/enrich";
import { scoreTest } from "../src/lib/scoring";
import { buildEnrichReport } from "../src/lib/enrich-report";
import { headlineChips, inventorySummary } from "../src/lib/inventory";

const ids = enrich.questions.map((q) => q.id);
console.log("questions:", enrich.questions.length, "unique:", new Set(ids).size);
console.log("scales:", enrich.scales.length, "groups:", enrich.scaleGroups?.length);

for (const value of [5, 1, 3]) {
  const answers = Object.fromEntries(ids.map((id) => [id, value]));
  const scores = scoreTest(enrich, answers);
  const report = buildEnrichReport(scores);
  console.log(`\n--- all answers = ${value} ---`);
  console.log("overall:", report.overall?.score, report.overall?.result?.title, report.overall?.result?.level);
  console.log("strengths:", report.strengths.length, "growth:", report.growth.length);
  console.log("bandCounts:", JSON.stringify(report.bandCounts));
  console.log("summary:", report.summaryParagraphs[0]);
  console.log("chips:", headlineChips(enrich, scores, 4).map((c) => c.text).join(" | "));
  console.log("summaryText:", inventorySummary(enrich, scores));
}

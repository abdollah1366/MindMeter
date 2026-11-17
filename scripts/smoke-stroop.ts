import stroop from "../src/data/tests/stroop";
import { STROOP_PRACTICE } from "../src/data/stroop-content";
import { isComplete, scoreTest, type Answers } from "../src/lib/scoring";
import { buildStroopReport } from "../src/lib/stroop-report";
import { headlineChips, inventorySummary } from "../src/lib/inventory";

function check(label: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${label}`);
  console.log(`✓ ${label}`);
}

const classic = stroop.questions.filter((q) => q.stroop?.mode === "classic");
const emotional = stroop.questions.filter((q) => q.stroop?.mode === "emotional");
check("60 main questions", stroop.questions.length === 60);
check("question ids unique", new Set(stroop.questions.map((q) => q.id)).size === 60);
check("30 classic / 30 emotional", classic.length === 30 && emotional.length === 30);
check("30 practice cards (15 + 15)", STROOP_PRACTICE.length === 30
  && STROOP_PRACTICE.filter((s) => s.mode === "classic").length === 15
  && STROOP_PRACTICE.filter((s) => s.mode === "emotional").length === 15);
check("classic congruent/incongruent", classic.filter((q) => q.stroop?.congruent).length === 10
  && classic.filter((q) => q.stroop?.congruent === false).length === 20);
check("emotional/neutral split", emotional.filter((q) => q.stroop?.emotional).length === 15
  && emotional.filter((q) => q.stroop?.emotional === false).length === 15);
check("word never equals ink color on incongruent", classic
  .filter((q) => q.stroop?.congruent === false)
  .every((q) => q.stroop!.word !== q.stroop!.ink));
check("correct answer matches ink option", stroop.questions.every((q) =>
  stroop.options.some((o) => o.value === q.answer && o.label === q.stroop!.ink)));

// همه پاسخها درست + زمان واکنش ساختگی
const answers: Answers = {};
for (const q of stroop.questions) {
  answers[q.id] = q.answer!;
  answers[`rt_${q.id}`] = 600;
}
check("isComplete ignores rt_ keys", isComplete(stroop, answers));
const scores = scoreTest(stroop, answers);
check("perfect accuracy = 30/30/60", scores.find((s) => s.key === "classic")!.raw === 30
  && scores.find((s) => s.key === "emotional")!.raw === 30
  && scores.find((s) => s.key === "overall")!.raw === 60);

const report = buildStroopReport(stroop, answers);
check("report accuracy 100", report.classic.accuracy === 100 && report.emotional.accuracy === 100 && report.overall.accuracy === 100);
check("report mean RT 600", report.classic.meanRt === 600 && report.emotional.meanRt === 600 && report.overall.meanRt === 600);
check("no interference with equal RT", report.classic.interference === 0 && report.emotional.interference === 0);
check("chips present", headlineChips(stroop, scores, 2).length === 2);
console.log("chips:", headlineChips(stroop, scores, 2).map((c) => c.text).join(" | "));
console.log("summary:", inventorySummary(stroop, scores));

// نیمی از پاسخها نادرست + تداخل زمانی
const partial: Answers = {};
for (const q of stroop.questions) {
  partial[q.id] = q.answer!;
  partial[`rt_${q.id}`] = q.stroop?.congruent === true || q.stroop?.emotional === false ? 500 : 800;
}
for (const q of classic.filter((x) => x.stroop?.congruent === false).slice(0, 10)) partial[q.id] = 1;
const partialReport = buildStroopReport(stroop, partial);
check("classic accuracy < 100 with errors", partialReport.classic.accuracy < 100);
check("classic interference > 0", partialReport.classic.interference > 0);
console.log("partial classic:", partialReport.classic.accuracy, "%", "interference", partialReport.classic.interference, "ms");
console.log("summary paragraph:", partialReport.summaryParagraphs[0]);

console.log("✓ all stroop smoke checks passed");

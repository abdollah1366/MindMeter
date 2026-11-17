/**
 * ساخت گزارش تحلیلی آزمون استروب فارسی.
 * دقت و زمان واکنش را بهصورت جداگانه برای دو حالت رنگ واژه و هیجانی محاسبه میکند.
 * زمان واکنش در پاسخ ها با کلید `rt_<questionId>` ذخیره شده است.
 */
import type { Answers } from "./scoring";
import type { PsychTest, Question, ResultLevel } from "./types";

export type StroopCondition = {
  key: string;
  label: string;
  total: number;
  correct: number;
  accuracy: number;
  meanRt: number;
};

export type StroopModeView = {
  mode: "classic" | "emotional";
  label: string;
  total: number;
  correct: number;
  accuracy: number;
  meanRt: number;
  /** تفاوت میانگین زمان واکنش شرط چالش و شرط زمینه (به میلیثانیه) */
  interference: number;
  baseline: StroopCondition;
  challenge: StroopCondition;
  level: ResultLevel;
  title: string;
  note: string;
};

export type StroopReport = {
  classic: StroopModeView;
  emotional: StroopModeView;
  overall: { total: number; correct: number; accuracy: number; meanRt: number };
  summaryTitle: string;
  summaryParagraphs: string[];
};

function condition(questions: Question[], answers: Answers, key: string, label: string, match: (q: Question) => boolean): StroopCondition {
  const subset = questions.filter(match);
  let correct = 0;
  let rtSum = 0;
  let rtCount = 0;
  for (const q of subset) {
    if (answers[q.id] === q.answer) correct++;
    const rt = answers[`rt_${q.id}`];
    // پاسخهای سریعتر از ۱۵۰ میلیثانیه معمولاً تکرار کلید یا کلیک تصادفیاند
    if (typeof rt === "number" && Number.isFinite(rt) && rt >= 150 && rt < 30000) {
      rtSum += rt;
      rtCount++;
    }
  }
  return {
    key,
    label,
    total: subset.length,
    correct,
    accuracy: subset.length ? Math.round((correct / subset.length) * 100) : 0,
    meanRt: rtCount ? Math.round(rtSum / rtCount) : 0,
  };
}

function accuracyLevel(correct: number, total: number): { level: ResultLevel; title: string } {
  const ratio = total ? correct / total : 0;
  if (ratio >= 0.93) return { level: "normal", title: "عالی" };
  if (ratio >= 0.83) return { level: "normal", title: "خوب" };
  if (ratio >= 0.7) return { level: "mild", title: "متوسط" };
  if (ratio >= 0.5) return { level: "high", title: "پایین تر از میانگین" };
  return { level: "severe", title: "ضعیف" };
}

function interferenceWord(ms: number) {
  if (ms < 0) return "کمتر";
  if (ms < 80) return "کم";
  if (ms < 180) return "متوسط";
  return "زیاد";
}

function modeView(
  mode: "classic" | "emotional",
  questions: Question[],
  answers: Answers,
): StroopModeView {
  const isClassic = mode === "classic";
  const baseline = isClassic
    ? condition(questions, answers, "congruent", "کارت های همنخوان", (q) => q.stroop?.mode === "classic" && q.stroop.congruent === true)
    : condition(questions, answers, "neutral", "واژه های خنثی", (q) => q.stroop?.mode === "emotional" && q.stroop.emotional === false);
  const challenge = isClassic
    ? condition(questions, answers, "incongruent", "کارت های ناهمنخوان", (q) => q.stroop?.mode === "classic" && q.stroop.congruent === false)
    : condition(questions, answers, "emotional", "واژه های هیجانی", (q) => q.stroop?.mode === "emotional" && q.stroop.emotional === true);

  const total = baseline.total + challenge.total;
  const correct = baseline.correct + challenge.correct;
  const rtSum = (baseline.meanRt * baseline.total) + (challenge.meanRt * challenge.total);
  const rtCount = baseline.total + challenge.total;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const meanRt = rtCount ? Math.round(rtSum / rtCount) : 0;
  const interference = baseline.meanRt > 0 && challenge.meanRt > 0 ? challenge.meanRt - baseline.meanRt : 0;
  const { level, title } = accuracyLevel(correct, total);

  const label = isClassic ? "حالت رنگ واژه (کلاسیک)" : "حالت واژه های هیجانی";
  const note = isClassic
    ? `در کارت های ناهمنخوان، معنای واژه با رنگ جوهر مغایرت دارد. میانگین زمان واکنش در این کارتها ${interference > 0 ? "بیشتر" : "کمتر"} از کارت های همنخوان بود (${Math.abs(interference)} میلیثانیه، تداخل ${interferenceWord(interference)}). `
    : `واژه های هیجانی می توانند توجه را به معنای خود جلب کنند. میانگین زمان واکنش در این واژه ها ${interference > 0 ? "بیشتر" : "کمتر"} از واژه های خنثی بود (${Math.abs(interference)} میلیثانیه، تداخل ${interferenceWord(interference)}). `;

  return { mode, label, total, correct, accuracy, meanRt, interference, baseline, challenge, level, title, note };
}

export function buildStroopReport(test: PsychTest, answers: Answers): StroopReport {
  const questions = test.questions;
  const classic = modeView("classic", questions, answers);
  const emotional = modeView("emotional", questions, answers);

  const total = classic.total + emotional.total;
  const correct = classic.correct + emotional.correct;
  const rtSum = classic.meanRt * classic.total + emotional.meanRt * emotional.total;
  const overall = {
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    meanRt: total ? Math.round(rtSum / total) : 0,
  };

  const summaryTitle = "نیم رخ توجه و کنترل شناختی شما";
  const summaryParagraphs = [
    `دقت کلی شما در شناسایی رنگ جوهر ${overall.accuracy} درصد بود (${correct} پاسخ درست از ${total} کارت). `
      + `در حالت رنگ واژه ${classic.accuracy} درصد و در حالت واژه های هیجانی ${emotional.accuracy} درصد پاسخ درست ثبت شد.`,
    classic.note + emotional.note,
    `اگر دقت شما در یکی از حالت ها به طور قابل توجهی کمتر از حالت دیگر است، آن حالت می تواند نقطه نیاز به تمرین یا بررسی بیشتر باشد. `
      + `نتیجه زمان واکنش تحت تأثیر سرعت عمومی پردازش و سطح هوشیاری نیز قرار میگیرد و به تنهایی تشخیص بالینی محسوب نمی شود.`,
  ];

  return { classic, emotional, overall, summaryTitle, summaryParagraphs };
}

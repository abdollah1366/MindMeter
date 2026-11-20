/**
 * منبع جداگانهی متون ۳۰ گویهی VHI-30.
 *
 * مقدار `text: null` به معنای «متن تأییدشده در دسترس نیست» است. در چنین گویهای
 * یک متن جایگزین آشکار نمایش داده میشود تا مشخص باشد که متن واقعی وارد نشده
 * است. متن جایگزین نباید بهعنوان ترجمه معتبر یا بخشی از ابزار استاندارد تلقی
 * شود. هنگامی که منبع معتبر فراهم شد، تنها کافی است رشته متن متناظر را در
 * لیست زیر قرار داد؛ ساختار، نمایش و محاسبه نمره بدون تغییر باقی میماند.
 */
import {
  VHI_MISSING_WORDING_TEXT,
  type VHIQuestion,
  type VhiDomain,
} from "./vhi-30-types";

type VhiItemSeed = {
  id: string;
  domain: VhiDomain;
  text: string | null;
};

/** متون گویهها؛ فعلاً هیچکدام از منبع تأییدشده ای وارد نشدهاند. */
const ITEM_SEEDS: readonly VhiItemSeed[] = [
  { id: "F1", domain: "functional", text: null },
  { id: "F2", domain: "functional", text: null },
  { id: "F3", domain: "functional", text: null },
  { id: "F4", domain: "functional", text: null },
  { id: "F5", domain: "functional", text: null },
  { id: "F6", domain: "functional", text: null },
  { id: "F7", domain: "functional", text: null },
  { id: "F8", domain: "functional", text: null },
  { id: "F9", domain: "functional", text: null },
  { id: "F10", domain: "functional", text: null },
  { id: "P1", domain: "physical", text: null },
  { id: "P2", domain: "physical", text: null },
  { id: "P3", domain: "physical", text: null },
  { id: "P4", domain: "physical", text: null },
  { id: "P5", domain: "physical", text: null },
  { id: "P6", domain: "physical", text: null },
  { id: "P7", domain: "physical", text: null },
  { id: "P8", domain: "physical", text: null },
  { id: "P9", domain: "physical", text: null },
  { id: "P10", domain: "physical", text: null },
  { id: "E1", domain: "emotional", text: null },
  { id: "E2", domain: "emotional", text: null },
  { id: "E3", domain: "emotional", text: null },
  { id: "E4", domain: "emotional", text: null },
  { id: "E5", domain: "emotional", text: null },
  { id: "E6", domain: "emotional", text: null },
  { id: "E7", domain: "emotional", text: null },
  { id: "E8", domain: "emotional", text: null },
  { id: "E9", domain: "emotional", text: null },
  { id: "E10", domain: "emotional", text: null },
];

export const VHI_30_QUESTIONS: readonly VHIQuestion[] = ITEM_SEEDS.map((seed, index) => ({
  id: seed.id,
  domain: seed.domain,
  order: index + 1,
  text: seed.text ?? VHI_MISSING_WORDING_TEXT,
  wordingStatus: seed.text ? "AVAILABLE" : "MISSING",
}));

export const VHI_30_QUESTION_IDS: readonly string[] = VHI_30_QUESTIONS.map((question) => question.id);

export const VHI_30_MISSING_COUNT = VHI_30_QUESTIONS.filter(
  (question) => question.wordingStatus === "MISSING",
).length;

export function getVhi30Question(id: string): VHIQuestion | undefined {
  return VHI_30_QUESTIONS.find((question) => question.id === id);
}

/** گویههای یک دامنه، بر اساس ترتیب پرسشنامه. */
export function vhi30QuestionsForDomain(domain: VhiDomain): VHIQuestion[] {
  return VHI_30_QUESTIONS.filter((question) => question.domain === domain);
}

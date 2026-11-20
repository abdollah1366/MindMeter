/**
 * منبع جداگانه‌ی متون ۳۰ گویه‌ی VHI-30.
 *
 * متن اصلی انگلیسی از فرم استاندارد VHI-30 (Jacobson et al., 1997) و دو فرم
 * بالینی منتشرشده (Bayside Voice Centre و WNY ENT) استخراج و با هم مقابله شد.
 * ترجمه‌ی زیر یک برگردان روان فارسی است، نه نسخه‌ی اعتبارسنجی‌شده‌ی رسمی فارسی؛
 * پیش از استفاده‌ی بالینی، روایی و پایایی این ترجمه باید بررسی شود.
 *
 * مقدار `text: null` همچنان پشتیبانی می‌شود تا اگر گویه‌ای بدون متن ماند،
 * به‌جای متن ساختگی یک هشدار آشکار نمایش داده شود.
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

/** متون فارسی گویه‌ها، بر اساس فرم استاندارد VHI-30. */
const ITEM_SEEDS: readonly VhiItemSeed[] = [
  // Functional — F1..F10
  { id: "F1", domain: "functional", text: "صدایم باعث می‌شود دیگران به‌سختی مرا بشنوند." },
  { id: "F2", domain: "functional", text: "در محیط‌های شلوغ، دیگران به‌سختی متوجه حرف‌هایم می‌شوند." },
  { id: "F3", domain: "functional", text: "وقتی از این سوی خانه خانواده را صدا می‌زنم، به‌سختی صدایم را می‌شنوند." },
  { id: "F4", domain: "functional", text: "کمتر از آنچه دوست دارم از تلفن استفاده می‌کنم." },
  { id: "F5", domain: "functional", text: "به‌خاطر صدایم، معمولاً از جمع‌های شلوغ دوری می‌کنم." },
  { id: "F6", domain: "functional", text: "به‌خاطر صدایم، کمتر با دوستان، همسایه‌ها یا اقوام صحبت می‌کنم." },
  { id: "F7", domain: "functional", text: "وقتی رو در رو صحبت می‌کنم، دیگران از من می‌خواهند حرفم را تکرار کنم." },
  { id: "F8", domain: "functional", text: "مشکلات صوتی‌ام زندگی شخصی و اجتماعی‌ام را محدود کرده است." },
  { id: "F9", domain: "functional", text: "به‌خاطر صدایم احساس می‌کنم از گفت‌وگوها کنار گذاشته شده‌ام." },
  { id: "F10", domain: "functional", text: "مشکل صوتی‌ام باعث کاهش درآمدم می‌شود." },

  // Physical — P1..P10
  { id: "P1", domain: "physical", text: "وقتی صحبت می‌کنم، نفسم کم می‌آید." },
  { id: "P2", domain: "physical", text: "صدایم در طول روز تغییر می‌کند." },
  { id: "P3", domain: "physical", text: "مردم می‌پرسند: «صدایت چه شده؟»" },
  { id: "P4", domain: "physical", text: "صدایم خش‌دار و خشک به نظر می‌رسد." },
  { id: "P5", domain: "physical", text: "احساس می‌کنم برای حرف زدن باید به خودم فشار بیاورم." },
  { id: "P6", domain: "physical", text: "وضوح صدایم قابل پیش‌بینی نیست." },
  { id: "P7", domain: "physical", text: "سعی می‌کنم صدایم را تغییر دهم تا متفاوت به نظر برسد." },
  { id: "P8", domain: "physical", text: "برای صحبت کردن انرژی و تلاش زیادی صرف می‌کنم." },
  { id: "P9", domain: "physical", text: "صدایم در عصر بدتر می‌شود." },
  { id: "P10", domain: "physical", text: "صدایم وسط حرف زدن از کار می‌افتد." },

  // Emotional — E1..E10
  { id: "E1", domain: "emotional", text: "به‌خاطر صدایم، هنگام صحبت با دیگران مضطرب می‌شوم." },
  { id: "E2", domain: "emotional", text: "به نظر می‌رسد دیگران از صدایم کلافه می‌شوند." },
  { id: "E3", domain: "emotional", text: "احساس می‌کنم دیگران مشکل صوتی‌ام را درک نمی‌کنند." },
  { id: "E4", domain: "emotional", text: "مشکل صوتی‌ام مرا ناراحت می‌کند." },
  { id: "E5", domain: "emotional", text: "به‌خاطر مشکل صوتی‌ام، کمتر در جمع‌ها حاضر می‌شوم." },
  { id: "E6", domain: "emotional", text: "صدایم باعث می‌شود احساس محدودیت و ناتوانی کنم." },
  { id: "E7", domain: "emotional", text: "وقتی دیگران از من می‌خواهند حرفم را تکرار کنم، کلافه می‌شوم." },
  { id: "E8", domain: "emotional", text: "وقتی دیگران از من می‌خواهند حرفم را تکرار کنم، خجالت می‌کشم." },
  { id: "E9", domain: "emotional", text: "صدایم باعث می‌شود احساس بی‌کفایتی کنم." },
  { id: "E10", domain: "emotional", text: "از مشکل صوتی‌ام شرمنده‌ام." },
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

/** گویه‌های یک دامنه، بر اساس ترتیب پرسشنامه. */
export function vhi30QuestionsForDomain(domain: VhiDomain): VHIQuestion[] {
  return VHI_30_QUESTIONS.filter((question) => question.domain === domain);
}

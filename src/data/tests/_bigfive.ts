import type { Scale } from "@/lib/types";
import { tertiles } from "@/lib/scoring";

export type Factor = "E" | "A" | "C" | "N" | "O";

/** بانک سؤال‌های IPIP (نشانگرهای پنج عامل گلدبرگ). کلید: متن انگلیسی اصلی برای ردیابی. */
export const ITEMS: Record<string, { fa: string; factor: Factor; reverse: boolean }> = {
  "Am the life of the party.": { fa: "روح جمع و مایه‌ی شادی مهمانی‌ها هستم.", factor: "E", reverse: false },
  "Feel little concern for others.": { fa: "نسبت به دیگران دغدغه‌ی کمی دارم.", factor: "A", reverse: true },
  "Am always prepared.": { fa: "همیشه آماده‌ام.", factor: "C", reverse: false },
  "Get stressed out easily.": { fa: "زود دچار استرس می‌شوم.", factor: "N", reverse: false },
  "Have a rich vocabulary.": { fa: "دایره‌ی واژگان گسترده‌ای دارم.", factor: "O", reverse: false },
  "Don't talk a lot.": { fa: "زیاد حرف نمی‌زنم.", factor: "E", reverse: true },
  "Am interested in people.": { fa: "به آدم‌ها علاقه‌مندم.", factor: "A", reverse: false },
  "Leave my belongings around.": { fa: "وسایلم را این‌طرف و آن‌طرف رها می‌کنم.", factor: "C", reverse: true },
  "Am relaxed most of the time.": { fa: "بیشتر اوقات آرامم.", factor: "N", reverse: true },
  "Have difficulty understanding abstract ideas.": { fa: "در فهم ایده‌های انتزاعی مشکل دارم.", factor: "O", reverse: true },
  "Feel comfortable around people.": { fa: "در کنار دیگران احساس راحتی می‌کنم.", factor: "E", reverse: false },
  "Insult people.": { fa: "به دیگران توهین می‌کنم.", factor: "A", reverse: true },
  "Pay attention to details.": { fa: "به جزئیات توجه می‌کنم.", factor: "C", reverse: false },
  "Worry about things.": { fa: "درباره‌ی مسائل نگران می‌شوم.", factor: "N", reverse: false },
  "Have a vivid imagination.": { fa: "تخیل قوی و زنده‌ای دارم.", factor: "O", reverse: false },
  "Keep in the background.": { fa: "ترجیح می‌دهم در حاشیه بمانم.", factor: "E", reverse: true },
  "Sympathize with others' feelings.": { fa: "با احساسات دیگران همدردی می‌کنم.", factor: "A", reverse: false },
  "Make a mess of things.": { fa: "کارها را به هم می‌ریزم.", factor: "C", reverse: true },
  "Seldom feel blue.": { fa: "به‌ندرت احساس غمگینی می‌کنم.", factor: "N", reverse: true },
  "Am not interested in abstract ideas.": { fa: "به ایده‌های انتزاعی علاقه‌ای ندارم.", factor: "O", reverse: true },
  "Start conversations.": { fa: "سر صحبت را باز می‌کنم.", factor: "E", reverse: false },
  "Am not interested in other people's problems.": { fa: "به مشکلات دیگران علاقه‌ای ندارم.", factor: "A", reverse: true },
  "Get chores done right away.": { fa: "کارهای روزمره را فوراً انجام می‌دهم.", factor: "C", reverse: false },
  "Am easily disturbed.": { fa: "به‌راحتی آشفته می‌شوم.", factor: "N", reverse: false },
  "Have excellent ideas.": { fa: "ایده‌های عالی دارم.", factor: "O", reverse: false },
  "Have little to say.": { fa: "حرف زیادی برای گفتن ندارم.", factor: "E", reverse: true },
  "Have a soft heart.": { fa: "دل‌نازک و مهربانم.", factor: "A", reverse: false },
  "Often forget to put things back in their proper place.": { fa: "اغلب فراموش می‌کنم وسایل را سر جایشان برگردانم.", factor: "C", reverse: true },
  "Get upset easily.": { fa: "زود ناراحت می‌شوم.", factor: "N", reverse: false },
  "Do not have a good imagination.": { fa: "تخیل خوبی ندارم.", factor: "O", reverse: true },
  "Talk to a lot of different people at parties.": { fa: "در مهمانی‌ها با افراد مختلف زیادی صحبت می‌کنم.", factor: "E", reverse: false },
  "Am not really interested in others.": { fa: "واقعاً به دیگران علاقه‌ای ندارم.", factor: "A", reverse: true },
  "Like order.": { fa: "نظم و ترتیب را دوست دارم.", factor: "C", reverse: false },
  "Change my mood a lot.": { fa: "حال و هوایم زیاد عوض می‌شود.", factor: "N", reverse: false },
  "Am quick to understand things.": { fa: "مطالب را سریع می‌فهمم.", factor: "O", reverse: false },
  "Don't like to draw attention to myself.": { fa: "دوست ندارم توجه دیگران را به خودم جلب کنم.", factor: "E", reverse: true },
  "Take time out for others.": { fa: "برای دیگران وقت می‌گذارم.", factor: "A", reverse: false },
  "Shirk my duties.": { fa: "از زیر بار وظایفم شانه خالی می‌کنم.", factor: "C", reverse: true },
  "Have frequent mood swings.": { fa: "نوسان‌های خلقی زیادی دارم.", factor: "N", reverse: false },
  "Use difficult words.": { fa: "از واژه‌های دشوار استفاده می‌کنم.", factor: "O", reverse: false },
  "Don't mind being the center of attention.": { fa: "از اینکه در مرکز توجه باشم ناراحت نمی‌شوم.", factor: "E", reverse: false },
  "Feel others' emotions.": { fa: "احساسات دیگران را درک می‌کنم و حس می‌کنم.", factor: "A", reverse: false },
  "Follow a schedule.": { fa: "طبق برنامه پیش می‌روم.", factor: "C", reverse: false },
  "Get irritated easily.": { fa: "زود عصبانی و کلافه می‌شوم.", factor: "N", reverse: false },
  "Spend time reflecting on things.": { fa: "برای تأمل درباره‌ی مسائل وقت می‌گذارم.", factor: "O", reverse: false },
  "Am quiet around strangers.": { fa: "در کنار غریبه‌ها ساکتم.", factor: "E", reverse: true },
  "Make people feel at ease.": { fa: "کاری می‌کنم که دیگران احساس راحتی کنند.", factor: "A", reverse: false },
  "Am exacting in my work.": { fa: "در کارم دقیق و سخت‌گیرم.", factor: "C", reverse: false },
  "Often feel blue.": { fa: "اغلب احساس غمگینی می‌کنم.", factor: "N", reverse: false },
  "Am full of ideas.": { fa: "سرشار از ایده‌ام.", factor: "O", reverse: false },
};

const FACTORS: Record<Factor, { title: string; description: string; low: string; mid: string; high: string }> = {
  E: {
    title: "برون‌گرایی",
    description: "میل به معاشرت، ابراز وجود و انرژی گرفتن از جمع",
    low: "بیشتر درون‌گرا هستید؛ از تنهایی و جمع‌های کوچک انرژی می‌گیرید و پیش از صحبت فکر می‌کنید.",
    mid: "بسته به موقعیت، هم از جمع و هم از تنهایی لذت می‌برید.",
    high: "برون‌گرا هستید؛ از معاشرت انرژی می‌گیرید، پرحرف و ابرازگر هستید.",
  },
  A: {
    title: "توافق‌پذیری",
    description: "مهربانی، همدلی، اعتماد و تمایل به همکاری",
    low: "صریح و رقابتی هستید و منافع خودتان را محکم دنبال می‌کنید.",
    mid: "تعادلی میان همکاری با دیگران و دفاع از خواسته‌های خود دارید.",
    high: "مهربان، همدل و همکار هستید و به نیاز دیگران اهمیت زیادی می‌دهید.",
  },
  C: {
    title: "وجدان‌مندی",
    description: "نظم، مسئولیت‌پذیری، برنامه‌ریزی و پشتکار",
    low: "انعطاف‌پذیر و خودجوش هستید، اما ممکن است در نظم و پیگیری کارها چالش داشته باشید.",
    mid: "در بیشتر موارد منظم و مسئولید، اما گاهی خودجوش عمل می‌کنید.",
    high: "بسیار منظم، مسئولیت‌پذیر و هدفمند هستید.",
  },
  N: {
    title: "روان‌رنجوری (بی‌ثباتی هیجانی)",
    description: "حساسیت به استرس، نگرانی و نوسان هیجانی",
    low: "از نظر هیجانی باثبات و آرام هستید و استرس را به خوبی تحمل می‌کنید.",
    mid: "واکنش هیجانی شما به استرس در حد معمول است.",
    high: "نسبت به استرس حساس هستید و هیجان‌های منفی را شدیدتر تجربه می‌کنید. مهارت‌های تنظیم هیجان می‌تواند کمک کند.",
  },
  O: {
    title: "گشودگی (عقل و تخیل)",
    description: "کنجکاوی ذهنی، تخیل و علاقه به ایده‌های تازه",
    low: "عمل‌گرا و واقع‌بین هستید و روش‌های آشنا را ترجیح می‌دهید.",
    mid: "میان کنجکاوی برای ایده‌های تازه و تکیه بر روش‌های آشنا تعادل دارید.",
    high: "کنجکاو، خلاق و علاقه‌مند به ایده‌های انتزاعی و تجربه‌های تازه هستید.",
  },
};

export const FACTOR_ORDER: Factor[] = ["E", "A", "C", "N", "O"];

export function bigFiveScales(itemsPerFactor: number): Scale[] {
  return FACTOR_ORDER.map((f) => ({
    key: f,
    title: FACTORS[f].title,
    description: FACTORS[f].description,
    results: tertiles(
      itemsPerFactor,
      itemsPerFactor * 5,
      ["پایین", "متوسط", "بالا"],
      [FACTORS[f].low, FACTORS[f].mid, FACTORS[f].high],
    ),
  }));
}

export function buildQuestions(englishItems: string[]) {
  return englishItems.map((en, i) => {
    const item = ITEMS[en];
    if (!item) throw new Error(`Unknown IPIP item: ${en}`);
    return { id: `q${i + 1}`, text: item.fa, scale: item.factor, ...(item.reverse ? { reverse: true } : {}) };
  });
}

export const BIG_FIVE_INSTRUCTIONS =
  "جمله‌های زیر رفتارهای رایج را توصیف می‌کنند. مشخص کنید هر جمله چقدر شما را درست توصیف می‌کند؛ خودتان را همان‌طور که اکنون هستید توصیف کنید، نه آن‌طور که دوست دارید باشید.";

import { EAT10_ITEMS, EAT10_MAX_TOTAL, type Eat10Answers } from "./eat-10-types";

export function isEat10Score(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 4;
}
export function isEat10Complete(answers: Eat10Answers): boolean {
  return EAT10_ITEMS.every((item) => isEat10Score(answers[item.id]));
}
export function scoreEat10(answers: Eat10Answers): number {
  return EAT10_ITEMS.reduce((sum, item) => sum + (isEat10Score(answers[item.id]) ? answers[item.id] : 0), 0);
}
export function setEat10Answer(prev: Eat10Answers, id: string, score: number): Eat10Answers {
  if (!isEat10Score(score)) return prev;
  if (!EAT10_ITEMS.some((i) => i.id === id)) return prev;
  return { ...prev, [id]: score };
}

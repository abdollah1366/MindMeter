/** عیبیابی موقتی جریان مجوز میکروفون؛ فقط با پارامتر ?micDebug=1 فعال میشود. */

export const MIC_DEBUG_EVENTS: string[] = [];

export function micDebugEnabled(): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("micDebug");
}

export function micDebugLog(event: string, detail?: unknown): void {
  if (!micDebugEnabled()) return;
  const time = new Date().toISOString().slice(11, 23);
  const suffix = detail === undefined ? "" : ` ${JSON.stringify(detail)}`;
  const line = `${time} ${event}${suffix}`;
  MIC_DEBUG_EVENTS.push(line);
  if (MIC_DEBUG_EVENTS.length > 100) MIC_DEBUG_EVENTS.shift();
  console.log("[mic]", line);
}

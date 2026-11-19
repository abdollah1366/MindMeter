import type { D2Cell } from "@/data/d2-content";

/**
 * نمایش یک محرک آزمون d2: حرف d یا p همراه با خط‌های کوتاه بالا و پایین.
 * اندازه‌ی کوچک برای جدول نمونه و اندازه‌ی معمول برای اجرای آزمون استفاده می‌شود.
 */
export default function D2Stimulus({ cell, size = "md" }: { cell: D2Cell; size?: "sm" | "md" }) {
  const letter = size === "sm" ? "text-lg" : "text-2xl";
  const dash = size === "sm" ? "h-1 w-[1.5px]" : "h-1.5 w-[2px]";
  const gap = size === "sm" ? "gap-[1px]" : "gap-[2px]";
  const row = size === "sm" ? "h-1.5" : "h-2";

  return (
    <span className="inline-flex select-none flex-col items-center justify-center leading-none" aria-hidden="true">
      <span className={`flex items-end ${row} ${gap}`}>
        {Array.from({ length: cell.top }).map((_, i) => (
          <span key={`top-${i}`} className={`${dash} rounded-full bg-current`} />
        ))}
      </span>
      <span className={`font-serif font-semibold leading-none ${letter}`}>{cell.letter}</span>
      <span className={`flex items-start ${row} ${gap}`}>
        {Array.from({ length: cell.bottom }).map((_, i) => (
          <span key={`bottom-${i}`} className={`${dash} rounded-full bg-current`} />
        ))}
      </span>
    </span>
  );
}

import { themeOf } from "@/lib/academy";

/** جلد گرافیکی دوره (بدون تصویر؛ گرادیان رنگ و حرف اول عنوان) */
export default function CourseCover({ title, theme, className = "h-36" }: { title: string; theme: string; className?: string }) {
  const t = themeOf(theme);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${t.cover} ${className}`}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
        <circle cx="170" cy="20" r="45" fill="white" />
        <circle cx="30" cy="95" r="35" fill="white" />
        <path d="M0 70 Q50 40 100 65 T200 55" stroke="white" strokeWidth="3" fill="none" />
      </svg>
      <span className="absolute bottom-3 right-4 text-4xl font-black text-white/90">{title.trim().charAt(0)}</span>
    </div>
  );
}

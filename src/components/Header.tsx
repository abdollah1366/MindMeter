import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-extrabold text-brand-600">
          مایندمتر
        </Link>
        <nav className="flex gap-5 text-sm text-slate-600">
          <Link href="/" className="hover:text-brand-600">
            تست‌ها
          </Link>
          <Link href="/about" className="hover:text-brand-600">
            درباره ما
          </Link>
        </nav>
      </div>
    </header>
  );
}

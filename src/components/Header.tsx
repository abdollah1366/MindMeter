"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/tests", label: "همه‌ی تست‌ها" },
  { href: "/#categories", label: "دسته‌بندی‌ها" },
  { href: "/blog", label: "مقالات" },
  { href: "/my-results", label: "نتایج من" },
  { href: "/about", label: "درباره ما" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-brand-600">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-base text-white">
            م
          </span>
          مایندمتر
        </Link>

        <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/tests"
          className="hidden rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 md:block"
        >
          شروع تست
        </Link>

        <button
          className="rounded-lg p-2 text-slate-600 md:hidden"
          aria-label="منو"
          onClick={() => setOpen(!open)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-slate-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

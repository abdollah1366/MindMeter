"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/tests", label: "همه‌ی تست‌ها" },
  { href: "/#categories", label: "دسته‌بندی‌ها" },
  { href: "/clinicians", label: "متخصصان" },
  { href: "/blog", label: "مقالات" },
    { href: "/about", label: "درباره ما" },
];

type NavLink = { href: string; label: string };

export default function Header({ userLabel, extraLinks = [] }: { userLabel: string | null; extraLinks?: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const all = [...links, ...extraLinks];

  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-brand-600">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-calm-500 text-base text-white">
            م
          </span>
          مایندمتر
        </Link>

        <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
          {all.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href={userLabel ? "/my-results" : "/login"}
            className="rounded-xl border border-brand-200 px-4 py-2 text-sm text-brand-700 hover:bg-brand-50"
          >
            {userLabel ?? "ورود / ثبت‌نام"}
          </Link>
          <Link href="/tests" className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            شروع تست
          </Link>
        </div>

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
          <Link href={userLabel ? "/my-results" : "/login"} onClick={() => setOpen(false)} className="block py-3 font-bold text-brand-700">
            {userLabel ?? "ورود / ثبت‌نام"}
          </Link>
          {all.map((l) => (
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

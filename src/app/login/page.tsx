import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "ورود / ثبت‌نام" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next = "/my-results" } = await searchParams;
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/my-results";
  if (await getSessionUserId()) redirect(safe);

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-extrabold">ورود یا ثبت‌نام</h1>
        <p className="mt-2 mb-6 text-sm leading-7 text-slate-500">
          با شماره موبایل خود وارد شوید. اگر حساب ندارید، به‌صورت خودکار ساخته می‌شود.
        </p>
        <LoginForm next={safe} />
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-slate-400">
        با ورود، <a href="/about" className="underline">قوانین و حریم خصوصی</a> مایندمتر را می‌پذیرید.
      </p>
    </div>
  );
}

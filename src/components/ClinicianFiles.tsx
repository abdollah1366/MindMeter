import { db } from "@/lib/db";
import Avatar from "./Avatar";
import StateForm from "./academy/StateForm";
import { removeAvatar, removeDocument, uploadAvatar, uploadDocument } from "@/server/uploads";
import { formatJalali } from "@/lib/jalali";

const fileInput = "block w-full text-sm file:me-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700 hover:file:bg-brand-100";

/** عکس پروفایل و مدارک متخصص (در صفحه‌ی عضویت) */
export default async function ClinicianFiles({ userId, avatarId, firstName }: { userId: string; avatarId: string | null; firstName: string | null }) {
  const docs = await db.upload.findMany({ where: { ownerId: userId, kind: "DOCUMENT" }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="font-extrabold">عکس پروفایل</h2>
        <p className="mt-1 text-xs leading-6 text-slate-500">در فهرست متخصصان و صفحه‌ی شما نمایش داده می‌شود. عکس به‌صورت مربعی برش می‌خورد.</p>
        <div className="mt-4 flex items-center gap-4">
          <Avatar avatarId={avatarId} name={firstName} size={72} />
          {avatarId && (
            <form action={removeAvatar}>
              <button className="text-xs text-rose-600 hover:underline">حذف عکس</button>
            </form>
          )}
        </div>
        <StateForm action={uploadAvatar} className="mt-4 grid gap-3" submit="بارگذاری عکس" okText="عکس ذخیره شد.">
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className={fileInput} />
        </StateForm>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="font-extrabold">مدارک</h2>
        <p className="mt-1 text-xs leading-6 text-slate-500">کارت نظام روانشناسی/پزشکی و مدرک تحصیلی (تصویر یا PDF، حداکثر ۵ مگابایت). فقط مدیر سایت این مدارک را می‌بیند.</p>
        {docs.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                <a href={`/api/files/${d.id}`} target="_blank" rel="noopener" className="truncate text-brand-700 hover:underline" dir="auto">{d.name}</a>
                <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                  {formatJalali(d.createdAt)}
                  <form action={removeDocument}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="text-rose-600 hover:underline">حذف</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        <StateForm action={uploadDocument} className="mt-4 grid gap-3" submit="بارگذاری مدرک" okText="مدرک ذخیره شد.">
          <input type="file" name="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className={fileInput} />
        </StateForm>
      </section>
    </div>
  );
}

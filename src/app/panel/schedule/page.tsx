import type { Metadata } from "next";
import { requireClinician } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { minuteToHHMM } from "@/lib/tehran-time";
import ScheduleForm from "@/components/ScheduleForm";

export const metadata: Metadata = { title: "برنامه‌ی کاری" };

export default async function SchedulePage() {
  const { profile } = await requireClinician();
  const slots = await db.availability.findMany({ where: { clinicianId: profile.id }, orderBy: { startMinute: "asc" } });
  const days = Array.from({ length: 7 }, (_, wd) =>
    slots
      .filter((s) => s.weekday === wd)
      .map((s) => `${minuteToHHMM(s.startMinute)}-${minuteToHHMM(s.endMinute)}`)
      .join(", "),
  );
  return (
    <>
      <h1 className="mb-5 text-xl font-extrabold">برنامه‌ی کاری و تعرفه</h1>
      <ScheduleForm
        sessionPrice={profile.sessionPrice}
        sessionMinutes={profile.sessionMinutes}
        acceptsOnline={profile.acceptsOnline}
        days={days}
      />
    </>
  );
}

"use client";

import { useActionState } from "react";
import { confirmManualPayment } from "@/server/manual-payment";

export default function ConfirmPaymentButton({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(confirmManualPayment, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <button disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
        {pending ? "در حال تأیید…" : "تأیید پرداخت و فعال‌سازی"}
      </button>
      {state?.error ? <span className="text-sm text-rose-700">{state.error}</span> : null}
      {state?.ok ? <span className="text-sm text-emerald-700">پرداخت تأیید شد.</span> : null}
    </form>
  );
}

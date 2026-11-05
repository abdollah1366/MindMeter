export default function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/tests" className="flex w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-brand-500">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="جستجوی تست؛ مثلاً استرس، شخصیت، عزت نفس…"
        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-800 outline-none placeholder:text-slate-400"
      />
      <button className="shrink-0 bg-brand-600 px-5 text-white hover:bg-brand-700">جستجو</button>
    </form>
  );
}

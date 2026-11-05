/** نمایش متن مقاله: پاراگراف‌ها با خط خالی جدا می‌شوند؛ خط شروع‌شده با ## تیتر است و با - فهرست */
export default function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 leading-9 text-slate-700">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) return <h2 key={i} className="pt-2 text-xl font-extrabold text-ink">{b.slice(3)}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i} className="list-inside list-disc space-y-1">
              {lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}
            </ul>
          );
        return <p key={i} className="whitespace-pre-line">{b}</p>;
      })}
    </div>
  );
}

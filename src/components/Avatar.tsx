/** عکس پروفایل متخصص یا حرف اول نام */
export default function Avatar({ avatarId, name, size = 48 }: { avatarId?: string | null; name?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (avatarId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${avatarId}`} alt="" width={size} height={size} style={style} className="shrink-0 rounded-full object-cover ring-2 ring-white" loading="lazy" />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-calm-100 font-bold text-brand-700">
      {name?.trim()?.[0] ?? "؟"}
    </span>
  );
}

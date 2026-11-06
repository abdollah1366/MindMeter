import { videoSource } from "@/lib/academy";

export default function VideoPlayer({ url, title }: { url: string | null; title: string }) {
  const src = videoSource(url);
  if (!src) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {src.type === "file" ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={src.src} controls controlsList="nodownload" preload="metadata" className="h-full w-full" />
      ) : (
        <iframe src={src.src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
      )}
    </div>
  );
}

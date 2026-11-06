import { ImageResponse } from "next/og";
import { getTest } from "@/data/tests";
import { OG_SIZE, OgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MindMeter psychological test";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const test = getTest((await params).slug);
  return new ImageResponse(
    test ? (
      <OgCard
        eyebrow="FREE ONLINE TEST"
        title={test.code}
        subtitle={test.englishTitle}
        chips={[`${test.questions.length} questions`, `~${test.estimatedMinutes} min`, "Instant report"]}
      />
    ) : (
      <OgCard eyebrow="MINDMETER" title="Psychological Tests" />
    ),
    size,
  );
}

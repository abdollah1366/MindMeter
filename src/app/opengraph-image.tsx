import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MindMeter - psychological tests, online visits and academy";

export default function Image() {
  return new ImageResponse(
    <OgCard eyebrow="MINDMETER" title="Know yourself better" subtitle="Standard psychological tests in Persian" chips={["Free tests", "Online visits", "Academy"]} />,
    size,
  );
}

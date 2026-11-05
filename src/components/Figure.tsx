import type { Glyph, MatrixFigure } from "@/lib/types";

/**
 * رنگ هر شکل ثابت است (رنگ اطلاعات اضافه‌ای در قاعده‌ی سؤال ندارد و فقط برای جذابیت و تشخیص راحت‌تر است).
 * [رنگ پُر، رنگ خط]
 */
const COLORS: Record<Glyph["shape"], [string, string]> = {
  circle: ["#3b82f6", "#1d4ed8"],
  square: ["#14b8a6", "#0f766e"],
  triangle: ["#f97316", "#c2410c"],
  diamond: ["#8b5cf6", "#6d28d9"],
  star: ["#eab308", "#a16207"],
  arrow: ["#e11d48", "#9f1239"],
};

/** مسیر یک شکل در مختصات ‎-10..10‎ */
function ShapePath({ shape, fill, stroke }: { shape: Glyph["shape"]; fill: string; stroke: string }) {
  const common = { fill, stroke, strokeWidth: 1.6, strokeLinejoin: "round" as const };
  switch (shape) {
    case "circle":
      return <circle r={8} {...common} />;
    case "square":
      return <rect x={-7.5} y={-7.5} width={15} height={15} {...common} />;
    case "triangle":
      return <polygon points="0,-9 8.5,7 -8.5,7" {...common} />;
    case "diamond":
      return <polygon points="0,-9.5 7.5,0 0,9.5 -7.5,0" {...common} />;
    case "star":
      return <polygon points="0,-9.5 2.6,-3.2 9,-3 4,1.3 5.7,8 0,4.3 -5.7,8 -4,1.3 -9,-3 -2.6,-3.2" {...common} />;
    case "arrow":
      return <polygon points="0,-9.5 7,-1.5 2.5,-1.5 2.5,9 -2.5,9 -2.5,-1.5 -7,-1.5" {...common} />;
  }
}

/** چیدمان چند شکل در یک خانه */
const LAYOUT: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-11, 0], [11, 0]],
  3: [[-11, -10], [11, -10], [0, 10]],
  4: [[-11, -11], [11, -11], [-11, 11], [11, 11]],
};

export function GlyphCell({ glyph, size = 64, id }: { glyph: Glyph | null; size?: number; id: string }) {
  const count = Math.min(4, Math.max(1, glyph?.count ?? 1));
  const scale = count === 1 ? 1.6 : 0.95;
  const pattern = `stripes-${id}`;
  const [color, ink] = glyph ? COLORS[glyph.shape] : ["#000", "#000"];
  const fill = glyph?.fill === "solid" ? color : glyph?.fill === "striped" ? `url(#${pattern})` : "white";
  return (
    <svg viewBox="-25 -25 50 50" width={size} height={size} aria-hidden className="block">
      <defs>
        <pattern id={pattern} width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="3.2" height="3.2" fill="white" />
          <line x1="0" y1="0" x2="0" y2="3.2" stroke={color} strokeWidth="1.5" />
        </pattern>
      </defs>
      {glyph ? (
        LAYOUT[count].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${scale}) rotate(${glyph.rotate ?? 0})`}>
            <ShapePath shape={glyph.shape} fill={fill} stroke={ink} />
          </g>
        ))
      ) : (
        <text x="0" y="9" textAnchor="middle" fontSize="26" fontWeight="700" fill="#8a78e0">
          ؟
        </text>
      )}
    </svg>
  );
}

/** ماتریس ۳×۳ (چیدمان چپ‌به‌راست، مثل منابع بین‌المللی) */
export function Matrix({ figure, id }: { figure: MatrixFigure; id: string }) {
  return (
    <div dir="ltr" className="mx-auto grid w-fit grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
      {figure.cells.map((c, i) => (
        <div key={i} className={`grid place-items-center rounded-xl ${c ? "bg-white" : "border-2 border-dashed border-calm-500 bg-calm-50"}`}>
          <GlyphCell glyph={c} id={`${id}-${i}`} size={76} />
        </div>
      ))}
    </div>
  );
}

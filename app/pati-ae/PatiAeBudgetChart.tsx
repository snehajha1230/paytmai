"use client";

import { useId, useMemo, type ReactNode } from "react";
import type { PatiAeChartSeries } from "@/lib/pati-ae-chart-series";

function formatAxisInr(n: number): string {
  if (n >= 100_000)
    return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `₹${Math.round(n)}`;
}

function sumRow(row: number[]): number {
  return row.reduce((s, v) => s + v, 0);
}

type Props = {
  series: PatiAeChartSeries;
  title?: string;
};

const PROJECTED_OPACITY = 0.55;
const ACTUAL_OPACITY = 0.92;
const BAR_GAP = 0.1;

type PanelProps = {
  clipId: string;
  variant: "actual" | "ideal";
  categories: string[];
  categoryColors: Record<string, string>;
  dayLabels: string[];
  /** Per-day segment amounts (same shape as series.actual / series.projected) */
  matrix: number[][];
  yMax: number;
  /** If false, no bars for that day (empty column). */
  showDay: (d: number) => boolean;
  W: number;
  H: number;
  pad: { l: number; r: number; t: number; b: number };
  showXAxis: boolean;
  xAxisTitle: string;
};

function HistogramPanel({
  clipId,
  variant,
  categories,
  categoryColors,
  dayLabels,
  matrix,
  yMax,
  showDay,
  W,
  H,
  pad,
  showXAxis,
  xAxisTitle,
}: PanelProps) {
  const nDays = dayLabels.length;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const colW = innerW / Math.max(1, nDays);
  const barW = Math.max(2, colW * (1 - BAR_GAP));
  const opacity = variant === "actual" ? ACTUAL_OPACITY : PROJECTED_OPACITY;

  const yTicks = useMemo(() => {
    const ticks = 4;
    const out: number[] = [];
    for (let i = 0; i <= ticks; i++) out.push((yMax * i) / ticks);
    return out;
  }, [yMax]);

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="max-w-full"
      role="img"
      aria-label={
        variant === "actual"
          ? "Actual spending by day and category"
          : "Planned spending for remaining budget days"
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={pad.l} y={pad.t} width={innerW} height={innerH} rx={4} />
        </clipPath>
      </defs>

      {yTicks.map((t, i) => {
        const yNorm = yMax > 0 ? t / yMax : 0;
        const y = pad.t + innerH * (1 - yNorm);
        return (
          <g key={`${clipId}-yt-${i}`}>
            <line
              x1={pad.l}
              y1={y}
              x2={pad.l + innerW}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text
              x={pad.l - 8}
              y={y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize={10}
            >
              {formatAxisInr(t)}
            </text>
          </g>
        );
      })}

      <text
        x={14}
        y={pad.t + innerH / 2}
        fill="#64748b"
        fontSize={11}
        fontWeight={600}
        transform={`rotate(-90 14 ${pad.t + innerH / 2})`}
        textAnchor="middle"
      >
        ₹
      </text>

      <g clipPath={`url(#${clipId})`}>
        {Array.from({ length: nDays }, (_, d) => {
          if (!showDay(d)) return null;
          const x0 = pad.l + d * colW + (colW - barW) / 2;
          const scaleY = (amt: number) =>
            innerH * (yMax > 0 ? amt / yMax : 0);

          const nodes: ReactNode[] = [];
          let yOff = 0;
          for (let ci = 0; ci < categories.length; ci++) {
            const seg = matrix[d][ci] ?? 0;
            if (seg <= 0) continue;
            const h = scaleY(seg);
            const y = pad.t + innerH - yOff - h;
            yOff += h;
            nodes.push(
              <rect
                key={`${variant}-${d}-${ci}`}
                x={x0}
                y={y}
                width={barW}
                height={Math.max(0.5, h)}
                fill={categoryColors[categories[ci]]}
                opacity={opacity}
                rx={3}
              />,
            );
          }
          return <g key={`${variant}-day-${d}`}>{nodes}</g>;
        })}
      </g>

      {showXAxis ? (
        <>
          {dayLabels.map((label, d) => {
            const cx = pad.l + d * colW + colW / 2;
            return (
              <text
                key={`${clipId}-xl-${d}`}
                x={cx}
                y={H - 18}
                textAnchor="middle"
                fill="#64748b"
                fontSize={9}
              >
                {label}
              </text>
            );
          })}
          <text
            x={pad.l + innerW / 2}
            y={H - 4}
            textAnchor="middle"
            fill="#64748b"
            fontSize={11}
            fontWeight={600}
          >
            {xAxisTitle}
          </text>
        </>
      ) : null}
    </svg>
  );
}

export default function PatiAeBudgetChart({ series, title }: Props) {
  const baseId = useId().replace(/:/g, "");
  const { categories, categoryColors, dayLabels, projected, actual, idealDayVisible, periodComplete } =
    series;

  const nDays = dayLabels.length;
  const W = 720;
  const HPanel = 236;
  const pad = { l: 52, r: 14, t: 12, b: 44 };

  const yMaxActual = useMemo(() => {
    let m = 1;
    for (let d = 0; d < nDays; d++) {
      m = Math.max(m, sumRow(actual[d]));
    }
    return m;
  }, [actual, nDays]);

  const yMaxIdeal = useMemo(() => {
    let m = 1;
    for (let d = 0; d < nDays; d++) {
      if (idealDayVisible[d]) {
        m = Math.max(m, sumRow(projected[d]));
      }
    }
    return m;
  }, [projected, nDays, idealDayVisible]);

  const idealDaysCount = useMemo(() => {
    return idealDayVisible.filter(Boolean).length;
  }, [idealDayVisible]);

  const clipActual = `${baseId}-a`;
  const clipIdeal = `${baseId}-i`;

  return (
    <section
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e0f2fe] sm:p-5"
      aria-labelledby={title ? `${baseId}-title` : undefined}
    >
      {title ? (
        <h2
          id={`${baseId}-title`}
          className="text-[15px] font-bold text-[#0f172a] sm:text-[16px]"
        >
          {title}
        </h2>
      ) : null}
      <p className="mt-1 text-[11px] leading-snug text-[#64748b] sm:text-[12px]">
        <span className="font-semibold text-[#0f172a]">Now</span> follows the
        latest date in balance history. Your budget runs N days from when you
        saved (that same “now” day). Until the first payment in the window,{" "}
        <span className="font-semibold text-[#0f172a]">actual</span> stays empty
        and <span className="font-semibold text-[#0369a1]">planned</span> shows
        the full split. After spending starts, actual stacks on the current day
        and planned only shows that day onward, rebalanced. When history shows a
        newer day, earlier planned columns drop off. After the window ends,
        actual is per day and planned hides.
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-b border-[#f1f5f9] pb-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Categories
        </span>
        {categories.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#334155]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: categoryColors[c] }}
              aria-hidden
            />
            {c}
          </span>
        ))}
      </div>

      <div className="relative mt-4 space-y-1 w-full overflow-x-auto">
        <p className="text-[12px] font-bold text-[#0f172a]">Actual spending</p>
        <HistogramPanel
          clipId={clipActual}
          variant="actual"
          categories={categories}
          categoryColors={categoryColors}
          dayLabels={dayLabels}
          matrix={actual}
          yMax={yMaxActual}
          showDay={() => true}
          W={W}
          H={HPanel}
          pad={pad}
          showXAxis
          xAxisTitle="Days in budget period (dates)"
        />

        <p className="pt-4 text-[12px] font-bold text-[#0369a1]">
          Planned spend (ideal, remaining days)
        </p>
        {idealDaysCount === 0 ? (
          <p className="rounded-xl bg-[#f8fafc] px-3 py-6 text-center text-[12px] text-[#64748b]">
            {periodComplete
              ? "This budget window has ended — see actual spending by day above. Set a new budget for the next stretch."
              : "No planned columns to show for this window."}
          </p>
        ) : (
          <HistogramPanel
            clipId={clipIdeal}
            variant="ideal"
            categories={categories}
            categoryColors={categoryColors}
            dayLabels={dayLabels}
            matrix={projected}
            yMax={yMaxIdeal}
            showDay={(d) => Boolean(idealDayVisible[d])}
            W={W}
            H={HPanel}
            pad={pad}
            showXAxis
            xAxisTitle="Days in budget period (dates)"
          />
        )}
      </div>
    </section>
  );
}

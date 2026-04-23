"use client";

import { useId, useMemo } from "react";

function formatInrCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export type PatiAeSpendGaugeProps = {
  /** Upper bound (budget allowance for period / category). */
  budgetMax: number;
  /** Amount spent (clamped visually at max). */
  spent: number;
  /** Title under the gauge (e.g. category name). */
  label?: string;
  size?: "sm" | "md";
};

/**
 * Semi-circular speedometer-style gauge: arc 0 → max, needle at spent.
 */
export default function PatiAeSpendGauge({
  budgetMax,
  spent,
  label,
  size = "md",
}: PatiAeSpendGaugeProps) {
  const gradId = useId().replace(/:/g, "");
  const W = size === "sm" ? 160 : 200;
  const H = size === "sm" ? 100 : 118;
  const cx = W / 2;
  const cy = H - 8;
  const R = size === "sm" ? 58 : 72;
  const stroke = size === "sm" ? 10 : 12;

  const t = useMemo(() => {
    if (!Number.isFinite(budgetMax) || budgetMax <= 0) return 0;
    return Math.min(1, Math.max(0, spent / budgetMax));
  }, [budgetMax, spent]);

  /** Radians: π = left (0%), 0 = right (100%). */
  const needleAngle = Math.PI * (1 - t);
  const nx = cx + (R - 4) * Math.cos(needleAngle);
  const ny = cy - (R - 4) * Math.sin(needleAngle);

  const trackPath = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;

  const arcLen = Math.PI * R;
  const dashOffset = arcLen * (1 - t);

  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="max-w-full"
        aria-hidden={label ? undefined : true}
        role={label ? "img" : undefined}
        aria-label={
          label
            ? `${label}: spent ${formatInrCompact(spent)} of ${formatInrCompact(budgetMax)}`
            : undefined
        }
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#00baf2" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {/* Spent portion along arc */}
        <path
          d={trackPath}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLen}`}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#0f172a"
          strokeWidth={size === "sm" ? 2.5 : 3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={size === "sm" ? 5 : 6} fill="#0f172a" />
        <circle cx={cx} cy={cy} r={size === "sm" ? 2 : 2.5} fill="#fff" />

        {/* 0 / max labels */}
        <text
          x={cx - R - 2}
          y={cy + 4}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={size === "sm" ? 8 : 9}
          fontWeight={600}
        >
          0
        </text>
        <text
          x={cx + R + 2}
          y={cy + 4}
          textAnchor="start"
          fill="#94a3b8"
          fontSize={size === "sm" ? 8 : 9}
          fontWeight={600}
        >
          {formatInrCompact(budgetMax)}
        </text>
      </svg>

      <div className="mt-1 w-full text-center">
        {label ? (
          <p className="text-[11px] font-semibold text-[#334155]">{label}</p>
        ) : null}
        <p className="text-[10px] tabular-nums text-[#64748b]">
          <span className="font-bold text-[#0f172a]">
            ₹{formatInrCompact(spent)}
          </span>
          <span className="text-[#94a3b8]"> / </span>
          <span>₹{formatInrCompact(budgetMax)}</span>
        </p>
      </div>
    </div>
  );
}

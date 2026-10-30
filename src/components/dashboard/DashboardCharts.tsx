"use client";

import React, { useState } from "react";
import { formatMoney } from "@/lib/format";
import { TrendPoint, PaymentMethodPoint } from "@/hooks/useDashboard";

export function DashboardTrendChart({ data }: { data: TrendPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 border border-rule flex items-center justify-center text-sm text-secondary font-display">
        No sales data recorded in this period.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.profit)), 100);
  const width = 600;
  const height = 200;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const yRev = height - paddingY - (d.revenue / maxVal) * chartHeight;
    const yProf = height - paddingY - (d.profit / maxVal) * chartHeight;
    return { x, yRev, yProf, data: d };
  });

  const revPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yRev}`).join(" ");
  const profPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yProf}`).join(" ");

  const revAreaPath = `${revPath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {hoveredPoint ? (
        <div className="flex items-center justify-between text-xs font-display bg-accent/10 border border-accent/30 p-2.5 px-3">
          <span className="font-black text-ink">{hoveredPoint.data.label}</span>
          <div className="flex items-center gap-4 font-black">
            <span className="text-accent">Revenue: {formatMoney(hoveredPoint.data.revenue)}</span>
            <span className="text-emerald-600 dark:text-emerald-400">Profit: {formatMoney(hoveredPoint.data.profit)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs font-display text-secondary">
          <span>Hover / Tap nodes for daily totals</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-accent inline-block"></span> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 inline-block"></span> Profit</span>
          </div>
        </div>
      )}

      <div className="relative border border-rule p-2 overflow-hidden bg-surface">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = paddingY + chartHeight * ratio;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-rule/60"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Area Gradient */}
          <path d={revAreaPath} fill="currentColor" className="text-accent/15" />

          {/* Lines */}
          <path d={revPath} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent" />
          <path d={profPath} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" strokeDasharray="4 2" />

          {/* Points */}
          {points.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onClick={() => setHoveredIndex(i)}
            >
              <circle
                cx={p.x}
                cy={p.yRev}
                r={hoveredIndex === i ? "6" : "4"}
                fill="currentColor"
                className="text-accent transition-all"
              />
              <circle
                cx={p.x}
                cy={p.yProf}
                r={hoveredIndex === i ? "5" : "3"}
                fill="currentColor"
                className="text-emerald-500 transition-all"
              />
              {/* X Axis Label */}
              <text
                x={p.x}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                className="fill-secondary font-display font-medium"
              >
                {p.data.label.split(" ")[0]}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function DashboardPaymentDonutChart({ data }: { data: PaymentMethodPoint[] }) {
  if (!data || data.length === 0 || data.every((d) => d.total <= 0)) {
    return (
      <div className="h-44 border border-rule flex items-center justify-center text-sm text-secondary font-display">
        No payment breakdown available.
      </div>
    );
  }

  const total = data.reduce((acc, d) => acc + d.total, 0);
  const colors = ["var(--accent, #10b981)", "#3b82f6", "#f59e0b", "#ef4444"];

  let cumulativeAngle = 0;
  const slices = data.map((d, i) => {
    const percentage = total > 0 ? d.total / total : 0;
    const angle = percentage * 360;
    const start = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...d,
      percentage,
      color: colors[i % colors.length],
      start,
      angle,
    };
  });

  return (
    <div className="border border-rule p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <h3 className="font-display text-sm font-black text-ink">Payment Distribution</h3>
        <span className="font-display text-xs text-secondary">{formatMoney(total)}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {slices.map((s, i) => {
              const strokeWidth = 18;
              const radius = 50 - strokeWidth / 2;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = `${(s.percentage * circumference)} ${circumference}`;
              const strokeDashoffset = -((s.start / 360) * circumference);

              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-[10px] uppercase text-secondary font-bold">Total</span>
            <span className="font-display text-xs font-black text-ink">{data.reduce((acc, d) => acc + d.count, 0)} sales</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs font-display">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-ink truncate">{s.method.replace("_", " ")}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-black text-ink">{Math.round(s.percentage * 100)}%</span>
                <span className="text-secondary ml-1 text-[11px]">({formatMoney(s.total)})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

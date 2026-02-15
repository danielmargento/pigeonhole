"use client";

import { UsageInsight } from "@/lib/types";

interface Props {
  insights: UsageInsight | null;
}

const DONUT_COLORS = [
  "#8b7355", "#a08b6a", "#b5a37f", "#cabc95", "#dfd5ab",
  "#6b5b45", "#9e8e70", "#c2b496", "#d4c9a8", "#e8dfc0",
];

const BAR_COLOR = "#8b7355";

function DonutChart({ topics }: { topics: { topic: string; count: number }[] }) {
  const total = topics.reduce((s, t) => s + t.count, 0);
  if (total === 0) return null;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 70;
  const innerRadius = 45;

  let cumulative = 0;
  const slices = topics.map((t, i) => {
    const fraction = t.count / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = fraction > 0.5 ? 1 : 0;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const ix1 = cx + innerRadius * Math.cos(endAngle);
    const iy1 = cy + innerRadius * Math.sin(endAngle);
    const ix2 = cx + innerRadius * Math.cos(startAngle);
    const iy2 = cy + innerRadius * Math.sin(startAngle);

    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    return (
      <path key={i} d={d} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
    );
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {topics.length === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={radius} fill={DONUT_COLORS[0]} />
            <circle cx={cx} cy={cy} r={innerRadius} fill="var(--color-background)" />
          </>
        ) : (
          slices
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {topics.map((t, i) => (
          <div key={t.topic} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span>{t.topic}</span>
            <span className="text-muted/60">({t.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value));
  const barHeight = 28;
  const gap = 10;
  const labelWidth = 100;
  const chartWidth = 240;
  const totalWidth = labelWidth + chartWidth + 50;
  const totalHeight = data.length * (barHeight + gap) - gap;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const y = i * (barHeight + gap);
        const barW = maxVal > 0 ? (d.value / maxVal) * chartWidth : 0;
        return (
          <g key={d.label + i}>
            <text
              x={labelWidth - 8}
              y={y + barHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-muted text-[11px]"
            >
              {d.label.length > 14 ? d.label.slice(0, 14) + "..." : d.label}
            </text>
            <rect
              x={labelWidth}
              y={y}
              width={barW}
              height={barHeight}
              rx={4}
              fill={BAR_COLOR}
            />
            <text
              x={labelWidth + barW + 6}
              y={y + barHeight / 2}
              dominantBaseline="central"
              className="fill-muted text-[11px]"
            >
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InsightsPanel({ insights }: Props) {
  if (!insights) {
    return (
      <div className="text-center py-8">
        <p className="text-muted text-sm">No usage data yet.</p>
        <p className="text-muted/60 text-xs mt-1">
          Insights will appear once students start chatting.
        </p>
      </div>
    );
  }

  const llm = insights.llm_summary;
  const hasTopics = llm?.top_topics && llm.top_topics.length > 0;
  const hasUsers = insights.users_per_assignment.length > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground">Usage Insights</h3>

      {/* Charts Row: Donut + Bar side by side */}
      {(hasTopics || hasUsers) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasTopics && (
            <div className="bg-background border border-border rounded-lg p-4">
              <h4 className="text-xs font-semibold text-muted mb-3">Top Topics</h4>
              <DonutChart topics={llm!.top_topics} />
            </div>
          )}
          {hasUsers && (
            <div className="bg-background border border-border rounded-lg p-4">
              <h4 className="text-xs font-semibold text-muted mb-3">Users by Assignment</h4>
              <BarChart
                data={insights.users_per_assignment.map((a) => ({
                  label: a.title,
                  value: a.unique_users,
                }))}
              />
            </div>
          )}
        </div>
      )}

      {/* Common Misconceptions */}
      {llm?.misconceptions && llm.misconceptions.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-4">
          <h4 className="text-xs font-semibold text-muted mb-3">Common Misconceptions</h4>
          <div className="space-y-4">
            {llm.misconceptions.map((m, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-foreground">{m.topic}</p>
                <p className="text-xs text-muted mt-0.5">{m.description}</p>
                {m.sample_questions && m.sample_questions.length > 0 && (
                  <div className="mt-1.5 pl-3 border-l-2 border-accent/20 space-y-1">
                    {m.sample_questions.map((q, j) => (
                      <p key={j} className="text-xs text-muted/80 italic">
                        &ldquo;{q}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!llm && (
        <div className="bg-background border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted">
            AI-generated insights will appear after enough student interactions.
          </p>
        </div>
      )}
    </div>
  );
}

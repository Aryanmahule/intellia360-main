"use client";

/**
 * Progress charts for the adaptive learning dashboard: overall mastery over
 * time, answers per day, and a small per-topic mastery line. Each chart has a
 * table view with the same numbers, so nothing depends on hovering.
 */

import { useId, useState, type ReactNode } from "react";
import { ChartColumn, Info, Table2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type DotItemDotProps,
  type TooltipContentProps,
} from "recharts";
import type {
  DailyActivity,
  MasteryBandPolicy,
  MasteryHistoryPoint,
  SkillProgress,
} from "@intellia360/shared/types/api/adaptive-learning";
import { BAND_SHORT, longDay, percent, plural, relativeTime, SERIES, shortDay } from "./format";
import styles from "./AdaptiveDashboard.module.css";

const AXIS_TICK = { fill: SERIES.tick, fontSize: 11 };
const COMPACT_WIDTH = 420;

function bandFor(score: number, bands: MasteryBandPolicy[]): MasteryBandPolicy | undefined {
  return bands.find((b) => score >= b.min && score <= b.max);
}

/* ── Card with a chart / table toggle ─────────────────────────────────────── */

export function ChartCard({
  title,
  lead,
  table,
  children,
  footer,
}: {
  title: string;
  lead: string;
  table: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  const headingId = useId();
  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <div className={styles.cardHead}>
        <div>
          <h3 id={headingId} className={styles.cardTitle}>
            {title}
          </h3>
          <p className={styles.cardLead}>{lead}</p>
        </div>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
        >
          {asTable ? <ChartColumn size={14} aria-hidden /> : <Table2 size={14} aria-hidden />}
          {asTable ? "Chart" : "Table"}
        </button>
      </div>
      {asTable ? <div className={styles.dataTableWrap}>{table}</div> : children}
      {footer}
    </section>
  );
}

/* ── Overall mastery over time ────────────────────────────────────────────── */

function MasteryTooltip({
  active,
  payload,
  bands,
}: Partial<TooltipContentProps> & { bands: MasteryBandPolicy[] }) {
  const point = payload?.[0]?.payload as MasteryHistoryPoint | undefined;
  if (!active || !point) return null;
  const band = point.overall === null ? undefined : bandFor(point.overall, bands);
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipValue}>{point.overall === null ? "No score yet" : `${point.overall}%`}</span>
      <span className={styles.tooltipLabel}>{longDay(point.date)}</span>
      {band && <span className={styles.tooltipLabel}>{band.label}</span>}
      {point.overall !== null && (
        <span className={styles.tooltipLabel}>{plural(point.assessedSkills, "topic")} measured</span>
      )}
    </div>
  );
}

export function MasteryChart({
  history,
  bands,
  historyFrom,
}: {
  history: MasteryHistoryPoint[];
  bands: MasteryBandPolicy[];
  historyFrom: string | null;
}) {
  // Narrow charts drop the band names on the right; the y ticks still sit on the thresholds.
  const [compact, setCompact] = useState(false);
  const measured = history.filter((p) => p.overall !== null);
  const lastIndex = history.reduce((last, p, i) => (p.overall !== null ? i : last), -1);
  const first = measured[0];
  const last = measured[measured.length - 1];
  const thresholds = bands.filter((b) => b.min > 0);

  const table = (
    <table className={styles.dataTable}>
      <caption className={styles.srOnly}>Overall mastery by day</caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Overall mastery</th>
          <th scope="col">Topics measured</th>
        </tr>
      </thead>
      <tbody>
        {[...history].reverse().map((p) => (
          <tr key={p.date}>
            <td>{longDay(p.date)}</td>
            <td>{p.overall === null ? "—" : `${p.overall}%`}</td>
            <td>{p.overall === null ? "—" : p.assessedSkills}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const footer = historyFrom ? (
    <p className={styles.note}>
      <Info size={13} aria-hidden />
      <span>{`Your history starts on ${shortDay(historyFrom)}: only your latest 20 answers in each topic are kept.`}</span>
    </p>
  ) : null;

  return (
    <ChartCard
      title="Mastery over time"
      lead="Your overall mastery at the end of each day. Lines mark the next level."
      table={table}
      footer={footer}
    >
      {measured.length === 0 ? (
        <div className={styles.chartEmpty}>
          Your mastery line starts after your first quiz in this period.
        </div>
      ) : (
        <>
          <p className={styles.srOnly}>
            Overall mastery was {first.overall}% on {longDay(first.date)} and is {last.overall}% on{" "}
            {longDay(last.date)}.
          </p>
          <div className={styles.chartFrame}>
            <ResponsiveContainer width="100%" height="100%" onResize={(width) => setCompact(width < COMPACT_WIDTH)}>
              <AreaChart data={history} margin={{ top: 22, right: compact ? 14 : 78, bottom: 4, left: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: SERIES.axis }}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, ...thresholds.map((b) => b.min), 100]}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tickFormatter={(v: number) => `${v}%`}
                />
                {thresholds.map((b) => (
                  <ReferenceLine
                    key={b.id}
                    y={b.min}
                    stroke={SERIES.grid}
                    strokeWidth={1}
                    ifOverflow="extendDomain"
                    label={
                      compact ? undefined : { value: BAND_SHORT[b.id], position: "right", fill: SERIES.tick, fontSize: 10 }
                    }
                  />
                ))}
                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  content={(props) => <MasteryTooltip {...props} bands={bands} />}
                />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke={SERIES.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={SERIES.primary}
                  fillOpacity={0.1}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: SERIES.primary, stroke: "#fff", strokeWidth: 2 }}
                  dot={(props: DotItemDotProps) => {
                    if (props.index !== lastIndex || typeof props.cx !== "number" || typeof props.cy !== "number") {
                      return <g key={`dot-${props.index}`} />;
                    }
                    return (
                      <g key="dot-last">
                        <circle cx={props.cx} cy={props.cy} r={5} fill={SERIES.primary} stroke="#fff" strokeWidth={2} />
                        <text
                          x={props.cx}
                          y={props.cy - 11}
                          textAnchor="end"
                          fill="#172554"
                          fontSize={12}
                          fontWeight={800}
                        >
                          {(props.payload as MasteryHistoryPoint).overall}%
                        </text>
                      </g>
                    );
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartCard>
  );
}

/* ── Answers per day ──────────────────────────────────────────────────────── */

interface ActivityRow extends DailyActivity {
  missed: number;
}

/**
 * One stacked segment: a 2px surface gap above the lower segment, and 4px
 * rounded corners only on whichever segment is on top.
 */
function StackSegment(props: BarShapeProps & { segment: "correct" | "missed" }) {
  const { x, y, width, height, segment, fill } = props;
  const row = props.payload as ActivityRow | undefined;
  if (!row || !height || height <= 0) return <g />;
  const hasMissed = row.missed > 0;
  const gap = segment === "correct" && hasMissed ? 2 : 0;
  const top = y + gap;
  const h = Math.max(0, height - gap);
  const isTop = segment === "missed" || !hasMissed;
  const r = isTop ? Math.min(4, width / 2, h) : 0;
  const d = [
    `M${x},${top + h}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `L${x + width - r},${top}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `L${x + width},${top + h}`,
    "Z",
  ].join(" ");
  return <path d={d} fill={fill} />;
}

function ActivityTooltip({ active, payload }: Partial<TooltipContentProps>) {
  const row = payload?.[0]?.payload as ActivityRow | undefined;
  if (!active || !row) return null;
  const accuracy = percent(row.correct, row.answered);
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipValue}>{plural(row.answered, "answer")}</span>
      <span className={styles.tooltipLabel}>{longDay(row.date)}</span>
      {row.answered > 0 && (
        <>
          <span className={styles.tooltipRow}>
            <span className={styles.tooltipKey} style={{ background: SERIES.primary }} />
            <strong>{row.correct}</strong> correct
          </span>
          <span className={styles.tooltipRow}>
            <span className={styles.tooltipKey} style={{ background: SERIES.secondary }} />
            <strong>{row.missed}</strong> missed
          </span>
          <span className={styles.tooltipLabel}>
            {plural(row.quizzes, "quiz", "quizzes")} · {accuracy}% correct
          </span>
        </>
      )}
    </div>
  );
}

export function ActivityChart({
  activity,
  totals,
}: {
  activity: DailyActivity[];
  totals: { answered: number; correct: number; quizzes: number; activeDays: number };
}) {
  const rows: ActivityRow[] = activity.map((d) => ({ ...d, missed: d.answered - d.correct }));
  const accuracy = percent(totals.correct, totals.answered);

  const table = (
    <table className={styles.dataTable}>
      <caption className={styles.srOnly}>Answers per day</caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Answered</th>
          <th scope="col">Correct</th>
          <th scope="col">Quizzes</th>
        </tr>
      </thead>
      <tbody>
        {[...rows].reverse().map((d) => (
          <tr key={d.date}>
            <td>{longDay(d.date)}</td>
            <td>{d.answered}</td>
            <td>{d.correct}</td>
            <td>{d.quizzes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard title="Practice activity" lead="Questions you answered each day, and how many were right." table={table}>
      <div className={styles.chartSummary}>
        <span>
          <strong>{totals.answered}</strong>questions
        </span>
        <span>
          <strong>{accuracy === null ? "—" : `${accuracy}%`}</strong>correct
        </span>
        <span>
          <strong>{totals.activeDays}</strong>
          {totals.activeDays === 1 ? "active day" : "active days"}
        </span>
      </div>
      {totals.answered === 0 ? (
        <div className={styles.chartEmpty}>No quizzes in this period yet. Smart practice is a great place to start.</div>
      ) : (
        <>
          <ul className={styles.legend} aria-label="Legend">
            <li className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: SERIES.primary }} />
              Correct
            </li>
            <li className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: SERIES.secondary }} />
              Missed
            </li>
          </ul>
          <div className={styles.chartFrame} style={{ height: 222 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barCategoryGap="22%">
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: SERIES.axis }}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={32} />
                <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.14)" }} content={(props) => <ActivityTooltip {...props} />} />
                <Bar
                  dataKey="correct"
                  name="Correct"
                  stackId="answers"
                  fill={SERIES.primary}
                  maxBarSize={24}
                  isAnimationActive={false}
                  shape={(props: BarShapeProps) => <StackSegment {...props} segment="correct" />}
                />
                <Bar
                  dataKey="missed"
                  name="Missed"
                  stackId="answers"
                  fill={SERIES.secondary}
                  maxBarSize={24}
                  isAnimationActive={false}
                  shape={(props: BarShapeProps) => <StackSegment {...props} segment="missed" />}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </ChartCard>
  );
}

/* ── One topic's mastery after each quiz ──────────────────────────────────── */

function SparkTooltip({ active, payload }: Partial<TooltipContentProps>) {
  const point = payload?.[0]?.payload as SkillProgress["points"][number] | undefined;
  if (!active || !point) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipValue}>{point.score === null ? "Not enough answers yet" : `${point.score}%`}</span>
      <span className={styles.tooltipLabel}>{relativeTime(point.at)}</span>
    </div>
  );
}

export function TopicSparkline({ points, label }: { points: SkillProgress["points"]; label: string }) {
  const scored = points.filter((p) => p.score !== null);
  if (scored.length < 2) {
    return <p className={styles.muted}>A line appears here after a couple more quizzes on this topic.</p>;
  }
  const lastIndex = points.reduce((last, p, i) => (p.score !== null ? i : last), -1);
  return (
    <>
      <p className={styles.srOnly}>
        {label} mastery went from {scored[0].score}% to {scored[scored.length - 1].score}% over your last{" "}
        {plural(points.length, "quiz", "quizzes")} on it.
      </p>
      <div className={styles.sparkFrame}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 12, bottom: 6, left: 12 }}>
            <YAxis domain={[0, 100]} hide />
            <XAxis dataKey="at" hide />
            <ReferenceLine y={70} stroke={SERIES.grid} />
            <Tooltip cursor={{ stroke: "#94a3b8", strokeWidth: 1 }} content={(props) => <SparkTooltip {...props} />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={SERIES.primary}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 5, fill: SERIES.primary, stroke: "#fff", strokeWidth: 2 }}
              dot={(props: DotItemDotProps) =>
                props.index === lastIndex && typeof props.cx === "number" && typeof props.cy === "number" ? (
                  <circle key="last" cx={props.cx} cy={props.cy} r={4} fill={SERIES.primary} stroke="#fff" strokeWidth={2} />
                ) : (
                  <g key={`dot-${props.index}`} />
                )
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

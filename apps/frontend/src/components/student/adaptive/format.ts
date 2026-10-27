/**
 * Display helpers for the adaptive learning dashboard.
 *
 * Day keys from the API ("2026-10-18") are UTC days — the boundary the daily
 * quiz and streak use — so they are formatted in UTC. Timestamps are shown in
 * the viewer's own time zone.
 */
import type {
  DifficultyLabel,
  MasteryBandOrInsufficient,
  RecommendationType,
} from "@intellia360/shared/types/api/adaptive-learning";
import styles from "./AdaptiveDashboard.module.css";

const DAY_MS = 86_400_000;

/** "18 Oct" for a UTC day key. */
export function shortDay(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Mon, 18 Oct" for a UTC day key. */
export function longDay(dayKey: string): string {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "Today", "Yesterday", "3 days ago", or a date for anything older than a week. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso);
  const startOf = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOf(now) - startOf(then.getTime())) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

export const BAND_FILL: Record<MasteryBandOrInsufficient, string> = {
  foundational: styles.fillFoundational,
  developing: styles.fillDeveloping,
  "nearly-proficient": styles.fillNearly,
  proficient: styles.fillProficient,
  "insufficient-data": styles.fillUnknown,
};

export const BAND_CHIP: Record<MasteryBandOrInsufficient, string> = {
  foundational: styles.chipFoundational,
  developing: styles.chipDeveloping,
  "nearly-proficient": styles.chipNearly,
  proficient: styles.chipProficient,
  "insufficient-data": styles.chipUnknown,
};

/** Short band names for chips; the full label is used where there is room. */
export const BAND_SHORT: Record<MasteryBandOrInsufficient, string> = {
  foundational: "Needs support",
  developing: "Developing",
  "nearly-proficient": "Nearly there",
  proficient: "Proficient",
  "insufficient-data": "Not measured yet",
};

/** Band colours as values, for SVG strokes. Kept in step with the CSS module. */
export const BAND_COLOR: Record<MasteryBandOrInsufficient, string> = {
  foundational: "#ef4444",
  developing: "#f59e0b",
  "nearly-proficient": "#3b82f6",
  proficient: "#10b981",
  "insufficient-data": "#cbd5e1",
};

export const DIFFICULTY_TEXT: Record<DifficultyLabel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const RECOMMENDATION_CHIP: Record<RecommendationType, { text: string; className: string }> = {
  diagnostic: { text: "Get started", className: styles.chipDiagnostic },
  remedial: { text: "Needs support", className: styles.chipFoundational },
  "targeted-practice": { text: "Practice", className: styles.chipDeveloping },
  "next-lesson": { text: "Next lesson", className: styles.chipNearly },
  revision: { text: "Revision", className: styles.chipRevision },
  challenge: { text: "Challenge", className: styles.chipProficient },
};

/** Chart colours: the validated categorical slots 1 and 2 on the white card surface. */
export const SERIES = {
  primary: "#2a78d6",
  secondary: "#eb6834",
  grid: "#eef2f7",
  axis: "#e2e8f0",
  tick: "#64748b",
} as const;

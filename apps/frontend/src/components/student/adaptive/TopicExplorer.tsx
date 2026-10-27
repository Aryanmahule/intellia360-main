"use client";

/**
 * Every topic in the student's grade, filterable by band. Opening a topic
 * shows its mastery after each quiz, the latest answers, and the level the
 * next questions on it will be pitched at.
 */

import Link from "next/link";
import { BookOpen, ChevronDown, CircleCheck, CircleX, Clock, Info, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type {
  DifficultyLabel,
  MasteryBandPolicy,
  SkillMasteryView,
  SkillProgress,
} from "@intellia360/shared/types/api/adaptive-learning";
import { TopicSparkline } from "./ProgressCharts";
import { BAND_CHIP, BAND_FILL, BAND_SHORT, DIFFICULTY_TEXT, percent, plural, relativeTime } from "./format";
import styles from "./AdaptiveDashboard.module.css";

export type TopicFilter = "all" | "needs-work" | "nearly" | "proficient" | "unmeasured";

const FILTERS: { id: TopicFilter; label: string; test: (s: SkillMasteryView) => boolean }[] = [
  { id: "all", label: "All topics", test: () => true },
  { id: "needs-work", label: "Needs work", test: (s) => s.band === "foundational" || s.band === "developing" },
  { id: "nearly", label: "Nearly there", test: (s) => s.band === "nearly-proficient" },
  { id: "proficient", label: "Proficient", test: (s) => s.band === "proficient" },
  { id: "unmeasured", label: "Not measured yet", test: (s) => s.band === "insufficient-data" },
];

const LEVELS: DifficultyLabel[] = ["easy", "medium", "hard"];

/** The few questions in the bank limit how far practice can adapt; say so. */
const THIN_BANK = 3;

export function topicDomId(skill: string): string {
  return `topic-${skill}`;
}

export function MasteryMeter({
  score,
  band,
  bands,
  label,
  className,
}: {
  score: number | null;
  band: SkillMasteryView["band"];
  bands: MasteryBandPolicy[];
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`${styles.meter} ${className ?? ""}`}
      role="progressbar"
      aria-label={`${label} mastery`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score ?? undefined}
      aria-valuetext={score === null ? "Not measured yet" : `${score}%, ${BAND_SHORT[band]}`}
    >
      <div className={`${styles.meterFill} ${BAND_FILL[band]}`} style={{ width: `${score ?? 0}%` }} />
      {bands
        .filter((b) => b.min > 0)
        .map((b) => (
          <span key={b.id} className={styles.meterTick} style={{ left: `${b.min}%` }} aria-hidden />
        ))}
    </div>
  );
}

function TopicDetail({ skill, progress }: { skill: SkillMasteryView; progress: SkillProgress | undefined }) {
  const accuracy = percent(skill.correctCount, skill.evidenceCount);
  const answers = progress?.recentAnswers ?? [];
  return (
    <div className={styles.topicDetail} id={`${topicDomId(skill.skill)}-detail`}>
      <div className={styles.detailBlock}>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{skill.score === null ? "—" : `${skill.score}%`}</span>
            <span className={styles.statLabel}>Mastery</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{accuracy === null ? "—" : `${accuracy}%`}</span>
            <span className={styles.statLabel}>
              {skill.correctCount}/{skill.evidenceCount} correct
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue} style={{ textTransform: "capitalize" }}>
              {skill.evidenceCount === 0 ? "—" : skill.confidenceLabel}
            </span>
            <span className={styles.statLabel}>Confidence</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {skill.lastPracticedAt ? relativeTime(skill.lastPracticedAt) : "Never"}
            </span>
            <span className={styles.statLabel}>Last practised</span>
          </div>
        </div>

        <span className={styles.detailLabel}>Mastery after each quiz</span>
        <TopicSparkline points={progress?.points ?? []} label={skill.label} />
      </div>

      <div className={styles.detailBlock}>
        <span className={styles.detailLabel}>Your latest answers</span>
        {answers.length === 0 ? (
          <p className={styles.muted}>No answers on this topic yet.</p>
        ) : (
          <ul className={styles.answerStrip} aria-label={`Latest ${answers.length} answers, oldest first`}>
            {answers.map((a, i) => {
              const text = `${a.correct ? "Correct" : "Missed"}${a.difficulty ? ` · ${DIFFICULTY_TEXT[a.difficulty]}` : ""} · ${relativeTime(a.at)}`;
              return (
                <li
                  key={`${a.at}-${i}`}
                  className={`${styles.answerDot} ${a.correct ? styles.answerRight : styles.answerWrong}`}
                  title={text}
                >
                  {a.correct ? <CircleCheck size={15} aria-hidden /> : <CircleX size={15} aria-hidden />}
                  <span className={styles.srOnly}>{text}</span>
                </li>
              );
            })}
          </ul>
        )}

        <span className={styles.detailLabel}>Next questions are pitched at</span>
        <div className={styles.ladder} role="list" aria-label="Difficulty level">
          {LEVELS.map((level) => (
            <span
              key={level}
              role="listitem"
              className={`${styles.ladderStep} ${level === skill.recommendedDifficulty ? styles.ladderStepActive : ""}`}
              aria-current={level === skill.recommendedDifficulty ? "true" : undefined}
            >
              {DIFFICULTY_TEXT[level]}
            </span>
          ))}
        </div>
        <p className={styles.muted} style={{ fontSize: 12 }}>
          The level rises step by step as you get answers right, and drops quickly if you get stuck.
        </p>
        {skill.questionsAvailable < THIN_BANK && (
          <p className={styles.note} style={{ marginTop: 0 }}>
            <Info size={13} aria-hidden />
            <span>{`Your grade has only ${plural(skill.questionsAvailable, "question")} on this topic so far, so practice may repeat some.`}</span>
          </p>
        )}
      </div>

      <div className={styles.detailActions}>
        <Link href={skill.practiceHref} className={`${styles.primaryButton} ${styles.smallButton}`}>
          <Zap size={14} aria-hidden />
          Practise {skill.label}
        </Link>
        {skill.lessons.slice(0, 2).map((lesson) => (
          <Link
            key={lesson.id}
            href={`/student/lesson/${encodeURIComponent(lesson.id)}`}
            className={`${styles.secondaryButton} ${styles.smallButton}`}
          >
            <BookOpen size={14} aria-hidden />
            {lesson.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TopicExplorer({
  skills,
  progress,
  bands,
  filter,
  onFilterChange,
  openSkill,
  onOpenSkillChange,
}: {
  skills: SkillMasteryView[];
  progress: SkillProgress[];
  bands: MasteryBandPolicy[];
  filter: TopicFilter;
  onFilterChange: (filter: TopicFilter) => void;
  openSkill: string | null;
  onOpenSkillChange: (skill: string | null) => void;
}) {
  const byId = new Map(progress.map((p) => [p.skill, p]));
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const visible = skills.filter(active.test);

  return (
    <div className={styles.section}>
      <div className={styles.filterRow} role="group" aria-label="Filter topics">
        {FILTERS.map((f) => {
          const count = skills.filter(f.test).length;
          if (f.id !== "all" && count === 0) return null;
          return (
            <button
              key={f.id}
              type="button"
              className={`${styles.filterChip} ${f.id === filter ? styles.filterChipActive : ""}`}
              aria-pressed={f.id === filter}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
              <span className={styles.filterCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className={styles.muted}>No topics in this group right now.</p>
      ) : (
        <ul className={styles.topicList}>
          {visible.map((skill) => {
            const open = openSkill === skill.skill;
            return (
              <li
                key={skill.skill}
                id={topicDomId(skill.skill)}
                className={`${styles.topicItem} ${open ? styles.topicItemOpen : ""}`}
              >
                <button
                  type="button"
                  className={styles.topicButton}
                  aria-expanded={open}
                  aria-controls={`${topicDomId(skill.skill)}-detail`}
                  onClick={() => onOpenSkillChange(open ? null : skill.skill)}
                >
                  <span className={styles.topicName}>
                    <span>{skill.label}</span>
                    {skill.trend === "improving" && (
                      <>
                        <TrendingUp size={15} className={`${styles.trendIcon} ${styles.trendUp}`} aria-hidden />
                        <span className={styles.srOnly}>, improving</span>
                      </>
                    )}
                    {skill.trend === "declining" && (
                      <>
                        <TrendingDown size={15} className={`${styles.trendIcon} ${styles.trendDown}`} aria-hidden />
                        <span className={styles.srOnly}>, slipping</span>
                      </>
                    )}
                    {skill.revisionDue && (
                      <>
                        <Clock size={14} className={styles.trendIcon} style={{ color: "#0369a1" }} aria-hidden />
                        <span className={styles.srOnly}>, revision due</span>
                      </>
                    )}
                  </span>
                  <span className={styles.topicBand}>
                    <span className={`${styles.chip} ${BAND_CHIP[skill.band]}`}>{BAND_SHORT[skill.band]}</span>
                  </span>
                  <MasteryMeter
                    className={styles.topicMeter}
                    score={skill.score}
                    band={skill.band}
                    bands={bands}
                    label={skill.label}
                  />
                  <span className={`${styles.topicScore} ${skill.score === null ? styles.topicScoreEmpty : ""}`}>
                    {skill.score === null ? "—" : `${skill.score}%`}
                  </span>
                  <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden />
                </button>
                {open && <TopicDetail skill={skill} progress={byId.get(skill.skill)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

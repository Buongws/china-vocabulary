export type RecallRating = "forgot" | "hard" | "good" | "easy";

export interface SrsState {
  ease: number;
  intervalDays: number;
  repetitions: number;
}

const DAY_MS = 86_400_000;
const STUDY_OFFSET_MS = 7 * 60 * 60 * 1_000;
const QUALITY: Record<RecallRating, number> = { forgot: 1, hard: 3, good: 4, easy: 5 };

export function studyDate(now: Date = new Date()): string {
  return new Date(now.getTime() + STUDY_OFFSET_MS).toISOString().slice(0, 10);
}

export function addStudyDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function normalizeAnswer(answer: string): string {
  return answer.normalize("NFKC").trim().toLocaleLowerCase("en-US")
    .replace(/[‘’ʼ`]/g, "'").replace(/\s+/g, " ");
}

export function isCorrectAnswer(answer: string, expected: string | string[], alternatives: string[] = []): boolean {
  const actual = normalizeAnswer(answer);
  if (!actual) return false;
  const accepted = typeof expected === "string" ? [expected, ...alternatives] : [...expected, ...alternatives];
  return accepted.some((value) => normalizeAnswer(value) === actual);
}

export function blankExample(sentence: string, term: string): string | null {
  if (!term.trim()) return null;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word boundaries prevent “tea” from being removed from “teacher”.
  const expression = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
  if (!expression.test(sentence)) return null;
  expression.lastIndex = 0;
  return sentence.replace(expression, "________");
}

/** The database is authoritative; this pure implementation supports previews and rule tests. */
export function computeSrs(previous: SrsState | null, rating: RecallRating, writingCorrect: boolean, now: Date = new Date()): SrsState & { dueDate: string } {
  const current = previous ?? { ease: 2.5, intervalDays: 0, repetitions: 0 };
  const quality = writingCorrect ? QUALITY[rating] : 1;
  const ease = Math.max(1.3, Math.round((current.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)) * 100) / 100);
  const repetitions = quality < 3 ? 0 : current.repetitions + 1;
  const intervalDays = quality < 3 || repetitions === 1 ? 1
    : repetitions === 2 ? 3 : Math.min(36_500, Math.max(1, Math.round(current.intervalDays * ease)));
  return { ease, intervalDays, repetitions, dueDate: addStudyDays(studyDate(now), intervalDays) };
}

export function calculateStreak(completedDates: string[], now: Date = new Date(), since?: string): number {
  const completed = new Set(completedDates.filter((date) => !since || date >= since));
  const today = studyDate(now);
  let day = completed.has(today) ? today : addStudyDays(today, -1);
  let streak = 0;
  while (completed.has(day)) {
    streak += 1;
    day = addStudyDays(day, -1);
  }
  return streak;
}

export function suggestPace({ startedAt, streak, accuracy, currentTarget, now = new Date() }: {
  startedAt: string; streak: number; accuracy: number; currentTarget: number; now?: Date;
}): number | null {
  if (streak < 7 || accuracy < 0.8) return null;
  const days = Math.floor((Date.parse(`${studyDate(now)}T00:00:00Z`) - Date.parse(`${startedAt.slice(0, 10)}T00:00:00Z`)) / DAY_MS);
  const target = days >= 42 ? 15 : days >= 28 ? 10 : days >= 14 ? 8 : null;
  return target !== null && target > currentTarget ? target : null;
}

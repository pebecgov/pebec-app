/** Exclusion key for the Testing Service mystery-shopping question. */
export const MYSTERY_QUESTION_EXCLUSION_PREFIX = "mysteryQuestion:";

export function mysteryQuestionExclusionKey(questionId: string): string {
  return `${MYSTERY_QUESTION_EXCLUSION_PREFIX}${questionId}`;
}

export function isTestingServiceMysteryQuestion(questionText: string): boolean {
  const key = String(questionText || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return key.includes("testing service");
}

export function exemptMysteryQuestionIds(excluded: Iterable<string>): Set<string> {
  const ids = new Set<string>();
  let legacyTypeKey = false;
  for (const key of excluded) {
    if (typeof key !== "string") continue;
    if (key.startsWith(MYSTERY_QUESTION_EXCLUSION_PREFIX)) {
      const questionId = key.slice(MYSTERY_QUESTION_EXCLUSION_PREFIX.length).trim();
      if (questionId) ids.add(questionId);
    } else if (key.startsWith("mysteryType:")) {
      // Earlier saves marked a whole mystery type. Treat that as Testing Service only.
      legacyTypeKey = true;
    }
  }
  if (legacyTypeKey && ids.size === 0) ids.add("__legacy_testing_service__");
  return ids;
}

export type MysteryQuestionForScore = {
  questionId: string;
  questionText?: string;
  weight?: number;
  answerType?: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** An MDA with any Testing Service exemption skips every question worded as Testing Service. */
export function isTestingServiceQuestionExempt(
  question: { questionId: string; questionText?: string },
  exemptQuestionIds: Set<string>
): boolean {
  if (exemptQuestionIds.size === 0) return false;
  if (exemptQuestionIds.has(question.questionId)) return true;
  return isTestingServiceMysteryQuestion(question.questionText || "");
}

export function mysteryQuestionPoints(
  question: MysteryQuestionForScore,
  rating: number
): number {
  const weight = question.weight || 0;
  const value = Number(rating) || 0;
  if (question.answerType === "yes_no") return value * weight;
  return (value / 10) * weight;
}

/**
 * Score Mystery Shopping from the questions that still apply.
 * Testing Service weight comes off the maximum. Phone Call and Email points stay as earned.
 */
export function mysteryScoreWithoutQuestions(args: {
  questions: MysteryQuestionForScore[];
  ratings: Record<string, number | undefined>;
  exemptQuestionIds: Set<string>;
  mysteryTotal: number;
}): { score: number; applicableMax: number; exemptPoints: number } {
  let rawAll = 0;
  let rawExempt = 0;
  let earned = 0;

  for (const question of args.questions) {
    const weight = question.weight || 0;
    rawAll += weight;
    if (isTestingServiceQuestionExempt(question, args.exemptQuestionIds)) {
      rawExempt += weight;
      continue;
    }
    earned += mysteryQuestionPoints(question, Number(args.ratings[question.questionId]) || 0);
  }

  if (rawAll <= 0 || rawExempt <= 0 || args.mysteryTotal <= 0) {
    return {
      score: round2(earned),
      applicableMax: args.mysteryTotal,
      exemptPoints: 0,
    };
  }

  const exemptPoints = round2((rawExempt / rawAll) * args.mysteryTotal);
  const applicableMax = round2(Math.max(0, args.mysteryTotal - exemptPoints));
  const rawApplicable = rawAll - rawExempt;
  const score =
    rawApplicable > 0 ? round2((earned / rawApplicable) * applicableMax) : 0;

  return {
    score: Math.min(score, applicableMax),
    applicableMax,
    exemptPoints,
  };
}

/** Dedupe questions that repeat across mystery types so the 20-point slice is counted once. */
export function mysteryTestingServiceAdjustment(
  questions: MysteryQuestionForScore[],
  exemptQuestionIds: Set<string>,
  mysteryTotal: number
): { score: number; applicableMax: number; exemptPoints: number } {
  const seen = new Set<string>();
  const unique: MysteryQuestionForScore[] = [];
  for (const question of questions) {
    const key = String(question.questionText || question.questionId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(question);
  }
  return mysteryScoreWithoutQuestions({
    questions: unique,
    ratings: {},
    exemptQuestionIds,
    mysteryTotal,
  });
}

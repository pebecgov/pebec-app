/**
 * Fixed programme metric exemptions (always applied on top of year config).
 */

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ProgrammeMetricExclusion = {
  /** Display / match names (full name, abbreviation, aliases). */
  names: string[];
  excludedMetrics: string[];
  /** Shown beside MDA name on ranking PDF. */
  reportNote: string;
};

export const PROGRAMME_METRIC_EXCLUSIONS: ProgrammeMetricExclusion[] = [
  {
    names: [
      "Service Compact (SERVICOM)",
      "Service Compact",
      "SERVICOM",
      "Servicom",
    ],
    excludedMetrics: ["sla", "reportSubmission", "timeliness"],
    reportNote:
      "Exempted from BFA monthly scoring (SLA, Report Submission, Timeliness) — SERVICOM interfaces with government MDAs, not businesses; exemption letter on file. Score normalized to /100",
  },
];

function matchesProgrammeEntry(
  mdaName: string,
  entry: ProgrammeMetricExclusion
): boolean {
  const key = normalizeKey(mdaName);
  if (!key) return false;
  for (const name of entry.names) {
    const nameKey = normalizeKey(name);
    if (!nameKey) continue;
    if (key === nameKey) return true;
    if (key.startsWith(nameKey + " ")) return true;
    if (key.includes(`(${nameKey})`)) return true;
    const parts = key.split(" - ").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (parts[0] === nameKey) return true;
      if (parts.slice(1).join(" - ") === nameKey) return true;
    }
  }
  return false;
}

export function getProgrammeMetricExclusions(mdaName: string): string[] {
  const entry = PROGRAMME_METRIC_EXCLUSIONS.find((row) =>
    matchesProgrammeEntry(mdaName, row)
  );
  return entry ? [...entry.excludedMetrics] : [];
}

export function getProgrammeExclusionReportNote(mdaName: string): string | null {
  const entry = PROGRAMME_METRIC_EXCLUSIONS.find((row) =>
    matchesProgrammeEntry(mdaName, row)
  );
  return entry?.reportNote ?? null;
}

/** Merge year-config exclusions with fixed programme exemptions. */
export function mergeProgrammeMetricExclusions(
  mdaName: string,
  excludedMetrics: Iterable<string> | null | undefined
): string[] {
  return Array.from(
    new Set([
      ...(excludedMetrics ? Array.from(excludedMetrics) : []),
      ...getProgrammeMetricExclusions(mdaName),
    ])
  );
}

export function hasProgrammeMetricExclusions(mdaName: string): boolean {
  return getProgrammeMetricExclusions(mdaName).length > 0;
}

/**
 * Scale an MDA onto the full scoreboard (e.g. /100) when some metrics were
 * removed from the max (programme exemptions, Testing Service, etc.) so those
 * exclusions do not hurt ranking by absolute points.
 */
export function normalizeProgrammeExemptedScore(args: {
  mdaName: string;
  totalScore: number;
  /** Max after removing exempted metrics. */
  applicableMax: number;
  /** Full scoreboard max (usually 100). */
  fullMax?: number;
  /**
   * When true, always scale if applicableMax < fullMax.
   * Defaults to programme exclusions (e.g. SERVICOM).
   */
  shouldNormalize?: boolean;
}): {
  totalScore: number;
  maxPossiblePoints: number;
  totalPercentage: number;
  isProgrammeNormalized: boolean;
  rawTotalScore: number;
  applicableMax: number;
} {
  const fullMax = args.fullMax ?? 100;
  const rawTotalScore = Number(args.totalScore) || 0;
  const applicableMax = Math.max(0, Number(args.applicableMax) || 0);
  const totalPercentage =
    applicableMax > 0 ? (rawTotalScore / applicableMax) * 100 : 0;
  const shouldNormalize =
    args.shouldNormalize === true || hasProgrammeMetricExclusions(args.mdaName);

  if (!shouldNormalize || applicableMax <= 0) {
    return {
      totalScore: rawTotalScore,
      maxPossiblePoints: applicableMax > 0 ? applicableMax : fullMax,
      totalPercentage,
      isProgrammeNormalized: false,
      rawTotalScore,
      applicableMax,
    };
  }

  // Only normalize when exemptions actually reduced the max.
  if (applicableMax >= fullMax) {
    return {
      totalScore: rawTotalScore,
      maxPossiblePoints: fullMax,
      totalPercentage: fullMax > 0 ? (rawTotalScore / fullMax) * 100 : 0,
      isProgrammeNormalized: false,
      rawTotalScore,
      applicableMax,
    };
  }

  const normalizedScore = (rawTotalScore / applicableMax) * fullMax;
  return {
    totalScore: normalizedScore,
    maxPossiblePoints: fullMax,
    totalPercentage,
    isProgrammeNormalized: true,
    rawTotalScore,
    applicableMax,
  };
}

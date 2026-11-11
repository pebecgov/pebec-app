/**
 * Pure AI extraction validation + merge helpers (no Convex runtime).
 * Used by aiExtract action and unit tests.
 */

import { NIGERIAN_STATES, matchState } from "./constants";
import { PORTS_CUSTOMS_MDAS, findMda, parseIncidentDate } from "./portsCustoms";
import type { Id } from "../_generated/dataModel";

export const AI_ACCEPT_THRESHOLD = 0.75;
export const AI_VERIFY_THRESHOLD = 0.5;
export const AI_OVERALL_REVIEW_THRESHOLD = 0.6;

export const REQUIRED_AI_FIELDS = [
  "state",
  "assignedMDA",
  "incidentDate",
  "description",
] as const;

export type RequiredAiField = (typeof REQUIRED_AI_FIELDS)[number];

export type AiIntent =
  | "file_complaint"
  | "check_status"
  | "follow_up"
  | "other"
  | "abusive"
  | "multi_complaint"
  | "out_of_scope";

export type AiFieldExtraction = {
  value: string | null;
  confidence: number;
  raw?: string | null;
};

export type AiExtractionRaw = {
  intent: AiIntent | string;
  language?: string | null;
  fields: {
    state?: AiFieldExtraction | null;
    assignedMDA?: AiFieldExtraction | null;
    incidentDate?: AiFieldExtraction | null;
    description?: AiFieldExtraction | null;
    title?: AiFieldExtraction | null;
    fullName?: AiFieldExtraction | null;
  };
  outOfScopeAgency?: string | null;
  needsHumanReview?: boolean;
  reviewReasons?: string[];
  notes?: string | null;
};

export type ValidatedField<T> = {
  value: T | null;
  confidence: number;
  status: "accepted" | "verify" | "missing";
  raw?: string | null;
};

export type ValidatedExtraction = {
  intent: AiIntent;
  language: string | null;
  state: ValidatedField<string>;
  assignedMDA: ValidatedField<string>;
  incidentDate: ValidatedField<number>;
  description: ValidatedField<string>;
  title: ValidatedField<string>;
  fullName: ValidatedField<string>;
  overallConfidence: number;
  needsReview: boolean;
  reviewReasons: string[];
  pendingFields: RequiredAiField[];
  verifyFields: RequiredAiField[];
  outOfScopeAgency: string | null;
  notes: string | null;
  /** ISO date label for confirmation (DD/MM/YYYY) when date resolved. */
  incidentDateLabel: string | null;
};

const SENSITIVE_PATTERNS: Array<{ reason: string; re: RegExp }> = [
  {
    reason: "bribery_corruption",
    re: /\b(brib(e|ery|ing)|kickback|corrupt(ion|ed)?|settle\s*(the\s*)?(matter|case)|pay\s*(off|am)|dash\s*(money|am))\b/i,
  },
  {
    reason: "threats",
    re: /\b(kill|threat(en|ening)?|bomb|attack|hostage|harm\s+you|i\s+will\s+(hurt|destroy))\b/i,
  },
  {
    reason: "minors",
    re: /\b(minor|child|children|under[- ]?age|teen(ager)?|infant|school\s*girl|school\s*boy)\b/i,
  },
  {
    reason: "safety",
    re: /\b(danger(ous)?|unsafe|assault|rape|kidnap|gun|weapon|bleed(ing)?|emergency)\b/i,
  },
];

/** Known non-Ports & Customs agencies for out-of-scope detection. */
const OUT_OF_SCOPE_AGENCY_HINTS = [
  "firs",
  "federal inland revenue",
  "nimc",
  "cac",
  "corporate affairs",
  "efcc",
  "icpc",
  "police",
  "npf",
  "frsc",
  "nerc",
  "discose",
  "discos",
  "aedc",
  "ikedc",
  "phcn",
  "nnpc",
  "cbn",
  "central bank",
  "pencom",
  "nhis",
  "nin",
  "passport office",
];

function clampConfidence(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function statusForConfidence(confidence: number): "accepted" | "verify" | "missing" {
  if (confidence >= AI_ACCEPT_THRESHOLD) return "accepted";
  if (confidence >= AI_VERIFY_THRESHOLD) return "verify";
  return "missing";
}

function fieldStatus(
  value: string | number | null,
  confidence: number,
): "accepted" | "verify" | "missing" {
  if (value === null || value === undefined || value === "") return "missing";
  return statusForConfidence(confidence);
}

export function detectSensitiveReasons(text: string): string[] {
  const reasons: string[] = [];
  for (const row of SENSITIVE_PATTERNS) {
    if (row.re.test(text)) reasons.push(row.reason);
  }
  return reasons;
}

export function detectOutOfScopeAgency(text: string): string | null {
  const lower = text.toLowerCase();
  // If a Ports & Customs MDA is clearly mentioned, do not treat as out-of-scope.
  for (const mda of PORTS_CUSTOMS_MDAS) {
    if (
      lower.includes(mda.title.toLowerCase()) ||
      lower.includes(mda.name.toLowerCase())
    ) {
      return null;
    }
  }
  for (const hint of OUT_OF_SCOPE_AGENCY_HINTS) {
    if (lower.includes(hint)) return hint;
  }
  return null;
}

function normalizeAgencyText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc']/g, "'")
    .replace(/\s+/g, " ");
}

/** Map model MDA string to canonical Ports & Customs full name, or null. */
export function resolveAllowedMda(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const found = findMda(input);
  if (found) return found.name;
  const needle = normalizeAgencyText(input);
  const aliasToTitle: Record<string, string> = {
    custom: "ncs",
    customs: "ncs",
    "nigeria customs": "ncs",
    "nigeria custom": "ncs",
    immigration: "nis",
    "nigeria immigration": "nis",
    ports: "npa",
    port: "npa",
    "ports authority": "npa",
    quarantine: "naqs",
    "port health": "pha",
    shipper: "nsc",
    shippers: "nsc",
    maritime: "nimasa",
    drug: "ndlea",
    epz: "nepza",
    waterways: "niwa",
    inland: "niwa",
  };
  const aliased = aliasToTitle[needle];
  if (aliased) {
    const hit = PORTS_CUSTOMS_MDAS.find(
      (m) => normalizeAgencyText(m.title) === aliased,
    );
    if (hit) return hit.name;
  }
  for (const mda of PORTS_CUSTOMS_MDAS) {
    const name = normalizeAgencyText(mda.name);
    const title = normalizeAgencyText(mda.title);
    if (needle === title || needle === name) return mda.name;
    if (name.includes(needle) || needle.includes(title) || needle.includes(name)) {
      return mda.name;
    }
    if (needle.includes("shippers") && title === "nsc") return mda.name;
  }
  return null;
}

export function resolveAllowedState(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  return matchState(input);
}

/**
 * Resolve absolute or relative dates using "today" in Africa/Lagos.
 * Returns epoch ms, or null if vague / unparseable / future.
 */
export function resolveIncidentDate(
  input: string | null | undefined,
  nowMs: number = Date.now(),
): { timestamp: number | null; vague: boolean; label: string | null } {
  if (!input?.trim()) {
    return { timestamp: null, vague: false, label: null };
  }
  const trimmed = input.trim();

  // Vague relative phrases that must ask the user
  if (
    /^(last\s+month|some\s+time\s+ago|recently|a\s+while\s+ago|last\s+year|months?\s+ago|weeks?\s+ago)$/i.test(
      trimmed,
    ) ||
    /\b(last\s+month|some\s+time\s+ago|a\s+while\s+ago)\b/i.test(trimmed)
  ) {
    // "last week" and "yesterday" / "today" are resolvable; "last month" is vague
    if (/\blast\s+month\b/i.test(trimmed) || /\bmonths?\s+ago\b/i.test(trimmed)) {
      return { timestamp: null, vague: true, label: null };
    }
    if (
      /\bsome\s+time\s+ago\b/i.test(trimmed) ||
      /\ba\s+while\s+ago\b/i.test(trimmed) ||
      /^recently$/i.test(trimmed)
    ) {
      return { timestamp: null, vague: true, label: null };
    }
  }

  const absolute = parseIncidentDate(trimmed);
  if (absolute !== null) {
    return {
      timestamp: absolute,
      vague: false,
      label: formatDateLabel(absolute),
    };
  }

  const lagosNow = getLagosYmd(nowMs);
  const relative = resolveRelativeDate(trimmed, lagosNow, nowMs);
  if (relative === "vague") {
    return { timestamp: null, vague: true, label: null };
  }
  if (relative === null) {
    return { timestamp: null, vague: false, label: null };
  }
  // Re-validate via parseIncidentDate using constructed DD/MM/YYYY
  const label = formatDateLabel(relative);
  const revalidated = parseIncidentDate(label);
  if (revalidated === null) {
    return { timestamp: null, vague: false, label: null };
  }
  return { timestamp: revalidated, vague: false, label: formatDateLabel(revalidated) };
}

function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  // Use UTC components from a Lagos-local calendar day encoded as local Date
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Returns {y,m,d} for Africa/Lagos at nowMs. */
export function getLagosYmd(nowMs: number): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(nowMs));
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d };
}

function lagosDateToLocalMs(y: number, m: number, d: number): number {
  // Construct as local calendar date (server may not be Lagos); parseIncidentDate
  // uses local Date — for consistency with existing Cloud flow we use local Date.
  return new Date(y, m - 1, d).getTime();
}

function addDaysYmd(
  ymd: { y: number; m: number; d: number },
  deltaDays: number,
): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + deltaDays));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

function resolveRelativeDate(
  input: string,
  lagosNow: { y: number; m: number; d: number },
  _nowMs: number,
): number | null | "vague" {
  const lower = input.trim().toLowerCase();

  if (lower === "today" || lower === "today's date") {
    return lagosDateToLocalMs(lagosNow.y, lagosNow.m, lagosNow.d);
  }
  if (lower === "yesterday") {
    const y = addDaysYmd(lagosNow, -1);
    return lagosDateToLocalMs(y.y, y.m, y.d);
  }
  if (lower === "day before yesterday" || lower === "the day before yesterday") {
    const y = addDaysYmd(lagosNow, -2);
    return lagosDateToLocalMs(y.y, y.m, y.d);
  }

  const daysAgo = /^(\d+)\s+days?\s+ago$/.exec(lower);
  if (daysAgo) {
    const n = Number(daysAgo[1]);
    if (n >= 1 && n <= 366) {
      const y = addDaysYmd(lagosNow, -n);
      return lagosDateToLocalMs(y.y, y.m, y.d);
    }
  }

  if (lower === "last week" || lower === "past week") {
    const y = addDaysYmd(lagosNow, -7);
    return lagosDateToLocalMs(y.y, y.m, y.d);
  }

  if (/\blast\s+month\b/.test(lower) || /\bmonths?\s+ago\b/.test(lower)) {
    return "vague";
  }
  if (/\blast\s+year\b/.test(lower) || /\byears?\s+ago\b/.test(lower)) {
    return "vague";
  }
  if (lower === "recently" || lower === "some time ago" || lower === "a while ago") {
    return "vague";
  }

  // Weekday: "last monday" etc. — approximate within past 7 days
  const weekday = /^(last\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.exec(
    lower,
  );
  if (weekday) {
    const names = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const target = names.indexOf(weekday[2]!);
    const anchor = lagosDateToLocalMs(lagosNow.y, lagosNow.m, lagosNow.d);
    const dow = new Date(anchor).getDay();
    let delta = (dow - target + 7) % 7;
    if (delta === 0) delta = 7; // last <weekday> = previous occurrence
    const y = addDaysYmd(lagosNow, -delta);
    return lagosDateToLocalMs(y.y, y.m, y.d);
  }

  return null;
}

function normalizeIntent(raw: string | undefined): AiIntent {
  const v = (raw ?? "other").toLowerCase().trim();
  const allowed: AiIntent[] = [
    "file_complaint",
    "check_status",
    "follow_up",
    "other",
    "abusive",
    "multi_complaint",
    "out_of_scope",
  ];
  return (allowed.find((a) => a === v) ?? "other") as AiIntent;
}

function clipTitle(title: string): string {
  const t = title.trim().replace(/\s+/g, " ");
  if (t.length <= 80) return t;
  return `${t.slice(0, 77)}...`;
}

export function validateExtraction(
  raw: AiExtractionRaw,
  sourceText: string,
  nowMs: number = Date.now(),
): ValidatedExtraction {
  const intent = normalizeIntent(String(raw.intent ?? "other"));
  const reviewReasons = new Set<string>(raw.reviewReasons ?? []);
  for (const r of detectSensitiveReasons(sourceText)) {
    reviewReasons.add(r);
  }
  if (raw.needsHumanReview) {
    reviewReasons.add("model_flagged");
  }

  const stateRaw = raw.fields?.state;
  const mdaRaw = raw.fields?.assignedMDA;
  const dateRaw = raw.fields?.incidentDate;
  const descRaw = raw.fields?.description;
  const titleRaw = raw.fields?.title;
  const nameRaw = raw.fields?.fullName;

  const stateVal = resolveAllowedState(stateRaw?.value ?? stateRaw?.raw ?? null);
  const stateConf = stateVal ? clampConfidence(stateRaw?.confidence) : 0;
  const state: ValidatedField<string> = {
    value: stateVal,
    confidence: stateConf,
    status: fieldStatus(stateVal, stateConf),
    raw: stateRaw?.raw ?? stateRaw?.value ?? null,
  };

  const mdaVal = resolveAllowedMda(mdaRaw?.value ?? mdaRaw?.raw ?? null);
  const mdaConf = mdaVal ? clampConfidence(mdaRaw?.confidence) : 0;
  const assignedMDA: ValidatedField<string> = {
    value: mdaVal,
    confidence: mdaConf,
    status: fieldStatus(mdaVal, mdaConf),
    raw: mdaRaw?.raw ?? mdaRaw?.value ?? null,
  };

  // Out-of-scope: model flag, or text hints when no allowed MDA resolved
  let outOfScopeAgency =
    raw.outOfScopeAgency?.trim() ||
    (intent === "out_of_scope" ? "unspecified" : null);
  if (!mdaVal && !outOfScopeAgency) {
    outOfScopeAgency = detectOutOfScopeAgency(sourceText);
  }
  // If model returned an MDA string that is not in allow-list and looks like an agency
  if (!mdaVal && mdaRaw?.value?.trim()) {
    const hinted = detectOutOfScopeAgency(mdaRaw.value);
    if (hinted) outOfScopeAgency = mdaRaw.value.trim();
    else if (!resolveAllowedMda(mdaRaw.value) && mdaRaw.value.trim().length > 2) {
      // Unknown agency name from model — treat as out of scope only if confidence high
      if (clampConfidence(mdaRaw.confidence) >= AI_VERIFY_THRESHOLD) {
        outOfScopeAgency = mdaRaw.value.trim();
      }
    }
  }

  const dateInput = dateRaw?.value ?? dateRaw?.raw ?? null;
  const resolved = resolveIncidentDate(dateInput, nowMs);
  let dateConf = clampConfidence(dateRaw?.confidence);
  if (resolved.vague) {
    dateConf = 0;
  } else if (!resolved.timestamp) {
    dateConf = 0;
  }
  const incidentDate: ValidatedField<number> = {
    value: resolved.timestamp,
    confidence: resolved.timestamp ? dateConf : 0,
    status: fieldStatus(resolved.timestamp, dateConf),
    raw: dateInput,
  };

  const descText = (descRaw?.value ?? "").trim() || null;
  const description: ValidatedField<string> = {
    value: descText && descText.length >= 10 ? descText : null,
    confidence: descText && descText.length >= 10 ? clampConfidence(descRaw?.confidence) : 0,
    status: (() => {
      if (!descText || descText.length < 10) return "missing";
      return statusForConfidence(clampConfidence(descRaw?.confidence));
    })(),
    raw: descRaw?.raw ?? descRaw?.value ?? null,
  };

  const titleText = titleRaw?.value?.trim()
    ? clipTitle(titleRaw.value)
    : descText
      ? clipTitle(descText)
      : null;
  const titleConf = titleText
    ? clampConfidence(titleRaw?.confidence ?? (descText ? 0.7 : 0))
    : 0;
  const title: ValidatedField<string> = {
    value: titleText,
    confidence: titleConf,
    status: fieldStatus(titleText, titleConf),
    raw: titleRaw?.raw ?? titleRaw?.value ?? null,
  };

  const nameText = nameRaw?.value?.trim() || null;
  const nameConf = nameText ? clampConfidence(nameRaw?.confidence) : 0;
  const fullName: ValidatedField<string> = {
    value: nameText && nameText.length >= 2 ? nameText : null,
    confidence: nameText ? nameConf : 0,
    status: nameText && nameText.length >= 2 ? statusForConfidence(nameConf) : "missing",
    raw: nameRaw?.raw ?? nameRaw?.value ?? null,
  };

  const required: Array<{ key: RequiredAiField; field: ValidatedField<string | number> }> = [
    { key: "state", field: state },
    { key: "assignedMDA", field: assignedMDA },
    { key: "incidentDate", field: incidentDate },
    { key: "description", field: description },
  ];

  const pendingFields: RequiredAiField[] = [];
  const verifyFields: RequiredAiField[] = [];
  const confidences: number[] = [];

  for (const row of required) {
    if (row.field.status === "missing") pendingFields.push(row.key);
    else if (row.field.status === "verify") verifyFields.push(row.key);
    if (row.field.value !== null) confidences.push(row.field.confidence);
  }

  const overallConfidence =
    confidences.length === 0
      ? 0
      : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  let needsReview =
    overallConfidence < AI_OVERALL_REVIEW_THRESHOLD || reviewReasons.size > 0;
  if (intent === "multi_complaint") {
    reviewReasons.add("multi_complaint");
    needsReview = true;
  }
  if (reviewReasons.size > 0) needsReview = true;

  // Force description missing if empty
  if (!description.value) {
    if (!pendingFields.includes("description")) pendingFields.push("description");
  }

  let nextIntent = intent;
  const scopedOut = assignedMDA.value ? null : outOfScopeAgency;
  if (scopedOut && (intent === "file_complaint" || intent === "out_of_scope")) {
    nextIntent = "out_of_scope";
  }

  return {
    intent: nextIntent,
    language: raw.language ?? null,
    state,
    assignedMDA,
    incidentDate,
    description,
    title,
    fullName,
    overallConfidence,
    needsReview,
    reviewReasons: [...reviewReasons],
    pendingFields,
    verifyFields,
    outOfScopeAgency: scopedOut,
    notes: raw.notes ?? null,
    incidentDateLabel: resolved.label,
  };
}

/** Fix intent when we resolved an allowed MDA — not out of scope. */
export function finalizeValidatedIntent(
  validated: ValidatedExtraction,
): ValidatedExtraction {
  if (validated.assignedMDA.value && validated.intent === "out_of_scope") {
    return {
      ...validated,
      intent: "file_complaint",
      outOfScopeAgency: null,
    };
  }
  if (
    !validated.assignedMDA.value &&
    validated.outOfScopeAgency &&
    (validated.intent === "file_complaint" || validated.intent === "out_of_scope")
  ) {
    return { ...validated, intent: "out_of_scope" };
  }
  return validated;
}

export type DraftShape = {
  fullName?: string;
  zone?: string;
  state?: string;
  assignedMDA?: string;
  mdaMatches?: string[];
  title?: string;
  description?: string;
  // Keep compatible with Convex session draft.fileIds (_storage ids).
  fileIds?: Id<"_storage">[];
  incidentDate?: number;
  aiMeta?: {
    overallConfidence?: number;
    needsReview?: boolean;
    reviewReasons?: string[];
    pendingFields?: string[];
    verifyFields?: string[];
    fieldConfidence?: {
      state?: number;
      assignedMDA?: number;
      incidentDate?: number;
      description?: number;
      title?: number;
      fullName?: number;
    };
    lastIntent?: string;
    rawResult?: string;
    awaitingField?: string;
    outOfScopeAgency?: string;
    sourceMessagePreview?: string;
  };
};

/**
 * Merge validated extraction into existing draft.
 * Never overwrite a higher-confidence accepted field with lower/null unless forceOverwrite.
 */
export function mergeValidatedIntoDraft(
  draft: DraftShape,
  validated: ValidatedExtraction,
  opts?: { forceOverwrite?: boolean },
): DraftShape {
  const force = opts?.forceOverwrite === true;
  const prevConf = draft.aiMeta?.fieldConfidence ?? {};

  const take = <T,>(
    key: keyof NonNullable<DraftShape["aiMeta"]> extends never ? never : string,
    fieldKey: "state" | "assignedMDA" | "incidentDate" | "description" | "title" | "fullName",
    current: T | undefined,
    incoming: ValidatedField<T>,
  ): T | undefined => {
    if (incoming.value === null || incoming.status === "missing") {
      return current;
    }
    if (force) return incoming.value;
    if (current === undefined || current === null || current === "") {
      return incoming.value;
    }
    const prev = prevConf[fieldKey] ?? 1;
    if (incoming.confidence >= prev) return incoming.value;
    return current;
  };

  const nextState = take("state", "state", draft.state, validated.state);
  const nextMda = take(
    "assignedMDA",
    "assignedMDA",
    draft.assignedMDA,
    validated.assignedMDA,
  );
  const nextDate = take(
    "incidentDate",
    "incidentDate",
    draft.incidentDate,
    validated.incidentDate,
  );
  const nextDesc = take(
    "description",
    "description",
    draft.description,
    validated.description,
  );
  const nextTitle = take("title", "title", draft.title, validated.title);
  const nextName = take("fullName", "fullName", draft.fullName, validated.fullName);

  // Recompute pending/verify against merged draft
  const pendingFields: RequiredAiField[] = [];
  const verifyFields: RequiredAiField[] = [];

  const check = (
    key: RequiredAiField,
    hasValue: boolean,
    field: ValidatedField<unknown>,
  ) => {
    if (!hasValue) pendingFields.push(key);
    else if (field.status === "verify") verifyFields.push(key);
  };
  check("state", Boolean(nextState), validated.state);
  check("assignedMDA", Boolean(nextMda), validated.assignedMDA);
  check("incidentDate", nextDate !== undefined && nextDate !== null, validated.incidentDate);
  check("description", Boolean(nextDesc && nextDesc.trim().length >= 10), validated.description);

  const fieldConfidence = {
    state: nextState ? validated.state.confidence : undefined,
    assignedMDA: nextMda ? validated.assignedMDA.confidence : undefined,
    incidentDate: nextDate != null ? validated.incidentDate.confidence : undefined,
    description: nextDesc ? validated.description.confidence : undefined,
    title: nextTitle ? validated.title.confidence : undefined,
    fullName: nextName ? validated.fullName.confidence : undefined,
  };

  const confidences = Object.values(fieldConfidence).filter(
    (n): n is number => typeof n === "number",
  );
  const overallConfidence =
    confidences.length === 0
      ? 0
      : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return {
    ...draft,
    state: nextState,
    assignedMDA: nextMda,
    incidentDate: nextDate,
    description: nextDesc,
    title: nextTitle,
    fullName: nextName,
    aiMeta: {
      overallConfidence,
      needsReview:
        validated.needsReview || overallConfidence < AI_OVERALL_REVIEW_THRESHOLD,
      reviewReasons: validated.reviewReasons,
      pendingFields,
      verifyFields,
      fieldConfidence,
      lastIntent: validated.intent,
      rawResult: JSON.stringify(validated),
      awaitingField: pendingFields[0],
      outOfScopeAgency: validated.outOfScopeAgency ?? undefined,
      sourceMessagePreview: draft.aiMeta?.sourceMessagePreview,
    },
  };
}

export function allowedMdaNames(): string[] {
  return PORTS_CUSTOMS_MDAS.map((m) => m.name);
}

export function allowedMdaTitles(): string[] {
  return PORTS_CUSTOMS_MDAS.map((m) => `${m.title} = ${m.name}`);
}

export function allowedStates(): readonly string[] {
  return NIGERIAN_STATES;
}

export function redactPhone(text: string): string {
  return text
    .replace(/\+?234\d{7,12}/g, "[PHONE]")
    .replace(/\b0\d{10}\b/g, "[PHONE]")
    .replace(/whatsapp:\+?\d+/gi, "[PHONE]");
}

export function hashPhone(phone: string): string {
  // Non-crypto stable hash for analytics join (not for security).
  let h = 0;
  const s = phone.replace(/\D/g, "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `ph_${h.toString(16)}`;
}

export function previewText(text: string, max = 240): string {
  const clean = redactPhone(text).trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}…`;
}

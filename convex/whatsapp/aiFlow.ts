/**
 * AI free-form filing helpers (pure + reply builders).
 * Mutations that touch sessions live in simpleFlow.ts to avoid cycles.
 */

import { GEO_ZONES, PORTS_CUSTOMS_MDAS, stateRowId } from "./portsCustoms";
import { matchState } from "./constants";
import {
  AI_OVERALL_REVIEW_THRESHOLD,
  hashPhone,
  mergeValidatedIntoDraft,
  previewText,
  resolveIncidentDate,
  type DraftShape,
  type RequiredAiField,
  type ValidatedExtraction,
} from "./aiValidate";
import { aiCopy } from "./aiCopy";
import type { WhatsAppLang } from "./i18n";

export { hashPhone, previewText };

export function wantsComplaintKeyword(normalized: string): boolean {
  return /\b(complaint|complain|kara|mkpesa|esun)\b/.test(normalized);
}

const CLASSIC_FILING_STEPS = new Set([
  "collect_zone",
  "collect_state",
  "collect_mda",
  "collect_incident_date",
  "awaiting_complaint",
]);

const PORTS_SIGNAL =
  /\b(ncs|customs|immigration|nis|npa|ports?|ndlea|nepza|nimasa|naqs|niwa|pha|quarantine|shippers?|apapa|tin\s*can|container|clearance|cargo)\b/i;

/** Heuristic: this message is probably a complaint story, not a greeting. */
export function looksLikeComplaintText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  const lower = trimmed.toLowerCase();
  if (wantsComplaintKeyword(lower) && trimmed.length >= 20) return true;
  if (PORTS_SIGNAL.test(trimmed)) return true;
  // Date-like + place/agency signal, or a long narrative
  if (trimmed.length >= 40) return true;
  if (trimmed.length >= 28 && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(trimmed)) {
    return true;
  }
  return false;
}

export function resolveSessionLanguage(
  raw: string | null | undefined,
): WhatsAppLang {
  const v = (raw ?? "").toLowerCase().trim();
  if (v.startsWith("ha")) return "ha";
  if (v.startsWith("ig")) return "ig";
  if (v.startsWith("yo")) return "yo";
  return "en";
}

/** Fast hint before Gemini finishes — used for interim "Reading…" copy. */
export function guessLanguageHint(
  text: string,
  fallback?: WhatsAppLang,
): WhatsAppLang {
  const t = text.toLowerCase();
  const ha =
    /\b(sannu|yaya|ina|wannan|ba\s+ni|da\s+fatan|kara|hukuma|jiha|kwanan|barka|asalam|na\s+yi|ban\s+gane|rubuta)\b/i.test(
      t,
    ) || /[ƙɓɗƴ]/.test(t);
  const ig =
    /\b(ndewo|kedu|biko|mkpesa|asụsụ|nke\s+a|ga-ele|zipu|nnọọ|ndị)\b/i.test(t) ||
    /[ịọụṅ]/.test(t);
  const yo =
    /\b(bawo|ẹ\s*káàbọ|jowo|esun|ipinle|ṣe|nitori|mo\s+fe|kaabo)\b/i.test(t) ||
    /[ẹọṣṣ]/.test(t);
  if (ha && !ig && !yo) return "ha";
  if (ig && !ha && !yo) return "ig";
  if (yo && !ha && !ig) return "yo";
  return fallback ?? "en";
}

export type AiReplyKind = "menu" | "text" | "list";
export type AiListRow = { id: string; title: string; description?: string };
export type AiListSpec = {
  button: string;
  body: string;
  sections: Array<{ title?: string; rows: AiListRow[] }>;
};
export type AiMenuSpec = {
  body: string;
  buttons: Array<{ id: string; title: string }>;
};
export type AiReply = {
  reply: string;
  kind: AiReplyKind;
  list?: AiListSpec;
  menu?: AiMenuSpec;
};

type SessionLike = {
  language?: WhatsAppLang;
  step: string;
  draft: DraftShape;
};

/** When true, cloud.ts should run Gemini extract before continuing. */
export function shouldAttemptAiExtract(args: {
  step: string;
  language?: WhatsAppLang;
  text: string;
  buttonId?: string;
  storageId?: string;
  mediaFailed?: boolean;
}): boolean {
  // Media-only is handled separately; media+caption can still extract.
  if (args.buttonId || args.mediaFailed) return false;
  const text = args.text.trim();
  if (text.length < 12) return false;
  const lower = text.toLowerCase();

  // Correction free-text while confirming
  if (args.step === "ai_confirm") {
    if (lower === "yes" || lower === "confirm" || lower === "ok") return false;
    return text.length >= 8;
  }

  // Phase 1: first contact / no language yet — long complaint skips picker
  if (
    (!args.language || args.step === "collect_language" || args.step === "idle") &&
    looksLikeComplaintText(text)
  ) {
    // Very short "I want to complain" → guided classic, not extract
    if (wantsComplaintKeyword(lower) && text.length < 36 && !PORTS_SIGNAL.test(text)) {
      return false;
    }
    return true;
  }

  // Idle with language: free-form complaint narrative
  if (args.step === "idle" && args.language) {
    if (wantsComplaintKeyword(lower) && text.length < 36 && !PORTS_SIGNAL.test(text)) {
      return false;
    }
    return text.length >= 20 || looksLikeComplaintText(text);
  }

  // Phase 2: mid classic 5-step — dump a story instead of tapping lists
  if (CLASSIC_FILING_STEPS.has(args.step) && looksLikeComplaintText(text)) {
    return true;
  }

  return false;
}

/** Soft welcome for greetings / first short messages (no mandatory language wall). */
export function buildSoftWelcome(lang: WhatsAppLang | undefined): AiReply {
  const copy = aiCopy(lang);
  const body = copy.softWelcome;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "change_language", title: copy.changeLanguage },
        { id: "check_status", title: copy.checkComplaint },
        { id: "submit_complaint", title: copy.guidedSteps },
      ],
    },
  };
}

export function buildNeedTextForMedia(lang: WhatsAppLang | undefined): AiReply {
  const copy = aiCopy(lang);
  const body = copy.needTextForMedia;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "open_menu", title: copy.menuButton },
        { id: "change_language", title: copy.changeLanguage },
      ],
    },
  };
}

export function buildOutOfScopeReply(
  lang: WhatsAppLang | undefined,
  agency: string | null,
): AiReply {
  const copy = aiCopy(lang);
  return {
    reply: copy.outOfScope(agency),
    kind: "menu",
    menu: {
      body: copy.outOfScope(agency),
      buttons: [
        { id: "submit_complaint", title: copy.guidedSteps },
        { id: "open_menu", title: "Menu" },
      ],
    },
  };
}

export function buildAbusiveReply(lang: WhatsAppLang | undefined): AiReply {
  const copy = aiCopy(lang);
  return {
    reply: copy.abusive,
    kind: "menu",
    menu: {
      body: copy.abusive,
      buttons: [{ id: "open_menu", title: "Menu" }],
    },
  };
}

function formatDateLabel(ms: number | undefined): string {
  if (!ms) return "—";
  const date = new Date(ms);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function verifyLabels(fields: string[]): string[] {
  const map: Record<string, string> = {
    state: "state",
    assignedMDA: "agency",
    incidentDate: "date",
    description: "description",
  };
  return fields.map((f) => map[f] ?? f);
}

export function buildConfirmReply(session: SessionLike): AiReply {
  const copy = aiCopy(session.language);
  const d = session.draft;
  const body = copy.confirmBody({
    state: d.state ?? "—",
    mda: d.assignedMDA ?? "—",
    dateLabel: formatDateLabel(d.incidentDate),
    description: clip(d.description ?? "—", 280),
    title: d.title,
    verifyHints: verifyLabels(d.aiMeta?.verifyFields ?? []),
  });
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "ai_confirm_yes", title: copy.confirmButton },
        { id: "ai_confirm_edit", title: copy.editButton },
        { id: "ai_start_over", title: copy.startOverButton },
      ],
    },
  };
}

function clip(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildEvidenceAfterConfirm(
  lang: WhatsAppLang | undefined,
  hasFiles = false,
): AiReply {
  const copy = aiCopy(lang);
  const body = hasFiles ? copy.evidenceAlreadyAttached : copy.evidenceAfterConfirm;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      // No "Attach" tap required — user can send a file directly, or Submit.
      buttons: [
        { id: "submit_filing", title: copy.submitWithoutEvidence },
        { id: "exit_complaint", title: copy.exitButton },
      ],
    },
  };
}

function withExitAndMenu(
  rows: AiListRow[],
  exitTitle: string,
  menuTitle = "Menu",
): AiListRow[] {
  const extra: AiListRow[] = [
    { id: "open_menu", title: menuTitle },
    { id: "exit_complaint", title: exitTitle },
  ];
  const room = 10 - extra.length;
  return [...rows.slice(0, Math.max(0, room)), ...extra];
}

export function buildAskMissing(
  lang: WhatsAppLang | undefined,
  field: RequiredAiField | string,
  exitTitle = "Exit",
): AiReply {
  const copy = aiCopy(lang);
  if (field === "state") {
    // Flat state list is too long for one WhatsApp list (max 10 rows).
    // Ask via geo zones first (same as classic), but stay in ai_collect_missing.
    return {
      reply: copy.askState,
      kind: "list",
      list: {
        button: "Select region",
        body: copy.askState,
        sections: [
          {
            title: "Nigeria",
            rows: withExitAndMenu(
              GEO_ZONES.map((zone) => ({
                id: `ai_zone_${zone.id.replace(/^zone_/, "")}`,
                title: zone.title,
              })),
              exitTitle,
              copy.menuButton,
            ),
          },
        ],
      },
    };
  }
  if (field === "assignedMDA") {
    return {
      reply: copy.askMda,
      kind: "list",
      list: {
        button: "Select MDA",
        body: copy.askMda,
        sections: [
          {
            title: "Ports & Customs",
            rows: PORTS_CUSTOMS_MDAS.map((mda) => ({
              id: `ai_${mda.id}`,
              title: mda.title,
              description: mda.name,
            })),
          },
        ],
      },
    };
  }
  if (field === "incidentDate") {
    const body = copy.askDate;
    return {
      reply: body,
      kind: "menu",
      menu: {
        body,
        buttons: [
          { id: "exit_complaint", title: copy.exitButton },
          { id: "ai_start_over", title: copy.startOverButton },
        ],
      },
    };
  }
  const body = copy.askDescription;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "exit_complaint", title: copy.exitButton },
        { id: "ai_start_over", title: copy.startOverButton },
      ],
    },
  };
}

/** After zone pick during AI missing-state collection. */
export function buildAiStateList(
  lang: WhatsAppLang | undefined,
  zoneSuffix: string,
  exitTitle = "Exit",
): AiReply | null {
  const zoneId = zoneSuffix.startsWith("zone_")
    ? zoneSuffix
    : `zone_${zoneSuffix}`;
  const zone = GEO_ZONES.find((z) => z.id === zoneId);
  if (!zone) return null;
  const copy = aiCopy(lang);
  const body = copy.askState;
  return {
    reply: body,
    kind: "list",
    list: {
      button: "Select state",
      body,
      sections: [
        {
          title: zone.title,
          rows: withExitAndMenu(
            zone.states.map((state) => ({
              id: `ai_${stateRowId(state)}`,
              title: state === "Federal Capital Territory" ? "FCT" : state,
              description:
                state === "Federal Capital Territory"
                  ? "Federal Capital Territory"
                  : undefined,
            })),
            exitTitle,
            copy.menuButton,
          ),
        },
      ],
    },
  };
}

export function applyValidatedToDraft(
  draft: DraftShape,
  validated: ValidatedExtraction,
  sourcePreview: string,
): DraftShape {
  const merged = mergeValidatedIntoDraft(draft, validated);
  return {
    ...merged,
    aiMeta: {
      ...merged.aiMeta,
      sourceMessagePreview: previewText(sourcePreview, 200),
    },
  };
}

export function nextMissingField(draft: DraftShape): RequiredAiField | null {
  const pending = (draft.aiMeta?.pendingFields ?? []) as RequiredAiField[];
  return pending[0] ?? null;
}

export function draftReadyForConfirm(draft: DraftShape): boolean {
  return (
    Boolean(draft.state) &&
    Boolean(draft.assignedMDA) &&
    draft.incidentDate != null &&
    Boolean(draft.description && draft.description.trim().length >= 10) &&
    (draft.aiMeta?.pendingFields?.length ?? 0) === 0
  );
}

export function shouldFallbackToClassic(args: {
  ok: boolean;
  timedOut?: boolean;
  overallConfidence?: number;
  pendingCount?: number;
  intent?: string;
}): boolean {
  if (!args.ok || args.timedOut) return true;
  if (args.intent === "out_of_scope" || args.intent === "abusive") return false;
  if (args.intent === "check_status" || args.intent === "follow_up") return false;
  if (args.intent === "other" && (args.pendingCount ?? 4) >= 4) return true;
  if (
    typeof args.overallConfidence === "number" &&
    args.overallConfidence < 0.35 &&
    (args.pendingCount ?? 0) >= 3
  ) {
    return true;
  }
  return false;
}

export function fillMissingFromUserText(
  draft: DraftShape,
  field: string,
  text: string,
  nowMs: number = Date.now(),
): { draft: DraftShape; ok: boolean; error?: string } {
  const copyDraft: DraftShape = {
    ...draft,
    aiMeta: { ...draft.aiMeta },
  };

  if (field === "state") {
    const state = matchState(text);
    if (!state) return { draft, ok: false, error: "state" };
    copyDraft.state = state;
  } else if (field === "assignedMDA") {
    return { draft, ok: false, error: "mda" };
  } else if (field === "incidentDate") {
    const resolved = resolveIncidentDate(text, nowMs);
    if (resolved.vague || !resolved.timestamp) {
      return { draft, ok: false, error: "date" };
    }
    copyDraft.incidentDate = resolved.timestamp;
  } else if (field === "description") {
    if (text.trim().length < 10) return { draft, ok: false, error: "description" };
    copyDraft.description = text.trim();
    if (!copyDraft.title) {
      copyDraft.title = text.trim().slice(0, 80);
    }
  } else {
    return { draft, ok: false };
  }

  // Recompute pending
  const pending: string[] = [];
  if (!copyDraft.state) pending.push("state");
  if (!copyDraft.assignedMDA) pending.push("assignedMDA");
  if (copyDraft.incidentDate == null) pending.push("incidentDate");
  if (!copyDraft.description || copyDraft.description.trim().length < 10) {
    pending.push("description");
  }
  const verify = (copyDraft.aiMeta?.verifyFields ?? []).filter(
    (f) => !pending.includes(f),
  );
  copyDraft.aiMeta = {
    ...copyDraft.aiMeta,
    pendingFields: pending,
    verifyFields: verify,
    awaitingField: pending[0],
    overallConfidence: Math.max(
      copyDraft.aiMeta?.overallConfidence ?? 0.6,
      AI_OVERALL_REVIEW_THRESHOLD,
    ),
  };
  return { draft: copyDraft, ok: true };
}

export function phoneHashForAi(phone: string): string {
  return hashPhone(phone);
}

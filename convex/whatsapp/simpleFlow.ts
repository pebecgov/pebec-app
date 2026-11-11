import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { createTicketRecord } from "../tickets";
import { saveWhatsAppCitizenComment } from "../ticket_comments";
import {
  WHATSAPP_DEFAULT_TITLE,
  extractTicketNumber,
  guestEmailForPhone,
  matchState,
  toNigeriaLocalPhone,
} from "./constants";
import {
  copyFor,
  followUpCopy,
  isCancelCommand,
  isGreeting,
  languageListSpec,
  parseLanguageChoice,
  statusLabel,
  type WhatsAppLang,
} from "./i18n";
import {
  GEO_ZONES,
  PORTS_CUSTOMS_MDAS,
  findMda,
  findZone,
  parseIncidentDate,
  stateFromRowId,
  stateRowId,
} from "./portsCustoms";
import {
  applyValidatedToDraft,
  buildAbusiveReply,
  buildAiStateList,
  buildAskMissing,
  buildConfirmReply,
  buildEvidenceAfterConfirm,
  buildNeedTextForMedia,
  buildOutOfScopeReply,
  buildSoftWelcome,
  draftReadyForConfirm,
  fillMissingFromUserText,
  guessLanguageHint,
  looksLikeComplaintText,
  nextMissingField,
  phoneHashForAi,
  resolveSessionLanguage,
  shouldAttemptAiExtract,
  shouldFallbackToClassic,
  type AiReply,
} from "./aiFlow";
import { aiCopy } from "./aiCopy";
import type { ValidatedExtraction } from "./aiValidate";
import type { Doc, Id } from "../_generated/dataModel";

type SessionDoc = Doc<"whatsapp_sessions">;
type ReplyKind = "menu" | "text" | "list";
type ListRow = { id: string; title: string; description?: string };
type ListSpec = {
  button: string;
  body: string;
  sections: Array<{ title?: string; rows: ListRow[] }>;
};
type MenuSpec = {
  body: string;
  buttons: Array<{ id: string; title: string }>;
};
type Reply = {
  reply: string;
  kind: ReplyKind;
  list?: ListSpec;
  menu?: MenuSpec;
  needsAiExtract?: boolean;
  priorDraftJson?: string;
  phoneHash?: string;
  /** Language for interim "Reading…" before extract finishes. */
  replyLanguage?: WhatsAppLang;
};
type Copy = ReturnType<typeof copyFor>;
type FollowCopy = ReturnType<typeof followUpCopy>;

function asReply(ai: AiReply): Reply {
  return {
    reply: ai.reply,
    kind: ai.kind,
    list: ai.list,
    menu: ai.menu,
  };
}

function followCopy(session: SessionDoc): FollowCopy {
  return followUpCopy(session.language);
}

const listValidator = v.object({
  button: v.string(),
  body: v.string(),
  sections: v.array(
    v.object({
      title: v.optional(v.string()),
      rows: v.array(
        v.object({
          id: v.string(),
          title: v.string(),
          description: v.optional(v.string()),
        }),
      ),
    }),
  ),
});

const menuValidator = v.object({
  body: v.string(),
  buttons: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
    }),
  ),
});

function sessionCopy(session: SessionDoc): Copy {
  return copyFor(session.language);
}

function isExitId(replyId: string): boolean {
  return replyId === "exit_complaint" || replyId === "exit";
}

function exitRow(copy: Copy): ListRow {
  return {
    id: "exit_complaint",
    title: copy.exitTitle,
    description: copy.exitDescription,
  };
}

function withExitRow(copy: Copy, rows: ListRow[]): ListRow[] {
  const extra: ListRow[] = [
    { id: "open_menu", title: "Menu" },
    exitRow(copy),
  ];
  const room = 10 - extra.length;
  return [...rows.slice(0, Math.max(0, room)), ...extra];
}

function wantsComplaint(normalized: string): boolean {
  return /\b(complaint|complain|kara|mkpesa|esun)\b/.test(normalized);
}

function formatIncidentDate(value: number | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function languagePicker(): Reply {
  const list = languageListSpec();
  return {
    reply: list.body,
    kind: "list",
    list,
  };
}

function zoneList(copy: Copy): Reply {
  return {
    reply: copy.zoneBody,
    kind: "list",
    list: {
      button: copy.selectRegion,
      body: copy.zoneBody,
      sections: [
        {
          title: "Nigeria",
          rows: withExitRow(
            copy,
            GEO_ZONES.map((zone) => ({
              id: zone.id,
              title: zone.title,
            })),
          ),
        },
      ],
    },
  };
}

function stateList(copy: Copy, zoneId: string): Reply | null {
  const zone = findZone(zoneId);
  if (!zone) return null;
  const body = copy.stateBody(zone.title);
  return {
    reply: body,
    kind: "list",
    list: {
      button: copy.selectState,
      body,
      sections: [
        {
          title: zone.title,
          rows: withExitRow(
            copy,
            zone.states.map((state) => ({
              id: stateRowId(state),
              title: state === "Federal Capital Territory" ? "FCT" : state,
              description:
                state === "Federal Capital Territory"
                  ? "Federal Capital Territory"
                  : undefined,
            })),
          ),
        },
      ],
    },
  };
}

function mdaList(copy: Copy): Reply {
  return {
    reply: copy.mdaBody,
    kind: "list",
    list: {
      button: copy.selectMda,
      body: copy.mdaBody,
      sections: [
        {
          title: "Ports & Customs",
          rows: PORTS_CUSTOMS_MDAS.map((mda) => ({
            id: mda.id,
            title: mda.title,
            description: mda.name,
          })),
        },
      ],
    },
  };
}

function menuReply(copy: Copy, body?: string, language?: WhatsAppLang): Reply {
  const aic = aiCopy(language);
  const text =
    body ??
    [
      aic.softWelcome,
      "",
      "Or use the buttons below.",
    ].join("\n");
  return {
    reply: text,
    kind: "menu",
    menu: {
      body: text,
      buttons: [
        { id: "submit_complaint", title: aic.guidedSteps },
        { id: "check_status", title: aic.checkComplaint },
        { id: "change_language", title: aic.changeLanguage },
      ],
    },
  };
}

async function patchSession(
  ctx: MutationCtx,
  sessionId: Id<"whatsapp_sessions">,
  value: Partial<Doc<"whatsapp_sessions">>,
) {
  const now = Date.now();
  await ctx.db.patch(sessionId, {
    ...value,
    updatedAt: now,
    lastInboundAt: now,
  });
}

export const processSimpleInbound = internalMutation({
  args: {
    phone: v.string(),
    body: v.string(),
    buttonId: v.optional(v.string()),
    messageSid: v.string(),
    storageId: v.optional(v.id("_storage")),
    mediaFilename: v.optional(v.string()),
    mediaFailed: v.optional(v.boolean()),
  },
  returns: v.object({
    reply: v.string(),
    kind: v.union(v.literal("menu"), v.literal("text"), v.literal("list")),
    list: v.optional(listValidator),
    menu: v.optional(menuValidator),
    duplicate: v.boolean(),
    needsAiExtract: v.optional(v.boolean()),
    priorDraftJson: v.optional(v.string()),
    phoneHash: v.optional(v.string()),
    replyLanguage: v.optional(
      v.union(
        v.literal("en"),
        v.literal("ha"),
        v.literal("ig"),
        v.literal("yo"),
      ),
    ),
  }),
  handler: async (ctx, args) => {
    const existingSid = await ctx.db
      .query("whatsapp_inbound_messages")
      .withIndex("byMessageSid", (q) => q.eq("messageSid", args.messageSid))
      .first();
    if (existingSid) {
      return {
        reply: existingSid.reply,
        kind: "text" as const,
        duplicate: true,
      };
    }

    const now = Date.now();
    let session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("byPhone", (q) => q.eq("phone", args.phone))
      .first();

    if (!session) {
      const sessionId = await ctx.db.insert("whatsapp_sessions", {
        phone: args.phone,
        step: "idle",
        draft: {},
        lastInboundAt: now,
        updatedAt: now,
      });
      session = await ctx.db.get(sessionId);
    }
    if (!session) {
      throw new Error("Failed to create WhatsApp session");
    }

    const result = await nextReply(
      ctx,
      session,
      args.body.trim(),
      args.buttonId,
      args.storageId,
      args.mediaFilename,
      args.mediaFailed,
    );

    // Defer idempotency write until AI extract completes in cloud.ts
    if (result.needsAiExtract) {
      return {
        reply: result.reply,
        kind: result.kind,
        list: result.list,
        menu: result.menu,
        duplicate: false,
        needsAiExtract: true,
        priorDraftJson: result.priorDraftJson,
        phoneHash: result.phoneHash ?? phoneHashForAi(args.phone),
        replyLanguage: result.replyLanguage,
      };
    }

    await ctx.db.insert("whatsapp_inbound_messages", {
      messageSid: args.messageSid,
      phone: args.phone,
      reply: result.reply,
      createdAt: now,
    });

    return {
      reply: result.reply,
      kind: result.kind,
      list: result.list,
      menu: result.menu,
      duplicate: false,
    };
  },
});

async function leaveTicketAndSetStep(
  ctx: MutationCtx,
  session: SessionDoc,
  step: SessionDoc["step"],
) {
  const now = Date.now();
  const { _id, _creationTime, activeTicketId: _ticket, ...rest } = session;
  await ctx.db.replace(_id, {
    ...rest,
    step,
    draft: {},
    updatedAt: now,
    lastInboundAt: now,
  });
}

async function showMenu(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  await leaveTicketAndSetStep(ctx, session, "idle");
  return menuReply(sessionCopy(session), undefined, session.language);
}

async function askLanguage(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  await leaveTicketAndSetStep(ctx, session, "collect_language");
  return languagePicker();
}

async function setLanguage(
  ctx: MutationCtx,
  session: SessionDoc,
  language: WhatsAppLang,
): Promise<Reply> {
  await patchSession(ctx, session._id, {
    step: "idle",
    language,
    lastInboundAt: Date.now(),
  });
  return menuReply(copyFor(language), undefined, language);
}

async function exitFiling(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  const copy = sessionCopy(session);
  await leaveTicketAndSetStep(ctx, session, "idle");
  return menuReply(copy, copy.exited, session.language);
}

async function startComplaint(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  await patchSession(ctx, session._id, {
    step: "collect_zone",
    draft: {},
  });
  return zoneList(sessionCopy(session));
}

async function askDate(
  ctx: MutationCtx,
  session: SessionDoc,
  assignedMDA: string,
): Promise<Reply> {
  await patchSession(ctx, session._id, {
    step: "collect_incident_date",
    draft: { ...session.draft, assignedMDA },
  });
  const sessionCopyText = sessionCopy(session);
  const prompt = sessionCopyText.datePrompt;
  return {
    reply: prompt,
    kind: "menu",
    menu: {
      body: prompt,
      buttons: [{ id: "exit_complaint", title: sessionCopyText.exitTitle }],
    },
  };
}

async function evidenceMenu(
  copy: Copy,
  received: boolean,
  _menuTitle?: string,
): Promise<Reply> {
  const body = received ? copy.evidenceReceived : copy.evidencePrompt;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      // User can send a file directly — no "Attach" tap required.
      buttons: [
        { id: "submit_filing", title: copy.submitFiling },
        { id: "exit_complaint", title: copy.exitTitle },
      ],
    },
  };
}

async function askEvidence(
  ctx: MutationCtx,
  session: SessionDoc,
  description: string,
): Promise<Reply> {
  const copy = sessionCopy(session);
  await patchSession(ctx, session._id, {
    step: "collect_evidence",
    draft: {
      ...session.draft,
      description,
      fileIds: session.draft.fileIds ?? [],
    },
  });
  return await evidenceMenu(copy, false, followCopy(session).menuButton);
}

async function finishComplaint(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  const copy = sessionCopy(session);
  const state = session.draft.state?.trim();
  const assignedMDA = session.draft.assignedMDA?.trim();
  const incidentDate = session.draft.incidentDate;
  const description = session.draft.description?.trim();
  if (!state || !assignedMDA || !incidentDate || !description) {
    await patchSession(ctx, session._id, { step: "idle", draft: {} });
    return {
      reply: copy.missingFiling,
      kind: "text",
    };
  }

  const aiMeta = session.draft.aiMeta;
  const title =
    session.draft.title?.trim().slice(0, 80) || WHATSAPP_DEFAULT_TITLE;
  const fullName =
    session.draft.fullName?.trim() || "WhatsApp Citizen";
  const needsReview = Boolean(aiMeta?.needsReview);
  const citizenLanguage: WhatsAppLang = session.language ?? "en";
  const needsEnTranslation = citizenLanguage !== "en";
  const created = await createTicketRecord(ctx, {
    title,
    description,
    assignedMDA,
    fullName,
    email: guestEmailForPhone(session.phone),
    phoneNumber: toNigeriaLocalPhone(session.phone),
    incidentDate,
    location: state,
    state,
    address: "",
    supportingDocuments: session.draft.fileIds ?? [],
    source: "whatsapp",
    whatsappPhone: session.phone,
    aiConfidence: aiMeta?.overallConfidence,
    aiResult: aiMeta?.rawResult,
    aiStatus: needsReview ? "needs_review" : aiMeta ? "ai_filed" : undefined,
    aiNeedsReviewNotify: needsReview,
    citizenLanguage,
    titleEn: needsEnTranslation ? undefined : title,
    descriptionEn: needsEnTranslation ? undefined : description,
    skipWhatsAppStaffEmail: needsEnTranslation,
  });

  if (needsEnTranslation) {
    await ctx.scheduler.runAfter(
      0,
      internal.whatsapp.aiTranslate.enrichTicketForStaff,
      { ticketId: created.ticketId },
    );
  }

  await patchSession(ctx, session._id, {
    step: "idle",
    draft: {},
    activeTicketId: created.ticketId,
  });

  const body = copy.submittedCloud(
    created.ticketNumber,
    title,
    state,
    assignedMDA,
    formatIncidentDate(incidentDate),
  );
  return menuReply(copy, body, session.language);
}

function parseStatusTicketRowId(replyId: string): Id<"tickets"> | null {
  if (!replyId.startsWith("status:")) return null;
  return replyId.slice("status:".length) as Id<"tickets">;
}

async function statusReply(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<Reply> {
  const copy = sessionCopy(session);
  const ticketNumber = extractTicketNumber(text);
  if (ticketNumber) {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("byTicketNumber", (q) => q.eq("ticketNumber", ticketNumber))
      .first();
    if (!ticket || ticket.whatsappPhone !== session.phone) {
      return {
        reply: copy.statusNotFound,
        kind: "text",
      };
    }
    return await followUpSummary(ctx, session, ticket);
  }
  return await startTicketPicker(ctx, session);
}

function clipText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function ticketRowId(ticketId: Id<"tickets">): string {
  return `ticket:${ticketId}`;
}

function parseTicketRowId(replyId: string): Id<"tickets"> | null {
  if (!replyId.startsWith("ticket:")) return null;
  return replyId.slice("ticket:".length) as Id<"tickets">;
}

function parseActionTicketId(
  replyId: string,
  prefix: "reply" | "attach" | "view" | "addinfo",
): Id<"tickets"> | null {
  const token = `${prefix}:`;
  if (!replyId.startsWith(token)) return null;
  return replyId.slice(token.length) as Id<"tickets">;
}

async function ownedTicket(
  ctx: MutationCtx,
  session: SessionDoc,
  ticketId: Id<"tickets">,
) {
  const ticket = await ctx.db.get(ticketId);
  if (!ticket || ticket.whatsappPhone !== session.phone) return null;
  return ticket;
}

async function latestComments(
  ctx: MutationCtx,
  ticketId: Id<"tickets">,
) {
  return await ctx.db
    .query("ticket_comments")
    .withIndex("byTicket", (q) => q.eq("ticketId", ticketId))
    .order("desc")
    .take(20);
}

function followUpActionsMenu(
  ticketId: Id<"tickets">,
  body: string,
  fu: FollowCopy,
): Reply {
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: `view:${ticketId}`, title: fu.viewConversation },
        { id: `addinfo:${ticketId}`, title: fu.addInformation },
        { id: "open_menu", title: fu.menuButton },
      ],
    },
  };
}

function followUpRespondMenu(
  ticketId: Id<"tickets">,
  body: string,
  fu: FollowCopy,
): Reply {
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: `reply:${ticketId}`, title: fu.reply },
        { id: "open_menu", title: fu.menuButton },
      ],
    },
  };
}

function formatConversation(
  ticket: Doc<"tickets">,
  comments: Doc<"ticket_comments">[],
  fu: FollowCopy,
): string {
  const header = `${ticket.ticketNumber}\n\n${fu.conversationTitle}`;
  const footer = fu.wouldYouRespond;
  const blocks: string[] = [
    `${fu.you}\n${clipText(ticket.description, 180)}`,
  ];
  const chronological = [...comments].reverse();
  for (const comment of chronological) {
    const who =
      comment.authorId === ticket.createdBy ? fu.you : fu.officer;
    blocks.push(`${who}\n${clipText(comment.content, 200)}`);
  }

  const fits = (thread: string) =>
    header.length + thread.length + footer.length + 6 <= 900;

  let thread = blocks.join("\n\n");
  if (!fits(thread)) {
    const kept: string[] = [];
    for (let i = blocks.length - 1; i >= 0; i--) {
      const next = [blocks[i], ...kept].join("\n\n");
      if (!fits(next)) break;
      kept.unshift(blocks[i]!);
    }
    thread = kept.join("\n\n");
  }

  if (!thread) {
    thread = fu.noOfficer;
  }

  return [header, "", thread, "", footer].join("\n");
}

async function followUpSummary(
  ctx: MutationCtx,
  session: SessionDoc,
  ticket: Doc<"tickets">,
): Promise<Reply> {
  const fu = followCopy(session);
  const comments = await latestComments(ctx, ticket._id);
  const last = comments[0];
  const lastUpdate = last ? clipText(last.content, 220) : fu.noUpdates;
  const body = [
    ticket.ticketNumber,
    "",
    `${sessionCopy(session).statusLabel}: ${statusLabel(fu, ticket.status)}`,
    "",
    fu.yourComplaint,
    clipText(ticket.description, 280),
    "",
    fu.lastUpdate,
    lastUpdate,
    "",
    fu.whatNext,
  ].join("\n");
  await patchSession(ctx, session._id, {
    step: "follow_up_ticket",
    activeTicketId: ticket._id,
  });
  return followUpActionsMenu(ticket._id, body, fu);
}

/** Shared list picker for Check Complaint and Follow Up. */
async function startTicketPicker(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  const copy = sessionCopy(session);
  const fu = followCopy(session);
  const tickets = await ctx.db
    .query("tickets")
    .withIndex("byWhatsappPhone", (q) => q.eq("whatsappPhone", session.phone))
    .order("desc")
    .take(9);

  if (tickets.length === 0) {
    return { reply: fu.none, kind: "text" };
  }
  if (tickets.length === 1 && tickets[0]) {
    return await followUpSummary(ctx, session, tickets[0]);
  }

  await patchSession(ctx, session._id, {
    step: "ticket_select",
  });

  const rows = await Promise.all(
    tickets.map(async (ticket) => {
      const mda = ticket.assignedMDA
        ? await ctx.db.get(ticket.assignedMDA)
        : null;
      const mdaName = mda?.name ?? copy.unassigned;
      return {
        id: ticketRowId(ticket._id),
        title: ticket.ticketNumber,
        description: clipText(
          `${statusLabel(fu, ticket.status)} — ${mdaName}`,
          72,
        ),
      };
    }),
  );

  return {
    reply: fu.listBody,
    kind: "list",
    list: {
      button: fu.listButton,
      body: fu.listBody,
      sections: [
        {
          title: fu.listButton,
          rows: [...rows, { id: "open_menu", title: fu.menuButton }],
        },
      ],
    },
  };
}

async function startFollowUp(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  return await startTicketPicker(ctx, session);
}

async function showConversation(
  ctx: MutationCtx,
  session: SessionDoc,
  ticket: Doc<"tickets">,
): Promise<Reply> {
  const fu = followCopy(session);
  const comments = await latestComments(ctx, ticket._id);
  const body = formatConversation(ticket, comments, fu);
  await patchSession(ctx, session._id, {
    step: "follow_up_view",
    activeTicketId: ticket._id,
  });
  return followUpRespondMenu(ticket._id, body, fu);
}

async function askFollowUpReply(
  ctx: MutationCtx,
  session: SessionDoc,
  ticketId: Id<"tickets">,
  prompt: string,
): Promise<Reply> {
  await patchSession(ctx, session._id, {
    step: "follow_up_reply",
    activeTicketId: ticketId,
  });
  return { reply: prompt, kind: "menu", menu: {
    body: prompt,
    buttons: [{ id: "open_menu", title: followCopy(session).menuButton }],
  } };
}

async function saveFollowUpMessage(
  ctx: MutationCtx,
  session: SessionDoc,
  ticketId: Id<"tickets">,
  content: string,
  fileIds?: Id<"_storage">[],
): Promise<Reply> {
  const fu = followCopy(session);
  const saved = await saveWhatsAppCitizenComment(ctx, {
    phone: session.phone,
    ticketId,
    content,
    fileIds,
  });
  if (!saved) {
    return { reply: fu.none, kind: "text" };
  }
  await patchSession(ctx, session._id, {
    step: "follow_up_reply",
    activeTicketId: ticketId,
  });
  const body = fileIds?.length ? fu.fileReceived : fu.responseSent;
  const copy = sessionCopy(session);
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "leave_ticket", title: copy.exitTitle },
        { id: "open_menu", title: fu.menuButton },
      ],
    },
  };
}

function isFollowUpStep(step: SessionDoc["step"]): boolean {
  return (
    step === "follow_up_select" ||
    step === "ticket_select" ||
    step === "status_select" ||
    step === "follow_up_ticket" ||
    step === "follow_up_view" ||
    step === "follow_up_reply" ||
    step === "follow_up_attach"
  );
}

/** Free-text steps where "hello" should be saved as content, not reopen the prompt. */
function isFreeTextStep(step: SessionDoc["step"]): boolean {
  return (
    step === "awaiting_complaint" ||
    step === "follow_up_reply" ||
    step === "collect_incident_date" ||
    step === "ai_confirm" ||
    step === "ai_collect_missing"
  );
}

function priorDraftJsonForAi(session: SessionDoc): string {
  return JSON.stringify({
    state: session.draft.state ?? null,
    assignedMDA: session.draft.assignedMDA ?? null,
    incidentDate: session.draft.incidentDate
      ? formatIncidentDate(session.draft.incidentDate)
      : null,
    description: session.draft.description ?? null,
    title: session.draft.title ?? null,
    fullName: session.draft.fullName ?? null,
  });
}

async function nextReply(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  buttonId: string | undefined,
  storageId?: Id<"_storage">,
  mediaFilename?: string,
  mediaFailed?: boolean,
): Promise<Reply> {
  const normalized = text.toLowerCase();
  const replyId = buttonId ?? "";
  const copy = sessionCopy(session);
  const fu = followCopy(session);
  const ticketNumberInText = extractTicketNumber(text);
  const inFreeText = isFreeTextStep(session.step);

  const languageChoice = parseLanguageChoice(replyId || text);
  if (languageChoice && (replyId.startsWith("lang_") || session.step === "collect_language")) {
    return await setLanguage(ctx, session, languageChoice);
  }

  // Pasted ticket ID (e.g. REP-201026-008) → Check Complaint, even as first message.
  if (
    ticketNumberInText &&
    !replyId &&
    !inFreeText &&
    (session.step === "idle" ||
      session.step === "collect_language" ||
      session.step === "ticket_select" ||
      session.step === "status_select" ||
      session.step === "follow_up_select")
  ) {
    return await statusReply(ctx, session, text);
  }

  if (replyId === "change_language") {
    return await askLanguage(ctx, session);
  }

  // Phase 1: free-form complaint BEFORE language wall (incl. first message).
  // Also supports first-message media+caption (storageId kept for applyAiInbound).
  if (
    shouldAttemptAiExtract({
      step: session.step,
      language: session.language,
      text,
      buttonId: replyId || undefined,
      storageId,
      mediaFailed,
    })
  ) {
    // Stash first-message evidence on the draft before cloud runs extract.
    if (storageId) {
      const fileIds = [...(session.draft.fileIds ?? []), storageId];
      await patchSession(ctx, session._id, {
        draft: { ...session.draft, fileIds },
        lastInboundAt: Date.now(),
      });
    }
    return {
      reply: "",
      kind: "text",
      needsAiExtract: true,
      priorDraftJson: priorDraftJsonForAi(session),
      phoneHash: phoneHashForAi(session.phone),
      replyLanguage: guessLanguageHint(text, session.language),
    };
  }

  // Soft welcome for greetings / short first contact (no mandatory language wall).
  const isFirstContact =
    !session.language &&
    (session.step === "idle" || session.step === "collect_language") &&
    !replyId &&
    !storageId &&
    !ticketNumberInText;
  if (
    (!inFreeText && !replyId && isGreeting(normalized)) ||
    (isFirstContact && !looksLikeComplaintText(text))
  ) {
    await patchSession(ctx, session._id, {
      step: "idle",
      lastInboundAt: Date.now(),
    });
    return asReply(buildSoftWelcome(session.language));
  }

  // Explicit language picker only when user asked for it or is mid language step
  // with a non-complaint reply.
  if (session.step === "collect_language" && !looksLikeComplaintText(text)) {
    return await askLanguage(ctx, session);
  }

  if (normalized === "help" || replyId === "help") {
    await patchSession(ctx, session._id, { lastInboundAt: Date.now() });
    return { reply: copy.help, kind: "text" };
  }

  if (replyId === "leave_ticket") {
    return await showMenu(ctx, session);
  }
  if (replyId === "open_menu") {
    return await showMenu(ctx, session);
  }

  // --- AI free-form path controls ---
  if (replyId === "ai_start_over") {
    return await startComplaint(ctx, session);
  }
  if (replyId === "ai_confirm_yes" && session.step === "ai_confirm") {
    if (!draftReadyForConfirm(session.draft)) {
      const missing = nextMissingField(session.draft) ?? "description";
      await patchSession(ctx, session._id, {
        step: "ai_collect_missing",
        draft: {
          ...session.draft,
          aiMeta: { ...session.draft.aiMeta, awaitingField: missing },
        },
      });
      return asReply(buildAskMissing(session.language, missing, copy.exitTitle));
    }
    const fileIds = session.draft.fileIds ?? [];
    await patchSession(ctx, session._id, {
      step: "collect_evidence",
      draft: {
        ...session.draft,
        fileIds,
      },
    });
    return asReply(
      buildEvidenceAfterConfirm(session.language, fileIds.length > 0),
    );
  }
  if (replyId === "ai_confirm_edit" && session.step === "ai_confirm") {
    const prompt = aiCopy(session.language).editPrompt;
    return {
      reply: prompt,
      kind: "menu",
      menu: {
        body: prompt,
        buttons: [
          { id: "ai_start_over", title: aiCopy(session.language).startOverButton },
          { id: "open_menu", title: fu.menuButton },
        ],
      },
    };
  }

  // AI missing-field list picks
  if (replyId.startsWith("ai_zone_")) {
    const list = buildAiStateList(
      session.language,
      replyId.slice("ai_zone_".length),
      copy.exitTitle,
    );
    if (!list) {
      return asReply(buildAskMissing(session.language, "state", copy.exitTitle));
    }
    await patchSession(ctx, session._id, {
      step: "ai_collect_missing",
      draft: {
        ...session.draft,
        aiMeta: { ...session.draft.aiMeta, awaitingField: "state" },
      },
    });
    return asReply(list);
  }
  if (replyId.startsWith("ai_state:")) {
    const state = stateFromRowId(replyId.slice("ai_".length));
    if (!state) {
      return asReply(buildAskMissing(session.language, "state", copy.exitTitle));
    }
    const pending = [
      ...(session.draft.assignedMDA ? [] : ["assignedMDA"]),
      ...(session.draft.incidentDate != null ? [] : ["incidentDate"]),
      ...(session.draft.description &&
      session.draft.description.trim().length >= 10
        ? []
        : ["description"]),
    ];
    const draft = {
      ...session.draft,
      state,
      aiMeta: {
        ...session.draft.aiMeta,
        pendingFields: pending,
        awaitingField: pending[0],
      },
    };
    if (pending.length === 0) {
      await patchSession(ctx, session._id, { step: "ai_confirm", draft });
      return asReply(buildConfirmReply({ ...session, draft, step: "ai_confirm" }));
    }
    await patchSession(ctx, session._id, {
      step: "ai_collect_missing",
      draft,
    });
    return asReply(
      buildAskMissing(session.language, pending[0]!, copy.exitTitle),
    );
  }
  if (replyId.startsWith("ai_mda_")) {
    const mda = findMda(replyId.slice("ai_".length));
    if (!mda) {
      return asReply(
        buildAskMissing(session.language, "assignedMDA", copy.exitTitle),
      );
    }
    const pending = [
      ...(session.draft.state ? [] : ["state"]),
      ...(session.draft.incidentDate != null ? [] : ["incidentDate"]),
      ...(session.draft.description &&
      session.draft.description.trim().length >= 10
        ? []
        : ["description"]),
    ];
    const draft = {
      ...session.draft,
      assignedMDA: mda.name,
      aiMeta: {
        ...session.draft.aiMeta,
        pendingFields: pending,
        awaitingField: pending[0],
      },
    };
    if (pending.length === 0) {
      await patchSession(ctx, session._id, { step: "ai_confirm", draft });
      return asReply(buildConfirmReply({ ...session, draft, step: "ai_confirm" }));
    }
    await patchSession(ctx, session._id, {
      step: "ai_collect_missing",
      draft,
    });
    return asReply(
      buildAskMissing(session.language, pending[0]!, copy.exitTitle),
    );
  }

  if (isExitId(replyId) || isCancelCommand(normalized)) {
    if (isFollowUpStep(session.step)) {
      await leaveTicketAndSetStep(ctx, session, "idle");
      return menuReply(copy, fu.backToMenu, session.language);
    }
    return await exitFiling(ctx, session);
  }

  const selectedTicketId =
    parseStatusTicketRowId(replyId) ??
    parseTicketRowId(replyId) ??
    parseActionTicketId(replyId, "reply") ??
    parseActionTicketId(replyId, "attach") ??
    parseActionTicketId(replyId, "view") ??
    parseActionTicketId(replyId, "addinfo");
  if (selectedTicketId) {
    const ticket = await ownedTicket(ctx, session, selectedTicketId);
    if (!ticket) {
      return await startTicketPicker(ctx, session);
    }
    if (replyId.startsWith("view:")) {
      return await showConversation(ctx, session, ticket);
    }
    if (replyId.startsWith("addinfo:")) {
      return await askFollowUpReply(ctx, session, ticket._id, fu.typeMore);
    }
    if (replyId.startsWith("reply:")) {
      return await askFollowUpReply(ctx, session, ticket._id, fu.typeResponse);
    }
    if (replyId.startsWith("attach:")) {
      return await askFollowUpReply(ctx, session, ticket._id, fu.typeResponse);
    }
    // Check Complaint + Follow Up share one picker → same ticket summary.
    return await followUpSummary(ctx, session, ticket);
  }

  if (
    replyId === "follow_up" ||
    replyId === "check_status" ||
    normalized === "follow up" ||
    normalized === "followup"
  ) {
    return await startTicketPicker(ctx, session);
  }
  if (replyId === "submit_filing" && session.step === "collect_evidence") {
    return await finishComplaint(ctx, session);
  }
  // Legacy Attach button — same as "send a file directly" hint; keep Submit/Exit.
  if (replyId === "attach_evidence" && session.step === "collect_evidence") {
    return await evidenceMenu(
      copy,
      (session.draft.fileIds?.length ?? 0) > 0,
    );
  }
  if (replyId === "submit_complaint") {
    return await startComplaint(ctx, session);
  }

  if (mediaFailed) {
    if (
      session.step === "follow_up_attach" ||
      session.step === "follow_up_reply" ||
      session.step === "collect_evidence"
    ) {
      return { reply: fu.fileFailed, kind: "text" };
    }
    return { reply: fu.attachFirst, kind: "text" };
  }

  // Media alone on intake → keep the file, ask for a short text complaint.
  if (
    storageId &&
    !text &&
    session.step !== "collect_evidence" &&
    session.step !== "follow_up_attach" &&
    session.step !== "follow_up_reply" &&
    session.step !== "follow_up_view" &&
    session.step !== "follow_up_ticket"
  ) {
    const fileIds = [...(session.draft.fileIds ?? []), storageId];
    await patchSession(ctx, session._id, {
      step: "idle",
      draft: { ...session.draft, fileIds },
    });
    return asReply(buildNeedTextForMedia(session.language));
  }

  // Evidence stage: accept files directly (no Attach button required).
  if (storageId && session.step === "collect_evidence") {
    const fileIds = [...(session.draft.fileIds ?? []), storageId];
    await patchSession(ctx, session._id, {
      step: "collect_evidence",
      draft: { ...session.draft, fileIds },
    });
    return await evidenceMenu(copy, true);
  }

  if (storageId) {
    const ticketId = session.activeTicketId;
    const canAttach =
      ticketId &&
      (session.step === "follow_up_attach" ||
        session.step === "follow_up_reply" ||
        session.step === "follow_up_view" ||
        session.step === "follow_up_ticket");
    if (!canAttach || !ticketId) {
      return { reply: fu.attachFirst, kind: "text" };
    }
    const label = mediaFilename
      ? `📎 ${mediaFilename}`
      : "📎 Supporting document";
    const content = text ? `${text}\n${label}` : label;
    return await saveFollowUpMessage(ctx, session, ticketId, content, [storageId]);
  }

  if (session.step === "follow_up_reply" && text && session.activeTicketId) {
    return await saveFollowUpMessage(ctx, session, session.activeTicketId, text);
  }
  if (session.step === "follow_up_attach") {
    return { reply: fu.sendFile, kind: "text" };
  }
  if (
    session.step === "follow_up_select" ||
    session.step === "status_select" ||
    session.step === "ticket_select"
  ) {
    return await startTicketPicker(ctx, session);
  }
  if (session.step === "follow_up_ticket" && session.activeTicketId) {
    const ticket = await ownedTicket(ctx, session, session.activeTicketId);
    if (ticket) return await followUpSummary(ctx, session, ticket);
    return await startFollowUp(ctx, session);
  }
  if (session.step === "follow_up_view" && session.activeTicketId) {
    const ticket = await ownedTicket(ctx, session, session.activeTicketId);
    if (ticket) return await showConversation(ctx, session, ticket);
    return await startFollowUp(ctx, session);
  }

  if (replyId.startsWith("zone_")) {
    const list = stateList(copy, replyId);
    if (!list) {
      await patchSession(ctx, session._id, { step: "collect_zone" });
      return zoneList(copy);
    }
    await patchSession(ctx, session._id, {
      step: "collect_state",
      draft: { ...session.draft, zone: replyId },
    });
    return list;
  }

  if (replyId.startsWith("state:")) {
    const state = stateFromRowId(replyId);
    if (!state) {
      await patchSession(ctx, session._id, { step: "collect_zone" });
      return zoneList(copy);
    }
    await patchSession(ctx, session._id, {
      step: "collect_mda",
      draft: { ...session.draft, state },
    });
    return mdaList(copy);
  }

  if (replyId.startsWith("mda_")) {
    const mda = findMda(replyId);
    if (!mda) {
      await patchSession(ctx, session._id, { step: "collect_mda" });
      return mdaList(copy);
    }
    return await askDate(ctx, session, mda.name);
  }

  if (session.step === "collect_zone") {
    return zoneList(copy);
  }

  if (session.step === "collect_state") {
    const state = matchState(text);
    if (state) {
      await patchSession(ctx, session._id, {
        step: "collect_mda",
        draft: { ...session.draft, state },
      });
      return mdaList(copy);
    }
    const zoneId = session.draft.zone;
    return (zoneId ? stateList(copy, zoneId) : zoneList(copy)) ?? zoneList(copy);
  }

  if (session.step === "collect_mda") {
    const mda = findMda(text);
    if (mda) {
      return await askDate(ctx, session, mda.name);
    }
    return mdaList(copy);
  }

  if (session.step === "collect_incident_date") {
    const incidentDate = parseIncidentDate(text);
    if (incidentDate === null) {
      return {
        reply: copy.dateInvalid,
        kind: "menu",
        menu: {
          body: copy.dateInvalid,
          buttons: [{ id: "exit_complaint", title: copy.exitTitle }],
        },
      };
    }
    await patchSession(ctx, session._id, {
      step: "awaiting_complaint",
      draft: { ...session.draft, incidentDate },
    });
    return {
      reply: copy.complaintPrompt,
      kind: "menu",
      menu: {
        body: copy.complaintPrompt,
        buttons: [{ id: "exit_complaint", title: copy.exitTitle }],
      },
    };
  }

  if (session.step === "awaiting_complaint" && text) {
    return await askEvidence(ctx, session, text);
  }

  if (session.step === "collect_evidence") {
    if (normalized === "submit") {
      return await finishComplaint(ctx, session);
    }
    return await evidenceMenu(
      copy,
      (session.draft.fileIds?.length ?? 0) > 0,
      fu.menuButton,
    );
  }

  // AI missing-field free-text answers
  if (session.step === "ai_collect_missing" && text) {
    const awaiting =
      session.draft.aiMeta?.awaitingField ??
      nextMissingField(session.draft) ??
      "description";
    if (awaiting === "state") {
      const state = matchState(text);
      if (!state) {
        return asReply(buildAskMissing(session.language, "state", copy.exitTitle));
      }
      const result = fillMissingFromUserText(session.draft, "state", state);
      const draft = result.ok ? result.draft : { ...session.draft, state };
      if (draftReadyForConfirm(draft)) {
        await patchSession(ctx, session._id, { step: "ai_confirm", draft });
        return asReply(
          buildConfirmReply({ ...session, draft, step: "ai_confirm" }),
        );
      }
      const missing = nextMissingField(draft) ?? "description";
      await patchSession(ctx, session._id, {
        step: "ai_collect_missing",
        draft: {
          ...draft,
          aiMeta: { ...draft.aiMeta, awaitingField: missing },
        },
      });
      return asReply(buildAskMissing(session.language, missing, copy.exitTitle));
    }
    const filled = fillMissingFromUserText(session.draft, awaiting, text);
    if (!filled.ok) {
      return asReply(
        buildAskMissing(session.language, awaiting, copy.exitTitle),
      );
    }
    if (draftReadyForConfirm(filled.draft)) {
      await patchSession(ctx, session._id, {
        step: "ai_confirm",
        draft: filled.draft,
      });
      return asReply(
        buildConfirmReply({
          ...session,
          draft: filled.draft,
          step: "ai_confirm",
        }),
      );
    }
    const missing = nextMissingField(filled.draft) ?? "description";
    await patchSession(ctx, session._id, {
      step: "ai_collect_missing",
      draft: {
        ...filled.draft,
        aiMeta: { ...filled.draft.aiMeta, awaitingField: missing },
      },
    });
    return asReply(buildAskMissing(session.language, missing, copy.exitTitle));
  }

  if (wantsComplaint(normalized)) {
    return await startComplaint(ctx, session);
  }

  // Idle → soft smart menu (type complaint anytime).
  if (session.step === "idle") {
    return await showMenu(ctx, session);
  }

  return {
    reply: copy.help,
    kind: "text",
  };
}

const validatedFieldValidator = v.object({
  value: v.union(v.string(), v.null()),
  confidence: v.number(),
  status: v.union(
    v.literal("accepted"),
    v.literal("verify"),
    v.literal("missing"),
  ),
  raw: v.optional(v.union(v.string(), v.null())),
});

const validatedDateFieldValidator = v.object({
  value: v.union(v.number(), v.null()),
  confidence: v.number(),
  status: v.union(
    v.literal("accepted"),
    v.literal("verify"),
    v.literal("missing"),
  ),
  raw: v.optional(v.union(v.string(), v.null())),
});

/**
 * Apply Gemini extraction result to the session and return the next WhatsApp reply.
 * Records inbound idempotency for messageSid.
 */
export const applyAiInbound = internalMutation({
  args: {
    phone: v.string(),
    messageSid: v.string(),
    sourceText: v.string(),
    extractOk: v.boolean(),
    timedOut: v.boolean(),
    extractError: v.optional(v.string()),
    validated: v.optional(
      v.object({
        intent: v.string(),
        language: v.union(v.string(), v.null()),
        state: validatedFieldValidator,
        assignedMDA: validatedFieldValidator,
        incidentDate: validatedDateFieldValidator,
        description: validatedFieldValidator,
        title: validatedFieldValidator,
        fullName: validatedFieldValidator,
        overallConfidence: v.number(),
        needsReview: v.boolean(),
        reviewReasons: v.array(v.string()),
        pendingFields: v.array(v.string()),
        verifyFields: v.array(v.string()),
        outOfScopeAgency: v.union(v.string(), v.null()),
        notes: v.union(v.string(), v.null()),
        incidentDateLabel: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    reply: v.string(),
    kind: v.union(v.literal("menu"), v.literal("text"), v.literal("list")),
    list: v.optional(listValidator),
    menu: v.optional(menuValidator),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingSid = await ctx.db
      .query("whatsapp_inbound_messages")
      .withIndex("byMessageSid", (q) => q.eq("messageSid", args.messageSid))
      .first();
    if (existingSid) {
      return {
        reply: existingSid.reply,
        kind: "text" as const,
        duplicate: true,
      };
    }

    const now = Date.now();
    let session = await ctx.db
      .query("whatsapp_sessions")
      .withIndex("byPhone", (q) => q.eq("phone", args.phone))
      .first();
    if (!session) {
      const sessionId = await ctx.db.insert("whatsapp_sessions", {
        phone: args.phone,
        step: "idle",
        draft: {},
        lastInboundAt: now,
        updatedAt: now,
      });
      session = await ctx.db.get(sessionId);
    }
    if (!session) {
      throw new Error("Failed to create WhatsApp session");
    }

    const result = await handleAiExtractResult(ctx, session, args);

    await ctx.db.insert("whatsapp_inbound_messages", {
      messageSid: args.messageSid,
      phone: args.phone,
      reply: result.reply,
      createdAt: now,
    });

    return {
      reply: result.reply,
      kind: result.kind,
      list: result.list,
      menu: result.menu,
      duplicate: false,
    };
  },
});

async function handleAiExtractResult(
  ctx: MutationCtx,
  session: SessionDoc,
  args: {
    sourceText: string;
    extractOk: boolean;
    timedOut: boolean;
    extractError?: string;
    validated?: {
      intent: string;
      language: string | null;
      state: ValidatedExtraction["state"];
      assignedMDA: ValidatedExtraction["assignedMDA"];
      incidentDate: ValidatedExtraction["incidentDate"];
      description: ValidatedExtraction["description"];
      title: ValidatedExtraction["title"];
      fullName: ValidatedExtraction["fullName"];
      overallConfidence: number;
      needsReview: boolean;
      reviewReasons: string[];
      pendingFields: string[];
      verifyFields: string[];
      outOfScopeAgency: string | null;
      notes: string | null;
      incidentDateLabel: string | null;
    };
  },
): Promise<Reply> {
  // Always follow the citizen's language from this message (Hausa in → Hausa out).
  const detectedLang = args.validated?.language
    ? resolveSessionLanguage(args.validated.language)
    : guessLanguageHint(args.sourceText, session.language);
  const lang = detectedLang;
  const sessionForReply: SessionDoc = { ...session, language: lang };
  const copy = sessionCopy(sessionForReply);
  const aic = aiCopy(lang);

  if (
    shouldFallbackToClassic({
      ok: args.extractOk,
      timedOut: args.timedOut,
      overallConfidence: args.validated?.overallConfidence,
      pendingCount: args.validated?.pendingFields.length,
      intent: args.validated?.intent,
    })
  ) {
    await patchSession(ctx, session._id, {
      step: "collect_zone",
      language: lang,
      draft: {},
    });
    const zone = zoneList(copy);
    return {
      ...zone,
      reply: `${aic.fallbackClassic}\n\n${zone.reply}`,
      list: zone.list
        ? { ...zone.list, body: `${aic.fallbackClassic}\n\n${zone.list.body}` }
        : zone.list,
    };
  }

  const validated = args.validated;
  if (!validated) {
    await patchSession(ctx, session._id, { language: lang });
    return await startComplaint(ctx, { ...session, language: lang });
  }

  if (validated.intent === "abusive") {
    await patchSession(ctx, session._id, {
      step: "idle",
      language: lang,
      draft: {},
    });
    return asReply(buildAbusiveReply(lang));
  }

  if (
    validated.intent === "out_of_scope" ||
    (validated.outOfScopeAgency && !validated.assignedMDA.value)
  ) {
    await patchSession(ctx, session._id, {
      step: "idle",
      language: lang,
      draft: {},
    });
    return asReply(buildOutOfScopeReply(lang, validated.outOfScopeAgency));
  }

  if (validated.intent === "check_status") {
    if (!session.language) {
      await patchSession(ctx, session._id, { language: lang });
    }
    return await statusReply(ctx, { ...session, language: lang }, args.sourceText);
  }
  if (validated.intent === "follow_up") {
    if (!session.language) {
      await patchSession(ctx, session._id, { language: lang });
    }
    return await startFollowUp(ctx, { ...session, language: lang });
  }

  if (validated.intent === "other" && validated.pendingFields.length >= 4) {
    await patchSession(ctx, session._id, {
      step: "collect_zone",
      language: lang,
      draft: {},
    });
    const zone = zoneList(copy);
    return {
      ...zone,
      reply: `${aic.fallbackClassic}\n\n${zone.reply}`,
      list: zone.list
        ? { ...zone.list, body: `${aic.fallbackClassic}\n\n${zone.list.body}` }
        : zone.list,
    };
  }

  const asValidated: ValidatedExtraction = {
    intent: validated.intent as ValidatedExtraction["intent"],
    language: validated.language,
    state: validated.state,
    assignedMDA: validated.assignedMDA,
    incidentDate: validated.incidentDate,
    description: validated.description,
    title: validated.title,
    fullName: validated.fullName,
    overallConfidence: validated.overallConfidence,
    needsReview: validated.needsReview,
    reviewReasons: validated.reviewReasons,
    pendingFields: validated.pendingFields as ValidatedExtraction["pendingFields"],
    verifyFields: validated.verifyFields as ValidatedExtraction["verifyFields"],
    outOfScopeAgency: validated.outOfScopeAgency,
    notes: validated.notes,
    incidentDateLabel: validated.incidentDateLabel,
  };

  const draft = applyValidatedToDraft(
    session.draft,
    asValidated,
    args.sourceText,
  );

  if (draftReadyForConfirm(draft)) {
    await patchSession(ctx, session._id, {
      step: "ai_confirm",
      language: lang,
      draft,
    });
    return asReply(
      buildConfirmReply({
        ...sessionForReply,
        draft,
        step: "ai_confirm",
        language: lang,
      }),
    );
  }

  const missing = nextMissingField(draft) ?? "description";
  await patchSession(ctx, session._id, {
    step: "ai_collect_missing",
    language: lang,
    draft: {
      ...draft,
      aiMeta: { ...draft.aiMeta, awaitingField: missing },
    },
  });
  return asReply(buildAskMissing(lang, missing, copy.exitTitle));
}

import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
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
type Reply = { reply: string; kind: ReplyKind; list?: ListSpec; menu?: MenuSpec };
type Copy = ReturnType<typeof copyFor>;
type FollowCopy = ReturnType<typeof followUpCopy>;

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

function menuReply(copy: Copy, body?: string): Reply {
  const text = body ?? copy.menuBody;
  return {
    reply: text,
    kind: "menu",
    menu: {
      body: text,
      buttons: [
        { id: "submit_complaint", title: copy.menuSubmit },
        { id: "check_status", title: copy.menuStatus },
        { id: "follow_up", title: copy.menuFollowUp },
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
  return menuReply(sessionCopy(session));
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
  return menuReply(copyFor(language));
}

async function exitFiling(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
  const copy = sessionCopy(session);
  await leaveTicketAndSetStep(ctx, session, "idle");
  return menuReply(copy, copy.exited);
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
  const prompt = sessionCopy(session).datePrompt;
  return {
    reply: prompt,
    kind: "menu",
    menu: {
      body: prompt,
      buttons: [{ id: "open_menu", title: followCopy(session).menuButton }],
    },
  };
}

async function evidenceMenu(
  copy: Copy,
  received: boolean,
  menuTitle: string,
): Promise<Reply> {
  const body = received ? copy.evidenceReceived : copy.evidencePrompt;
  return {
    reply: body,
    kind: "menu",
    menu: {
      body,
      buttons: [
        { id: "attach_evidence", title: copy.attachEvidence },
        { id: "submit_filing", title: copy.submitFiling },
        { id: "open_menu", title: menuTitle },
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

  const created = await createTicketRecord(ctx, {
    title: WHATSAPP_DEFAULT_TITLE,
    description,
    assignedMDA,
    fullName: "WhatsApp Citizen",
    email: guestEmailForPhone(session.phone),
    phoneNumber: toNigeriaLocalPhone(session.phone),
    incidentDate,
    location: state,
    state,
    address: "",
    supportingDocuments: session.draft.fileIds ?? [],
    source: "whatsapp",
    whatsappPhone: session.phone,
  });

  await patchSession(ctx, session._id, {
    step: "idle",
    draft: { ...session.draft, description },
    activeTicketId: created.ticketId,
  });

  return {
    reply: copy.submittedCloud(
      created.ticketNumber,
      WHATSAPP_DEFAULT_TITLE,
      state,
      assignedMDA,
      formatIncidentDate(incidentDate),
    ),
    kind: "text",
  };
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
    return { reply: await formatTicketStatus(ctx, ticket, copy), kind: "text" };
  }

  const tickets = await ctx.db
    .query("tickets")
    .withIndex("byWhatsappPhone", (q) => q.eq("whatsappPhone", session.phone))
    .order("desc")
    .take(5);

  if (tickets.length === 0) {
    return {
      reply: copy.noTicketsCloud,
      kind: "text",
    };
  }

  const lines = await Promise.all(
    tickets.map(async (ticket) => {
      const mda = ticket.assignedMDA
        ? await ctx.db.get(ticket.assignedMDA)
        : null;
      return `• ${ticket.ticketNumber} — ${ticket.status.replace("_", " ")} — ${mda?.name ?? copy.unassigned}`;
    }),
  );
  return {
    reply: [
      copy.recentTickets,
      ...lines,
      "",
      copy.sendTicketNumberCloud,
    ].join("\n"),
    kind: "text",
  };
}

async function formatTicketStatus(
  ctx: MutationCtx,
  ticket: Doc<"tickets">,
  copy: Copy,
): Promise<string> {
  const mda = ticket.assignedMDA ? await ctx.db.get(ticket.assignedMDA) : null;
  const lines = [
    ticket.ticketNumber,
    `${copy.statusLabel}: ${ticket.status.replace("_", " ")}`,
    `${copy.titleLabel}: ${ticket.title}`,
    `${copy.mdaLabel}: ${mda?.name ?? copy.unassigned}`,
  ];
  if (ticket.resolutionNote) {
    lines.push(`${copy.resolutionLabel}: ${ticket.resolutionNote}`);
  }
  return lines.join("\n");
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

async function startFollowUp(
  ctx: MutationCtx,
  session: SessionDoc,
): Promise<Reply> {
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
    step: "follow_up_select",
  });
  return {
    reply: fu.listBody,
    kind: "list",
    list: {
      button: fu.listButton,
      body: fu.listBody,
      sections: [
        {
          title: fu.listButton,
          rows: [
            ...tickets.map((ticket) => ({
              id: ticketRowId(ticket._id),
              title: ticket.ticketNumber,
              description: statusLabel(fu, ticket.status),
            })),
            { id: "open_menu", title: fu.menuButton },
          ],
        },
      ],
    },
  };
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
    step === "follow_up_ticket" ||
    step === "follow_up_view" ||
    step === "follow_up_reply" ||
    step === "follow_up_attach"
  );
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

  const languageChoice = parseLanguageChoice(replyId || text);
  if (languageChoice && (replyId.startsWith("lang_") || session.step === "collect_language")) {
    return await setLanguage(ctx, session, languageChoice);
  }

  if (
    (session.step === "idle" || session.step === "collect_language") &&
    isGreeting(normalized)
  ) {
    return await askLanguage(ctx, session);
  }

  if (session.step === "collect_language") {
    return languagePicker();
  }

  if (normalized === "help" || replyId === "help") {
    await patchSession(ctx, session._id, { lastInboundAt: Date.now() });
    return { reply: copy.help, kind: "text" };
  }

  if (replyId === "leave_ticket") {
    return await showMenu(ctx, session);
  }
  if (replyId === "open_menu") {
    return await askLanguage(ctx, session);
  }

  if (isExitId(replyId) || isCancelCommand(normalized)) {
    if (isFollowUpStep(session.step)) {
      await leaveTicketAndSetStep(ctx, session, "idle");
      return menuReply(copy, fu.backToMenu);
    }
    return await exitFiling(ctx, session);
  }

  const selectedTicketId =
    parseTicketRowId(replyId) ??
    parseActionTicketId(replyId, "reply") ??
    parseActionTicketId(replyId, "attach") ??
    parseActionTicketId(replyId, "view") ??
    parseActionTicketId(replyId, "addinfo");
  if (selectedTicketId) {
    const ticket = await ownedTicket(ctx, session, selectedTicketId);
    if (!ticket) {
      return await startFollowUp(ctx, session);
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
    return await followUpSummary(ctx, session, ticket);
  }

  if (replyId === "follow_up" || normalized === "follow up" || normalized === "followup") {
    return await startFollowUp(ctx, session);
  }
  if (replyId === "check_status") {
    return await statusReply(ctx, session, text);
  }
  if (replyId === "submit_filing" && session.step === "collect_evidence") {
    return await finishComplaint(ctx, session);
  }
  if (replyId === "attach_evidence" && session.step === "collect_evidence") {
    return {
      reply: copy.sendEvidenceFile,
      kind: "menu",
      menu: {
        body: copy.sendEvidenceFile,
        buttons: [
          { id: "submit_filing", title: copy.submitFiling },
          { id: "open_menu", title: fu.menuButton },
        ],
      },
    };
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

  if (storageId && session.step === "collect_evidence") {
    const fileIds = [...(session.draft.fileIds ?? []), storageId];
    await patchSession(ctx, session._id, {
      step: "collect_evidence",
      draft: { ...session.draft, fileIds },
    });
    return await evidenceMenu(copy, true, fu.menuButton);
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
  if (session.step === "follow_up_select") {
    return await startFollowUp(ctx, session);
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

  if (extractTicketNumber(text) && session.step === "idle") {
    return await statusReply(ctx, session, text);
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
          buttons: [{ id: "open_menu", title: fu.menuButton }],
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
        buttons: [{ id: "open_menu", title: fu.menuButton }],
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

  if (wantsComplaint(normalized)) {
    return await startComplaint(ctx, session);
  }
  if (isGreeting(normalized)) {
    return await askLanguage(ctx, session);
  }

  return await showMenu(ctx, session);
}

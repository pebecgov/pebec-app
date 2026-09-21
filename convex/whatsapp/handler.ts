import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { createTicketRecord } from "../tickets";
import {
  guestEmailForPhone,
  matchState,
  toNigeriaLocalPhone,
} from "./constants";
import {
  copyFor,
  isCancelCommand,
  isGreeting,
  parseLanguageChoice,
  type WhatsAppLang,
} from "./i18n";
import type { Doc, Id } from "../_generated/dataModel";

type SessionDoc = Doc<"whatsapp_sessions">;
type Copy = ReturnType<typeof copyFor>;

function sessionCopy(session: SessionDoc): Copy {
  return copyFor(session.language);
}

function isCommand(normalized: string, command: string): boolean {
  return normalized === command;
}

function extractTicketNumber(text: string): string | null {
  const match = text.toUpperCase().match(/REP-\d{6}-\d{3}/);
  return match ? match[0] : null;
}

function searchMdas(mdas: Doc<"mdas">[], input: string): string[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];
  const scored = mdas
    .map((mda) => {
      const name = mda.name.toLowerCase();
      if (name === needle) return { name: mda.name, score: 3 };
      if (name.startsWith(needle)) return { name: mda.name, score: 2 };
      if (name.includes(needle)) return { name: mda.name, score: 1 };
      return null;
    })
    .filter((row): row is { name: string; score: number } => row !== null)
    .sort((a, b) => b.score - a.score);
  const unique = [...new Set(scored.map((row) => row.name))];
  return unique.slice(0, 5);
}

function formatMdaChoices(matches: string[]): string {
  return matches.map((name, index) => `${index + 1}. ${name}`).join("\n");
}

export const processInbound = internalMutation({
  args: {
    phone: v.string(),
    body: v.string(),
    messageSid: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existingSid = await ctx.db
      .query("whatsapp_inbound_messages")
      .withIndex("byMessageSid", (q) => q.eq("messageSid", args.messageSid))
      .first();
    if (existingSid) {
      return existingSid.reply;
    }

    const text = args.body.trim();
    const normalized = text.toLowerCase();
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

    const reply = await handleMessage(ctx, session, text, normalized, now);

    await ctx.db.insert("whatsapp_inbound_messages", {
      messageSid: args.messageSid,
      phone: args.phone,
      reply,
      createdAt: now,
    });

    return reply;
  },
});

async function patchSession(
  ctx: MutationCtx,
  sessionId: Id<"whatsapp_sessions">,
  value: Partial<Doc<"whatsapp_sessions">>,
) {
  await ctx.db.patch(sessionId, {
    ...value,
    updatedAt: Date.now(),
    lastInboundAt: Date.now(),
  });
}

async function setLanguage(
  ctx: MutationCtx,
  session: SessionDoc,
  language: WhatsAppLang,
  now: number,
): Promise<string> {
  await patchSession(ctx, session._id, {
    step: "idle",
    language,
    lastInboundAt: now,
  });
  return copyFor(language).welcome;
}

async function handleMessage(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  normalized: string,
  now: number,
): Promise<string> {
  const copy = sessionCopy(session);

  if (!text) {
    return copy.emptyText;
  }

  if (isCommand(normalized, "help")) {
    await patchSession(ctx, session._id, { lastInboundAt: now });
    return copy.helpLong;
  }

  const languageChoice = parseLanguageChoice(text);
  if (languageChoice && session.step === "collect_language") {
    return await setLanguage(ctx, session, languageChoice, now);
  }

  if (
    (session.step === "idle" || session.step === "collect_language") &&
    (isGreeting(normalized) || isCommand(normalized, "menu"))
  ) {
    await patchSession(ctx, session._id, {
      step: "collect_language",
      lastInboundAt: now,
    });
    return copyFor("en").languageListBody;
  }

  if (session.step === "collect_language") {
    return copyFor("en").languageListBody;
  }

  if (isCancelCommand(normalized)) {
    await patchSession(ctx, session._id, {
      step: "idle",
      draft: {},
    });
    return copy.cancelled + "\n\n" + copy.welcome;
  }

  if (normalized === "status" || normalized.startsWith("status ")) {
    return await statusReply(ctx, session, text);
  }

  if (
    isCommand(normalized, "new") ||
    (session.step === "idle" &&
      (isCommand(normalized, "1") || normalized.includes("complaint")))
  ) {
    await patchSession(ctx, session._id, {
      step: "collect_name",
      draft: {},
    });
    return copy.askName;
  }

  if (session.step === "idle" && isCommand(normalized, "2")) {
    return await statusReply(ctx, session, text);
  }

  switch (session.step) {
    case "idle":
      return copy.welcome;
    case "collect_name":
      return await collectName(ctx, session, text, copy);
    case "collect_state":
      return await collectState(ctx, session, text, copy);
    case "collect_mda":
      return await collectMda(ctx, session, text, copy);
    case "confirm_mda":
      return await confirmMda(ctx, session, text, normalized, copy);
    case "collect_title":
      return await collectTitle(ctx, session, text, copy);
    case "collect_description":
      return await collectDescription(ctx, session, text, copy);
    case "awaiting_complaint":
    case "collect_zone":
    case "collect_incident_date":
      return copy.welcome;
    default:
      return copy.welcome;
  }
}

async function collectName(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  copy: Copy,
): Promise<string> {
  if (text.length < 2) {
    return copy.nameTooShort;
  }
  await patchSession(ctx, session._id, {
    step: "collect_state",
    draft: { ...session.draft, fullName: text },
  });
  return copy.askState;
}

async function collectState(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  copy: Copy,
): Promise<string> {
  const state = matchState(text);
  if (!state) {
    return copy.stateInvalid;
  }
  await patchSession(ctx, session._id, {
    step: "collect_mda",
    draft: { ...session.draft, state },
  });
  return copy.askMda;
}

async function collectMda(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  copy: Copy,
): Promise<string> {
  const mdas = await ctx.db.query("mdas").take(500);
  const matches = searchMdas(mdas, text);
  if (matches.length === 0) {
    return copy.mdaNone;
  }
  if (matches.length === 1) {
    await patchSession(ctx, session._id, {
      step: "confirm_mda",
      draft: {
        ...session.draft,
        assignedMDA: matches[0],
        mdaMatches: matches,
      },
    });
    return copy.confirmMda(matches[0] ?? "");
  }
  await patchSession(ctx, session._id, {
    step: "confirm_mda",
    draft: {
      ...session.draft,
      assignedMDA: undefined,
      mdaMatches: matches,
    },
  });
  return copy.chooseMda(formatMdaChoices(matches));
}

async function confirmMda(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  normalized: string,
  copy: Copy,
): Promise<string> {
  const matches = session.draft.mdaMatches ?? [];
  const index = Number.parseInt(normalized, 10);
  let chosen: string | undefined;
  if (
    (normalized === "yes" ||
      normalized === "y" ||
      normalized === "1" ||
      normalized === "ee" ||
      normalized === "ehn" ||
      normalized === "beeni" ||
      normalized === "bẹẹni") &&
    session.draft.assignedMDA
  ) {
    chosen = session.draft.assignedMDA;
  } else if (!Number.isNaN(index) && index >= 1 && index <= matches.length) {
    chosen = matches[index - 1];
  }

  if (!chosen) {
    return await collectMda(ctx, session, text, copy);
  }

  await patchSession(ctx, session._id, {
    step: "collect_title",
    draft: {
      ...session.draft,
      assignedMDA: chosen,
      mdaMatches: undefined,
    },
  });
  return copy.mdaChosenTitle(chosen);
}

async function collectTitle(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  copy: Copy,
): Promise<string> {
  if (text.length < 3) {
    return copy.titleTooShort;
  }
  await patchSession(ctx, session._id, {
    step: "collect_description",
    draft: { ...session.draft, title: text },
  });
  return copy.askDescription;
}

async function collectDescription(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  copy: Copy,
): Promise<string> {
  if (text.length < 10) {
    return copy.descriptionTooShort;
  }
  const fullName = session.draft.fullName?.trim();
  const state = session.draft.state;
  const assignedMDA = session.draft.assignedMDA;
  const title = session.draft.title?.trim();
  if (!fullName || !state || !assignedMDA || !title) {
    await patchSession(ctx, session._id, { step: "idle", draft: {} });
    return copy.missingDraft;
  }

  const created = await createTicketRecord(ctx, {
    title,
    description: text,
    assignedMDA,
    fullName,
    email: guestEmailForPhone(session.phone),
    phoneNumber: toNigeriaLocalPhone(session.phone),
    incidentDate: Date.now(),
    location: state,
    state,
    address: "",
    source: "whatsapp",
    whatsappPhone: session.phone,
  });

  await patchSession(ctx, session._id, {
    step: "idle",
    draft: {},
    activeTicketId: created.ticketId,
  });

  return copy.submitted(created.ticketNumber, assignedMDA);
}

async function statusReply(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  const copy = sessionCopy(session);
  const ticketNumber = extractTicketNumber(text);
  if (ticketNumber) {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("byTicketNumber", (q) => q.eq("ticketNumber", ticketNumber))
      .first();
    if (!ticket || ticket.whatsappPhone !== session.phone) {
      return copy.statusNotFound;
    }
    return formatTicketStatus(ctx, ticket, copy);
  }

  const tickets = await ctx.db
    .query("tickets")
    .withIndex("byWhatsappPhone", (q) => q.eq("whatsappPhone", session.phone))
    .order("desc")
    .take(5);

  if (tickets.length === 0) {
    return copy.noTickets;
  }

  const lines = await Promise.all(
    tickets.map(async (ticket) => {
      const mda = ticket.assignedMDA
        ? await ctx.db.get(ticket.assignedMDA)
        : null;
      return `• ${ticket.ticketNumber} — ${ticket.status.replace("_", " ")} — ${mda?.name ?? copy.unassigned}`;
    }),
  );
  return [copy.recentTickets, ...lines, "", copy.sendTicketNumber].join("\n");
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
    `${copy.mdaLabel}: ${mda?.name ?? copy.unassigned}`,
    `${copy.titleLabel}: ${ticket.title}`,
  ];
  if (ticket.resolutionNote) {
    lines.push(`${copy.resolutionLabel}: ${ticket.resolutionNote}`);
  }
  return lines.join("\n");
}

import { internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { createTicketRecord } from "../tickets";
import {
  guestEmailForPhone,
  HELP_MESSAGE,
  matchState,
  toNigeriaLocalPhone,
  WELCOME_MESSAGE,
} from "./constants";
import type { Doc, Id } from "../_generated/dataModel";

type SessionDoc = Doc<"whatsapp_sessions">;

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

async function handleMessage(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  normalized: string,
  now: number,
): Promise<string> {
  if (!text) {
    return "Please send a text message. File a complaint with NEW, or send STATUS.";
  }

  if (isCommand(normalized, "help")) {
    await patchSession(ctx, session._id, { lastInboundAt: now });
    return HELP_MESSAGE;
  }

  if (
    session.step === "idle" &&
    (isCommand(normalized, "menu") ||
      isCommand(normalized, "hi") ||
      isCommand(normalized, "hello") ||
      isCommand(normalized, "start"))
  ) {
    await patchSession(ctx, session._id, { lastInboundAt: now });
    return WELCOME_MESSAGE;
  }

  if (isCommand(normalized, "cancel")) {
    await patchSession(ctx, session._id, {
      step: "idle",
      draft: {},
    });
    return "Draft cancelled.\n\n" + WELCOME_MESSAGE;
  }

  if (normalized === "status" || normalized.startsWith("status ")) {
    return await statusReply(ctx, session.phone, text);
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
    return "What is your full name?";
  }

  if (session.step === "idle" && isCommand(normalized, "2")) {
    return await statusReply(ctx, session.phone, text);
  }

  switch (session.step) {
    case "idle":
      return WELCOME_MESSAGE;
    case "collect_name":
      return await collectName(ctx, session, text);
    case "collect_state":
      return await collectState(ctx, session, text);
    case "collect_mda":
      return await collectMda(ctx, session, text);
    case "confirm_mda":
      return await confirmMda(ctx, session, text, normalized);
    case "collect_title":
      return await collectTitle(ctx, session, text);
    case "collect_description":
      return await collectDescription(ctx, session, text);
    default:
      return WELCOME_MESSAGE;
  }
}

async function collectName(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  if (text.length < 2) {
    return "Please send your full name.";
  }
  await patchSession(ctx, session._id, {
    step: "collect_state",
    draft: { ...session.draft, fullName: text },
  });
  return "Which state did this happen in? (e.g. Lagos, FCT, Kano)";
}

async function collectState(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  const state = matchState(text);
  if (!state) {
    return "I didn't match that to a Nigerian state. Try again, e.g. Lagos, Rivers, or FCT.";
  }
  await patchSession(ctx, session._id, {
    step: "collect_mda",
    draft: { ...session.draft, state },
  });
  return "Which MDA should handle this? Type part of the name, e.g. Customs, FIRS, or NIMC.";
}

async function collectMda(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  const mdas = await ctx.db.query("mdas").take(500);
  const matches = searchMdas(mdas, text);
  if (matches.length === 0) {
    return "No MDA matched that. Try a shorter name, e.g. Customs or Immigration.";
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
    return `Did you mean *${matches[0]}*?\nReply YES or 1 to confirm, or type another name.`;
  }
  await patchSession(ctx, session._id, {
    step: "confirm_mda",
    draft: {
      ...session.draft,
      assignedMDA: undefined,
      mdaMatches: matches,
    },
  });
  return `Which one?\n${formatMdaChoices(matches)}\nReply with the number, or type another name.`;
}

async function confirmMda(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
  normalized: string,
): Promise<string> {
  const matches = session.draft.mdaMatches ?? [];
  const index = Number.parseInt(normalized, 10);
  let chosen: string | undefined;
  if (
    (normalized === "yes" || normalized === "y" || normalized === "1") &&
    session.draft.assignedMDA
  ) {
    chosen = session.draft.assignedMDA;
  } else if (!Number.isNaN(index) && index >= 1 && index <= matches.length) {
    chosen = matches[index - 1];
  }

  if (!chosen) {
    return await collectMda(ctx, session, text);
  }

  await patchSession(ctx, session._id, {
    step: "collect_title",
    draft: {
      ...session.draft,
      assignedMDA: chosen,
      mdaMatches: undefined,
    },
  });
  return `MDA: ${chosen}\n\nSend a short title for the complaint.`;
}

async function collectTitle(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  if (text.length < 3) {
    return "Please send a slightly longer title.";
  }
  await patchSession(ctx, session._id, {
    step: "collect_description",
    draft: { ...session.draft, title: text },
  });
  return "Describe what happened.";
}

async function collectDescription(
  ctx: MutationCtx,
  session: SessionDoc,
  text: string,
): Promise<string> {
  if (text.length < 10) {
    return "Please add a bit more detail (at least a sentence).";
  }
  const fullName = session.draft.fullName?.trim();
  const state = session.draft.state;
  const assignedMDA = session.draft.assignedMDA;
  const title = session.draft.title?.trim();
  if (!fullName || !state || !assignedMDA || !title) {
    await patchSession(ctx, session._id, { step: "idle", draft: {} });
    return "Something was missing from the draft. Send NEW to start again.";
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

  return [
    `Complaint submitted.`,
    `Ticket: ${created.ticketNumber}`,
    `MDA: ${assignedMDA}`,
    "",
    "MDAs will see this on the ReportGov portal.",
    "Send STATUS to check it, or NEW for another complaint.",
  ].join("\n");
}

async function statusReply(
  ctx: MutationCtx,
  phone: string,
  text: string,
): Promise<string> {
  const ticketNumber = extractTicketNumber(text);
  if (ticketNumber) {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("byTicketNumber", (q) => q.eq("ticketNumber", ticketNumber))
      .first();
    if (!ticket || ticket.whatsappPhone !== phone) {
      return "No ticket with that number was found for this WhatsApp number.";
    }
    return formatTicketStatus(ctx, ticket);
  }

  const tickets = await ctx.db
    .query("tickets")
    .withIndex("byWhatsappPhone", (q) => q.eq("whatsappPhone", phone))
    .order("desc")
    .take(5);

  if (tickets.length === 0) {
    return "No tickets on this number yet. Send NEW to file one.";
  }

  const lines = await Promise.all(
    tickets.map(async (ticket) => {
      const mda = ticket.assignedMDA
        ? await ctx.db.get(ticket.assignedMDA)
        : null;
      return `• ${ticket.ticketNumber} — ${ticket.status.replace("_", " ")} — ${mda?.name ?? "Unassigned"}`;
    }),
  );
  return ["Your recent tickets:", ...lines, "", "Send STATUS REP-… for one ticket."].join("\n");
}

async function formatTicketStatus(
  ctx: MutationCtx,
  ticket: Doc<"tickets">,
): Promise<string> {
  const mda = ticket.assignedMDA ? await ctx.db.get(ticket.assignedMDA) : null;
  const lines = [
    ticket.ticketNumber,
    `Status: ${ticket.status.replace("_", " ")}`,
    `MDA: ${mda?.name ?? "Unassigned"}`,
    `Title: ${ticket.title}`,
  ];
  if (ticket.resolutionNote) {
    lines.push(`Resolution: ${ticket.resolutionNote}`);
  }
  return lines.join("\n");
}

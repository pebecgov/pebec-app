"use node";

import { action, internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { copyFor, followUpCopy } from "./i18n";
import type { Id } from "../_generated/dataModel";

/**
 * Meta template names (set in Convex env after Meta approval):
 * - WHATSAPP_TEMPLATE_STATUS_UPDATE  e.g. reportgov_status_update
 * - WHATSAPP_TEMPLATE_OFFICER_UPDATE e.g. reportgov_officer_update
 * - WHATSAPP_TEMPLATE_LANGUAGE          e.g. en
 *
 * Expected body variables:
 *   status:  {{1}} ticket number, {{2}} status, {{3}} note (use "-" if none)
 *   officer: {{1}} ticket number, {{2}} officer comment
 */

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

type WhatsAppOutbound =
  | {
      type: "text";
      text: { body: string; preview_url: boolean };
    }
  | {
      type: "interactive";
      interactive: {
        type: "button";
        body: { text: string };
        action: {
          buttons: Array<{
            type: "reply";
            reply: { id: string; title: string };
          }>;
        };
      };
    }
  | {
      type: "interactive";
      interactive: {
        type: "list";
        body: { text: string };
        action: {
          button: string;
          sections: Array<{
            title?: string;
            rows: ListRow[];
          }>;
        };
      };
    }
  | {
      type: "template";
      template: {
        name: string;
        language: { code: string };
        components?: Array<{
          type: "body";
          parameters: Array<{ type: "text"; text: string }>;
        }>;
      };
    };

type DeliverResult = {
  sent: boolean;
  channel: "session" | "template" | "none";
  error?: string;
};

const notifyResultValidator = v.object({
  ok: v.boolean(),
  whatsappSent: v.boolean(),
  whatsappChannel: v.union(
    v.literal("session"),
    v.literal("template"),
    v.literal("none"),
  ),
  whatsappError: v.optional(v.string()),
});

function clipTitle(title: string): string {
  return title.length <= 20 ? title : title.slice(0, 20);
}

function menuMessage(menu: MenuSpec): WhatsAppOutbound {
  return {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: menu.body,
      },
      action: {
        buttons: menu.buttons.map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: clipTitle(button.title),
          },
        })),
      },
    },
  };
}

function defaultMenu(): MenuSpec {
  const copy = copyFor("en");
  return {
    body: copy.menuBody,
    buttons: [
      { id: "submit_complaint", title: copy.menuSubmit },
      { id: "check_status", title: copy.menuStatus },
      { id: "follow_up", title: copy.menuFollowUp },
    ],
  };
}

function listMessage(list: ListSpec): WhatsAppOutbound {
  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: list.body },
      action: {
        button: clipTitle(list.button),
        sections: list.sections,
      },
    },
  };
}

function metaErrorMessage(result: unknown): string {
  if (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof result.error === "object" &&
    result.error !== null
  ) {
    const err = result.error as { message?: string; error_data?: { details?: string } };
    return err.error_data?.details || err.message || "WhatsApp send failed";
  }
  return "WhatsApp send failed";
}

function clipTemplateParam(text: string, max = 1024): string {
  const cleaned = text.replace(/\s+/g, " ").trim() || "-";
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function templateMessage(
  name: string,
  params: string[],
): WhatsAppOutbound {
  const language =
    process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";
  return {
    type: "template",
    template: {
      name,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: params.map((text) => ({
            type: "text" as const,
            text: clipTemplateParam(text),
          })),
        },
      ],
    },
  };
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  message: WhatsAppOutbound,
): Promise<void> {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_ACCESS_TOKEN;
  const resolvedPhoneId =
    phoneNumberId ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error("WhatsApp access token is not set");
  }
  if (!resolvedPhoneId) {
    throw new Error("WhatsApp phone number ID is not set");
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${resolvedPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/^\+/, ""),
        ...message,
      }),
    },
  );

  const result: unknown = await response.json();
  console.log("WhatsApp send response:", result);

  if (!response.ok) {
    console.error("WhatsApp send failed", response.status, result);
    throw new Error(metaErrorMessage(result));
  }
}

async function deliverCitizenMessage(args: {
  phone: string;
  body: string;
  replyTicketId?: Id<"tickets">;
  replyTitle?: string;
  menuTitle?: string;
  templateName?: string;
  templateParams?: string[];
}): Promise<DeliverResult> {
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || "";

  try {
    if (args.replyTicketId) {
      await sendWhatsAppMessage(
        phoneNumberId,
        args.phone,
        menuMessage({
          body: args.body,
          buttons: [
            {
              id: `reply:${args.replyTicketId}`,
              title: args.replyTitle ?? "Reply",
            },
            {
              id: "open_menu",
              title: args.menuTitle ?? "Menu",
            },
          ],
        }),
      );
    } else {
      await sendWhatsAppMessage(phoneNumberId, args.phone, {
        type: "text",
        text: {
          preview_url: false,
          body: args.body,
        },
      });
    }
    return { sent: true, channel: "session" };
  } catch (sessionError) {
    const sessionMsg =
      sessionError instanceof Error
        ? sessionError.message
        : "Session message failed";
    console.error("WhatsApp session notify failed", sessionMsg);

    const templateName = args.templateName?.trim();
    const templateParams = args.templateParams;
    if (!templateName || !templateParams?.length) {
      return {
        sent: false,
        channel: "none",
        error: `${sessionMsg}. No approved template configured for fallback.`,
      };
    }

    try {
      await sendWhatsAppMessage(
        phoneNumberId,
        args.phone,
        templateMessage(templateName, templateParams),
      );
      return { sent: true, channel: "template" };
    } catch (templateError) {
      const templateMsg =
        templateError instanceof Error
          ? templateError.message
          : "Template message failed";
      console.error("WhatsApp template notify failed", templateMsg);
      return {
        sent: false,
        channel: "none",
        error: `${sessionMsg} | Template: ${templateMsg}`,
      };
    }
  }
}

function accessToken(): string {
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("WhatsApp access token is not set");
  }
  return token;
}

async function downloadWhatsAppMedia(
  ctx: ActionCtx,
  mediaId: string,
): Promise<Id<"_storage">> {
  const token = accessToken();
  const meta = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaJson: unknown = await meta.json();
  if (!meta.ok) {
    console.error("WhatsApp media metadata failed", meta.status, metaJson);
    throw new Error("Failed to fetch WhatsApp media");
  }
  const url =
    typeof metaJson === "object" &&
    metaJson !== null &&
    "url" in metaJson &&
    typeof metaJson.url === "string"
      ? metaJson.url
      : null;
  if (!url) {
    throw new Error("WhatsApp media URL missing");
  }
  const file = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!file.ok) {
    throw new Error("Failed to download WhatsApp media");
  }
  const blob = await file.blob();
  return await ctx.storage.store(blob);
}

export const handleInbound = action({
  args: {
    secret: v.string(),
    phone: v.string(),
    text: v.string(),
    buttonId: v.optional(v.string()),
    messageId: v.string(),
    phoneNumberId: v.string(),
    mediaId: v.optional(v.string()),
    mediaFilename: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!expected || args.secret !== expected) {
      throw new Error("Unauthorized");
    }

    let storageId: Id<"_storage"> | undefined;
    if (args.mediaId) {
      try {
        storageId = await downloadWhatsAppMedia(ctx, args.mediaId);
      } catch (error) {
        console.error("WhatsApp media download failed", error);
      }
    }

    const result = await ctx.runMutation(
      internal.whatsapp.simpleFlow.processSimpleInbound,
      {
        phone: args.phone,
        body: args.text,
        buttonId: args.buttonId,
        messageSid: args.messageId,
        storageId,
        mediaFilename: args.mediaFilename,
        mediaFailed: Boolean(args.mediaId && !storageId),
      },
    );

    if (result.duplicate) {
      return null;
    }

    if (result.kind === "menu") {
      await sendWhatsAppMessage(
        args.phoneNumberId,
        args.phone,
        menuMessage(result.menu ?? defaultMenu()),
      );
      return null;
    }

    if (result.kind === "list" && result.list) {
      await sendWhatsAppMessage(
        args.phoneNumberId,
        args.phone,
        listMessage(result.list),
      );
      return null;
    }

    await sendWhatsAppMessage(args.phoneNumberId, args.phone, {
      type: "text",
      text: {
        preview_url: false,
        body: result.reply,
      },
    });

    return null;
  },
});

export const notifyCitizen = internalAction({
  args: {
    phone: v.string(),
    body: v.string(),
    replyTicketId: v.optional(v.id("tickets")),
    replyTitle: v.optional(v.string()),
    attachTitle: v.optional(v.string()),
    menuTitle: v.optional(v.string()),
    templateName: v.optional(v.string()),
    templateParams: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const result = await deliverCitizenMessage(args);
    if (!result.sent) {
      console.error("WhatsApp citizen notify failed", result.error);
    }
    return null;
  },
});

/** Statuses that trigger a citizen WhatsApp push. */
const WHATSAPP_STATUS_NOTIFY = new Set([
  "in_progress",
  "resolved",
  "closed",
]);

function statusNotifyBody(
  ticketNumber: string,
  status: string,
  resolutionNote?: string,
): string {
  const statusLabel = status.replace(/_/g, " ");
  const lines = [
    "PEBEC ReportGov update",
    "",
    `Ticket: ${ticketNumber}`,
    `Status: ${statusLabel}`,
  ];
  if (
    (status === "resolved" || status === "closed") &&
    resolutionNote
  ) {
    lines.push(`Note: ${resolutionNote}`);
  }
  lines.push("");
  lines.push("Tap Reply to respond, or Menu for more options.");
  return lines.join("\n");
}

async function deliverWithPolicy(
  ctx: ActionCtx,
  args: {
    phone: string;
    ticketId: Id<"tickets">;
    kind: "status" | "needs_info";
    body: string;
    replyTicketId?: Id<"tickets">;
    replyTitle?: string;
    menuTitle?: string;
    templateName?: string;
    templateParams?: string[];
  },
): Promise<DeliverResult> {
  const limit = await ctx.runQuery(internal.whatsapp.outbound.checkRateLimit, {
    phone: args.phone,
    ticketId: args.ticketId,
  });
  if (!limit.allowed) {
    await ctx.runMutation(internal.whatsapp.outbound.recordOutbound, {
      phone: args.phone,
      ticketId: args.ticketId,
      kind: "rate_limited",
      channel: "none",
      sent: false,
      error: limit.reason,
      bodyPreview: args.body,
    });
    return {
      sent: false,
      channel: "none",
      error: limit.reason,
    };
  }

  const result = await deliverCitizenMessage({
    phone: args.phone,
    body: args.body,
    replyTicketId: args.replyTicketId,
    replyTitle: args.replyTitle,
    menuTitle: args.menuTitle,
    templateName: args.templateName,
    templateParams: args.templateParams,
  });

  await ctx.runMutation(internal.whatsapp.outbound.recordOutbound, {
    phone: args.phone,
    ticketId: args.ticketId,
    kind: args.kind,
    channel: result.channel,
    sent: result.sent,
    error: result.error,
    bodyPreview: args.body,
  });

  return result;
}

export const updateTicketStatusAndNotify = action({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    resolutionNote: v.optional(v.string()),
  },
  returns: notifyResultValidator,
  handler: async (ctx, args) => {
    await ctx.runMutation(api.tickets.updateTicketStatus, {
      ticketId: args.ticketId,
      status: args.status,
      resolutionNote: args.resolutionNote,
    });

    if (!WHATSAPP_STATUS_NOTIFY.has(args.status)) {
      return {
        ok: true,
        whatsappSent: false,
        whatsappChannel: "none" as const,
      };
    }

    const target = await ctx.runQuery(
      internal.whatsapp.targets.getCitizenNotifyTarget,
      { ticketId: args.ticketId },
    );
    if (!target) {
      return {
        ok: true,
        whatsappSent: false,
        whatsappChannel: "none" as const,
      };
    }

    const body = statusNotifyBody(
      target.ticketNumber,
      args.status,
      args.resolutionNote ?? target.resolutionNote,
    );
    const result = await deliverWithPolicy(ctx, {
      phone: target.phone,
      ticketId: target.ticketId,
      kind: "status",
      body,
      replyTicketId: target.ticketId,
      replyTitle: target.replyTitle,
      menuTitle: target.menuTitle,
      templateName: process.env.WHATSAPP_TEMPLATE_STATUS_UPDATE,
      templateParams: [
        target.ticketNumber,
        args.status.replace(/_/g, " "),
        args.resolutionNote?.trim() || target.resolutionNote?.trim() || "-",
      ],
    });

    return {
      ok: true,
      whatsappSent: result.sent,
      whatsappChannel: result.channel,
      whatsappError: result.error,
    };
  },
});

export const addTicketCommentAndNotify = action({
  args: {
    ticketId: v.id("tickets"),
    content: v.string(),
    fileIds: v.optional(v.array(v.id("_storage"))),
    notifyWhatsApp: v.optional(v.boolean()),
  },
  returns: notifyResultValidator,
  handler: async (ctx, args) => {
    const commentResult = await ctx.runMutation(
      api.ticket_comments.addTicketComment,
      {
        ticketId: args.ticketId,
        content: args.content,
        fileIds: args.fileIds,
        notifyWhatsApp: args.notifyWhatsApp,
      },
    );

    if (!commentResult.shouldNotifyWhatsApp) {
      return {
        ok: true,
        whatsappSent: false,
        whatsappChannel: "none" as const,
      };
    }

    const target = await ctx.runQuery(
      internal.whatsapp.targets.getCitizenNotifyTarget,
      { ticketId: args.ticketId },
    );
    if (!target) {
      return {
        ok: true,
        whatsappSent: false,
        whatsappChannel: "none" as const,
      };
    }

    const clipped =
      args.content.length > 900
        ? `${args.content.slice(0, 900)}…`
        : args.content;
    const fu = followUpCopy(target.language);
    const body = fu.officerUpdate(target.ticketNumber, clipped);
    const result = await deliverWithPolicy(ctx, {
      phone: target.phone,
      ticketId: target.ticketId,
      kind: "needs_info",
      body,
      replyTicketId: target.ticketId,
      replyTitle: target.replyTitle,
      menuTitle: target.menuTitle,
      templateName: process.env.WHATSAPP_TEMPLATE_OFFICER_UPDATE,
      templateParams: [target.ticketNumber, clipped],
    });

    return {
      ok: true,
      whatsappSent: result.sent,
      whatsappChannel: result.channel,
      whatsappError: result.error,
    };
  },
});

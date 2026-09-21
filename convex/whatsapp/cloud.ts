"use node";

import { action, internalAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { copyFor } from "./i18n";
import type { Id } from "../_generated/dataModel";

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
    };

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
    throw new Error("Failed to send WhatsApp message");
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
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
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
        return null;
      }
      await sendWhatsAppMessage(phoneNumberId, args.phone, {
        type: "text",
        text: {
          preview_url: false,
          body: args.body,
        },
      });
    } catch (error) {
      console.error("WhatsApp citizen notify failed", error);
    }
    return null;
  },
});

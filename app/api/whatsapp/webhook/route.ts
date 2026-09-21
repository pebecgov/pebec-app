import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

type WhatsAppMedia = {
  id?: string;
  mime_type?: string;
  caption?: string;
  filename?: string;
};

type WhatsAppInboundMessage = {
  id: string;
  from: string;
  type?: string;
  text?: {
    body?: string;
  };
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  video?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    };
    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };
};

type WhatsAppChangeValue = {
  metadata?: {
    phone_number_id?: string;
  };
  messages?: WhatsAppInboundMessage[];
};

function mediaFromMessage(message: WhatsAppInboundMessage): {
  mediaId: string;
  mediaFilename?: string;
  caption?: string;
} | null {
  const media =
    message.image ?? message.document ?? message.video ?? message.audio;
  if (!media?.id) return null;
  return {
    mediaId: media.id,
    mediaFilename: media.filename,
    caption: media.caption,
  };
}

function extractInboundMessages(payload: unknown): Array<{
  phone: string;
  text: string;
  buttonId?: string;
  messageId: string;
  phoneNumberId: string;
  mediaId?: string;
  mediaFilename?: string;
}> {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as {
    entry?: Array<{
      changes?: Array<{ value?: WhatsAppChangeValue }>;
    }>;
  };

  const inbound: Array<{
    phone: string;
    text: string;
    buttonId?: string;
    messageId: string;
    phoneNumberId: string;
    mediaId?: string;
    mediaFilename?: string;
  }> = [];

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages) continue;

      for (const message of value.messages) {
        if (!message?.id || !message.from) continue;

        const buttonId =
          message.type === "interactive"
            ? message.interactive?.button_reply?.id ??
              message.interactive?.list_reply?.id
            : undefined;
        const media = mediaFromMessage(message);

        inbound.push({
          phone: message.from,
          text: message.text?.body ?? media?.caption ?? "",
          buttonId,
          messageId: message.id,
          phoneNumberId,
          mediaId: media?.mediaId,
          mediaFilename: media?.mediaFilename,
        });
      }
    }
  }

  return inbound;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  console.log("WhatsApp webhook received:");
  console.log(JSON.stringify(body, null, 2));

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!convexUrl || !secret) {
    console.error("WhatsApp webhook is missing Convex URL or verify token");
    return NextResponse.json({ received: true });
  }

  const inbound = extractInboundMessages(body);
  if (inbound.length === 0) {
    return NextResponse.json({ received: true });
  }

  const client = new ConvexHttpClient(convexUrl);
  for (const message of inbound) {
    try {
      await client.action(api.whatsapp.cloud.handleInbound, {
        secret,
        phone: message.phone,
        text: message.text,
        buttonId: message.buttonId,
        messageId: message.messageId,
        phoneNumberId: message.phoneNumberId,
        mediaId: message.mediaId,
        mediaFilename: message.mediaFilename,
      });
    } catch (error) {
      console.error("WhatsApp inbound handling failed", error);
    }
  }

  return NextResponse.json({ received: true });
}

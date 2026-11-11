import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

function whatsappVerifyToken(): string | undefined {
  return process.env.WHATSAPP_VERIFY_TOKEN;
}

function whatsappAppSecret(): string | undefined {
  return process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET;
}

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

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const appSecret = whatsappAppSecret()?.trim();
  if (!appSecret) {
    console.error("WhatsApp webhook missing WHATSAPP_APP_SECRET");
    return false;
  }
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }
  const provided = signatureHeader.slice("sha256=".length);
  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = new Uint8Array(Buffer.from(expected, "utf8"));
  const b = new Uint8Array(Buffer.from(provided, "utf8"));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function redactPhone(value: string): string {
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === whatsappVerifyToken()) {
    return new NextResponse(challenge);
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    console.error("WhatsApp webhook signature verification failed", {
      hasSignature: Boolean(signature),
      bodyBytes: rawBody.length,
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("WhatsApp webhook invalid JSON", {
      bodyBytes: rawBody.length,
    });
    return NextResponse.json({ received: true });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = whatsappVerifyToken();
  if (!convexUrl || !secret) {
    console.error("WhatsApp webhook is missing Convex URL or verify token");
    return NextResponse.json({ received: true });
  }

  const inbound = extractInboundMessages(body);
  console.log("WhatsApp webhook received", {
    messageCount: inbound.length,
    phones: inbound.map((m) => redactPhone(m.phone)),
    types: inbound.map((m) =>
      m.buttonId ? "interactive" : m.mediaId ? "media" : "text",
    ),
    messageIds: inbound.map((m) => m.messageId),
  });

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
      console.error("WhatsApp inbound handling failed", {
        messageId: message.messageId,
        phone: redactPhone(message.phone),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ received: true });
}

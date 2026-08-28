// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { normalizePhone } from "./whatsapp/constants";
import {
  parseTwilioForm,
  toTwimlMessage,
  twilioSignatureIsValid,
} from "./whatsapp/twilio";
const http = httpRouter();
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occured", {
        status: 400
      });
    }
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data
        });
        break;
      case "user.deleted":
        {
          const clerkUserId = event.data.id!;
          await ctx.runMutation(internal.users.deleteFromClerk, {
            clerkUserId
          });
          break;
        }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }
    return new Response(null, {
      status: 200
    });
  })
});

http.route({
  path: "/twilio/whatsapp",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response("ReportGov Twilio WhatsApp webhook is up.", {
      status: 200,
    });
  }),
});

http.route({
  path: "/twilio/whatsapp",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error("TWILIO_AUTH_TOKEN is not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    const rawBody = await request.text();
    const params = parseTwilioForm(rawBody);
    const url = process.env.TWILIO_WEBHOOK_URL || request.url;
    const signature = request.headers.get("X-Twilio-Signature");
    const valid = await twilioSignatureIsValid({
      authToken,
      url,
      params,
      signature,
    });
    if (!valid) {
      console.error("Invalid Twilio WhatsApp signature");
      return new Response("Forbidden", { status: 403 });
    }

    const from = params.From ?? "";
    const body = params.Body ?? "";
    const messageSid = params.MessageSid ?? "";
    if (!from || !messageSid) {
      return new Response(toTwimlMessage("Missing WhatsApp sender."), {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const reply = await ctx.runMutation(internal.whatsapp.handler.processInbound, {
      phone: normalizePhone(from),
      body,
      messageSid,
    });
    return new Response(toTwimlMessage(reply), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}
export default http;
// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
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
  path: "/ai-ticket-update",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = await request.json();
      const event = payload?.event;
      const ticketId = payload?.ticketId;
      if (!ticketId || typeof ticketId !== "string") {
        return new Response("ticketId is required", { status: 400 });
      }
      const ticketDocId = ticketId as Id<"tickets">;
      if (event === "processing") {
        await ctx.runMutation(internal.tickets.setAiStatusInternal, {
          ticketId: ticketDocId,
          aiStatus: "processing"
        });
        return new Response("ok", { status: 200 });
      }
      if (event === "done") {
        const aiResult = payload?.aiResult;
        if (!["MATCH", "WRONG_MDA", "IRRELEVANT"].includes(aiResult)) {
          return new Response("Invalid aiResult", { status: 400 });
        }
        const aiExplanation = typeof payload?.aiExplanation === "string" ? payload.aiExplanation : undefined;
        const aiNextSteps = typeof payload?.nextSteps === "string" ? payload.nextSteps : undefined;
        const confidence = typeof payload?.aiConfidence === "number" ? payload.aiConfidence : undefined;
        const processedAt = typeof payload?.processedAt === "number" ? payload.processedAt : undefined;
        await ctx.runMutation(internal.tickets.completeAiProcessingInternal, {
          ticketId: ticketDocId,
          aiResult,
          explanation: aiExplanation,
          nextSteps: aiNextSteps,
          aiConfidence: confidence,
          processedAt
        });
        return new Response("ok", { status: 200 });
      }
      return new Response("Invalid event. Use processing or done.", { status: 400 });
    } catch (error) {
      console.error("AI ticket update failed", error);
      return new Response("Internal server error", { status: 500 });
    }
  })
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
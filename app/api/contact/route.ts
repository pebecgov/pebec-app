// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, phone, message } = body ?? {};

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const client = new ConvexHttpClient(convexUrl);
    const ipAddress = getClientIp(request);

    await client.mutation(api.contact_messages.createContactMessage, {
      name: String(name),
      email: String(email),
      subject: String(subject),
      phone: phone ? String(phone) : undefined,
      message: String(message),
      ipAddress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send message.";

    const isRateLimit =
      message.toLowerCase().includes("already sent") ||
      message.toLowerCase().includes("already been sent") ||
      message.toLowerCase().includes("try again tomorrow");

    return NextResponse.json(
      { error: message },
      { status: isRateLimit ? 429 : 400 }
    );
  }
}

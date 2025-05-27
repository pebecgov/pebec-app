import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentName, state, numberOfReports, role, createdAt } = body;

    const report = await prisma.report.create({
      data: {
        agentName,
        state,
        numberOfReports: parseInt(numberOfReports),
        role,
        createdAt,
        type: "SABER_AGENT",
        status: "SUBMITTED"
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
} 
// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isUserRoute = createRouteMatcher(["/user(.*)"]);
const isFeedbackRoute = createRouteMatcher(["/feedback(.*)"]);
const isReportGovRoute = createRouteMatcher(["/reportgov"]);
const isMdaRoute = createRouteMatcher(["/mda(.*)"]);
const isStaffRoute = createRouteMatcher(["/staff(.*)"]);
const isSubNationalRoute = createRouteMatcher(["/reform_champion(.*)"]);
const isFederalRoute = createRouteMatcher(["/federal(.*)"]);
const isDeputyRoute = createRouteMatcher(["/deputies(.*)"]);
const isStateGovernorRoute = createRouteMatcher(["/state_governor(.*)"]);
const isMagistratesRoute = createRouteMatcher(["/magistrates(.*)"]);
const isPresidentRoute = createRouteMatcher(["/president(.*)"]);
const isVicePresidentRoute = createRouteMatcher(["/vice_president(.*)"]);
const issaberAgent = createRouteMatcher(["/saber_agent(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const session = await auth();
  const role = session?.sessionClaims?.metadata?.role;
  const staffStream = session?.sessionClaims?.metadata?.staffStream;

  // Staff redirects for specific streams
  if (role === "staff" && staffStream === "investments" && req.nextUrl.pathname === "/staff") {
    const url = new URL("/staff/projects", req.url);
    return NextResponse.redirect(url);
  }
  if (role === "staff" && staffStream === "receptionist" && req.nextUrl.pathname === "/staff") {
    const url = new URL("/staff/letters", req.url);
    return NextResponse.redirect(url);
  }
  if (role === "staff" && staffStream === "account" && req.nextUrl.pathname === "/staff") {
    const url = new URL("/staff/send-letters", req.url);
    return NextResponse.redirect(url);
  }
  if (role === "staff" && staffStream === "auditor" && req.nextUrl.pathname === "/staff") {
    const url = new URL("/staff/received-letters", req.url);
    return NextResponse.redirect(url);
  }

  // Enhanced admin route check - Allow both admin and staff users
  if (isAdminRoute(req) && role !== "admin" && role !== "staff") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Rest of the route checks remain the same
  if (isFeedbackRoute(req) && role && role !== "user") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isReportGovRoute(req) && role && role !== "user") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isMdaRoute(req) && role !== "mda") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (issaberAgent(req) && role !== "saber_agent") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isStaffRoute(req) && role !== "staff") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isSubNationalRoute(req) && role !== "reform_champion") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isUserRoute(req) && role !== "user") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isFederalRoute(req) && role !== "federal") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isDeputyRoute(req) && role !== "deputies") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isMagistratesRoute(req) && role !== "magistrates") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isStateGovernorRoute(req) && role !== "state_governor") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isPresidentRoute(req) && role !== "president") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isVicePresidentRoute(req) && role !== "vice_president") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};
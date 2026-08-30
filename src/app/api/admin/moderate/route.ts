import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { escalateAndBan } from "@/lib/ban";

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { action, reportId } = body ?? {};
  if (!reportId || (action !== "ban" && action !== "dismiss")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "ban") {
    await escalateAndBan({ userId: report.reportedId, reason: `admin_review:${report.reason.toLowerCase()}` });
    await prisma.report.update({ where: { id: reportId }, data: { status: "ACTIONED" } });
  } else {
    await prisma.report.update({ where: { id: reportId }, data: { status: "DISMISSED" } });
  }

  return NextResponse.json({ ok: true });
}

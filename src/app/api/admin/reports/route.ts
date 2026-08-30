import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reported: { select: { id: true, isGuest: true, deviceFingerprint: true } },
      reporter: { select: { id: true } },
    },
  });

  return NextResponse.json({ reports });
}

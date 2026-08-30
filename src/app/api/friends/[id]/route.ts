import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { areFriends } from "@/lib/friends";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await areFriends(userId, params.id))) return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const friend = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, image: true },
  });
  if (!friend) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ friend });
}

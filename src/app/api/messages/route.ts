import { NextRequest, NextResponse } from "next/server";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { areFriends, getThread } from "@/lib/friends";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/socket/server";

export async function GET(req: NextRequest) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const withUserId = req.nextUrl.searchParams.get("with");
  if (!withUserId) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (!(await areFriends(userId, withUserId))) return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const messages = await getThread(userId, withUserId);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const userId = verifySessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === "string" ? body.to : null;
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!to || !text) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (!(await areFriends(userId, to))) return NextResponse.json({ error: "not_friends" }, { status: 403 });

  const message = await prisma.message.create({
    data: { senderId: userId, recipientId: to, text },
  });

  emitToUser(to, "dm_message", { id: message.id, senderId: userId, recipientId: to, text, createdAt: message.createdAt });

  return NextResponse.json({ message });
}

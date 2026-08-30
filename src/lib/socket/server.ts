import type { Server, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { activeBan, escalateAndBan } from "@/lib/ban";
import { hashIp } from "@/lib/fingerprint";
import { claimMatch, enqueue, removeBySocket, type SessionMode } from "@/lib/matchmaking/queue";
import { randomUUID } from "node:crypto";

type Peer = { socketId: string; userId: string };

type ActiveSession = {
  id: string;
  mode: SessionMode;
  a: Peer;
  b: Peer;
  interestTagsMatched: string[];
};

const sessions = new Map<string, ActiveSession>();
const sessionBySocket = new Map<string, string>();
const socketsByUser = new Map<string, Socket>();
let ioRef: Server | null = null;

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function requestIpFromSocket(socket: Socket): string {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? socket.handshake.address;
  return socket.handshake.address;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  socketsByUser.get(userId)?.emit(event, payload);
}

/** Used by the moderation scan route (outside the socket module) to cut a
 * user's active session short the moment their own outgoing video is
 * flagged as severe — see docs/FSD.md §5. */
export async function forceEndSessionForUser(userId: string, reason: string) {
  const socket = socketsByUser.get(userId);
  if (!socket || !ioRef) return;
  const sessionId = sessionBySocket.get(socket.id);
  if (!sessionId) return;
  await endSession(ioRef, sessionId, reason);
}

async function endSession(io: Server, sessionId: string, reasonA: string, reasonB: string = reasonA) {
  const session = sessions.get(sessionId);
  if (!session) return;

  sessions.delete(sessionId);
  sessionBySocket.delete(session.a.socketId);
  sessionBySocket.delete(session.b.socketId);

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), endReason: reasonA === reasonB ? reasonA : `${reasonA}/${reasonB}` },
  });

  io.to(session.a.socketId).emit("session_ended", { sessionId, reason: reasonA });
  io.to(session.b.socketId).emit("session_ended", { sessionId, reason: reasonB });
}

export function registerSocketServer(io: Server) {
  ioRef = io;

  io.use(async (socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const userId = verifySessionValue(cookies[SESSION_COOKIE]);
    if (!userId) return next(new Error("unauthorized"));

    const deviceId = typeof socket.handshake.auth?.deviceId === "string" ? socket.handshake.auth.deviceId : undefined;
    const ipHash = hashIp(requestIpFromSocket(socket));
    const ban = await activeBan({ userId, deviceFingerprint: deviceId, ipHash });
    if (ban) return next(new Error("banned"));

    socket.data.userId = userId;
    socket.data.deviceId = deviceId;
    socket.data.ipHash = ipHash;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socketsByUser.set(userId, socket);

    socket.on(
      "join_queue",
      async (payload: { mode: SessionMode; interestTags?: string[]; language?: string }) => {
        const ban = await activeBan({ userId, deviceFingerprint: socket.data.deviceId, ipHash: socket.data.ipHash });
        if (ban) {
          socket.emit("session_ended", { sessionId: null, reason: "banned" });
          return;
        }

        const mode: SessionMode = payload.mode === "TEXT" ? "TEXT" : "VIDEO";
        const interestTags = (payload.interestTags ?? []).slice(0, 10).map((t) => t.toLowerCase().trim()).filter(Boolean);

        const entry = {
          socketId: socket.id,
          userId,
          mode,
          interestTags,
          language: payload.language,
          joinedAt: Date.now(),
        };

        const candidate = claimMatch(entry);
        if (!candidate) {
          enqueue(entry);
          return;
        }

        const sharedTags = interestTags.filter((t) => candidate.interestTags.includes(t));
        const sessionId = randomUUID();
        const a: Peer = { socketId: candidate.socketId, userId: candidate.userId };
        const b: Peer = { socketId: socket.id, userId };

        sessions.set(sessionId, { id: sessionId, mode, a, b, interestTagsMatched: sharedTags });
        sessionBySocket.set(a.socketId, sessionId);
        sessionBySocket.set(b.socketId, sessionId);

        await prisma.chatSession.create({
          data: {
            id: sessionId,
            userAId: a.userId,
            userBId: b.userId,
            mode,
            interestTagsMatched: sharedTags,
          },
        });

        io.to(a.socketId).emit("matched", { sessionId, isInitiator: true, sharedTags });
        io.to(b.socketId).emit("matched", { sessionId, isInitiator: false, sharedTags });
      },
    );

    socket.on("leave_queue", () => removeBySocket(socket.id));

    socket.on("signal", (payload: { sessionId: string; type: string; payload: unknown }) => {
      const session = sessions.get(payload.sessionId);
      if (!session) return;
      const peer = session.a.socketId === socket.id ? session.b : session.a;
      if (peer.socketId !== socket.id) io.to(peer.socketId).emit("signal", payload);
    });

    socket.on("chat_message", (payload: { sessionId: string; text: string }) => {
      const session = sessions.get(payload.sessionId);
      if (!session || typeof payload.text !== "string") return;
      const peer = session.a.socketId === socket.id ? session.b : session.a;
      if (peer.socketId !== socket.id) {
        io.to(peer.socketId).emit("chat_message", { sessionId: payload.sessionId, text: payload.text.slice(0, 1000) });
      }
    });

    socket.on("skip", async (payload: { sessionId: string }) => {
      await endSession(io, payload.sessionId, "skip");
    });

    socket.on(
      "report",
      async (payload: { sessionId: string; reason: "NUDITY" | "HARASSMENT" | "MINOR_SUSPECTED" | "SPAM" | "OTHER" }) => {
        const session = sessions.get(payload.sessionId);
        if (!session) return;

        const reportedPeer = session.a.socketId === socket.id ? session.b : session.a;

        const report = await prisma.report.create({
          data: {
            sessionId: session.id,
            reporterId: userId,
            reportedId: reportedPeer.userId,
            reason: payload.reason,
          },
        });

        const recentReportCount = await prisma.report.count({
          where: { reportedId: reportedPeer.userId, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        });

        const skipLadder = payload.reason === "MINOR_SUSPECTED";
        let reportedGotBanned = false;
        if (skipLadder || recentReportCount >= 3) {
          const reportedSocket = socketsByUser.get(reportedPeer.userId);
          await escalateAndBan({
            userId: reportedPeer.userId,
            deviceFingerprint: reportedSocket?.data.deviceId,
            ipHash: reportedSocket?.data.ipHash,
            reason: `report:${payload.reason.toLowerCase()}`,
            skipLadder,
          });
          await prisma.report.update({ where: { id: report.id }, data: { status: "ACTIONED" } });
          reportedGotBanned = true;
        }

        const reporterIsA = session.a.socketId === socket.id;
        const reportedReason = reportedGotBanned ? "banned" : "report";
        await endSession(
          io,
          payload.sessionId,
          reporterIsA ? "report" : reportedReason,
          reporterIsA ? reportedReason : "report",
        );
      },
    );

    socket.on("disconnect", () => {
      removeBySocket(socket.id);
      if (socketsByUser.get(userId) === socket) socketsByUser.delete(userId);
      const sessionId = sessionBySocket.get(socket.id);
      if (sessionId) void endSession(io, sessionId, "disconnect");
    });
  });
}

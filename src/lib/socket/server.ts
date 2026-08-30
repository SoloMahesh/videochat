import type { Server, Socket } from "socket.io";
import { prisma } from "@/lib/prisma";
import { verifySessionValue, SESSION_COOKIE } from "@/lib/session";
import { activeBan, escalateAndBan } from "@/lib/ban";
import { hashIp } from "@/lib/fingerprint";
import { claimMatch, enqueue, removeBySocket, type SessionMode, type Gender, type GenderFilter } from "@/lib/matchmaking/queue";
import { resolveGenderFilter } from "@/lib/matchmaking/genderFilter";
import { maybeRewardReferral } from "@/lib/referral";
import { getBlockedUserIds, createBlock } from "@/lib/block";
import { isNewAndFree } from "@/lib/safeMode";
import { makeFriends } from "@/lib/friends";
import { rateLimit } from "@/lib/rateLimit";
import { randomUUID } from "node:crypto";

type Peer = { socketId: string; userId: string };

type SafeModeState = { active: boolean; aConsent: boolean; bConsent: boolean };

type ActiveSession = {
  id: string;
  mode: SessionMode;
  a: Peer;
  b: Peer;
  interestTagsMatched: string[];
  startedAt: number;
  safeMode: SafeModeState;
};

/** Opened by endSession whenever a session ends by skip/disconnect (PRD
 * §5.1/§5.5) — the one 30s window where either ex-partner can request a
 * Rematch, or both can opt into a shareable stat card. Report/ban endings
 * never open this window. */
type PostSessionWindow = {
  aUserId: string;
  bUserId: string;
  mode: SessionMode;
  sharedTags: string[];
  durationMs: number;
  aWantsRematch: boolean;
  bWantsRematch: boolean;
  aWantsCard: boolean;
  bWantsCard: boolean;
  aWantsFriend: boolean;
  bWantsFriend: boolean;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * server.ts (run directly by tsx) and Next's API routes (bundled
 * separately by webpack) end up as two different instantiations of this
 * module in the same process — a plain module-level `const` would give
 * each its own private Map, so an API route calling emitToUser() would
 * write to a Map the real socket connections never touch. Storing the
 * shared mutable state on globalThis (same fix as the Prisma client
 * singleton in src/lib/prisma.ts) makes every instantiation read and
 * write the one true state, in dev and production alike. Found this via
 * a live DM push that silently never arrived — see the git history for
 * the repro.
 */
const globalForSocket = globalThis as unknown as {
  __bounceSocketState?: {
    sessions: Map<string, ActiveSession>;
    sessionBySocket: Map<string, string>;
    socketsByUser: Map<string, Socket>;
    postSessionWindows: Map<string, PostSessionWindow>;
    ioRef: Server | null;
  };
};

const sharedState =
  globalForSocket.__bounceSocketState ??
  (globalForSocket.__bounceSocketState = {
    sessions: new Map<string, ActiveSession>(),
    sessionBySocket: new Map<string, string>(),
    socketsByUser: new Map<string, Socket>(),
    postSessionWindows: new Map<string, PostSessionWindow>(),
    ioRef: null,
  });

const sessions = sharedState.sessions;
const sessionBySocket = sharedState.sessionBySocket;
const socketsByUser = sharedState.socketsByUser;
const postSessionWindows = sharedState.postSessionWindows;

const POST_SESSION_WINDOW_MS = 30_000;
const REQUEUEABLE_REASONS = new Set(["skip", "disconnect"]);

function pickVibeEmoji(): string {
  const vibes = ["✨", "🌊", "🔥", "🎲", "🪩", "🌀", "🎈", "🌸"];
  return vibes[Math.floor(Math.random() * vibes.length)] ?? "✨";
}

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
  const io = sharedState.ioRef;
  if (!socket || !io) return;
  const sessionId = sessionBySocket.get(socket.id);
  if (!sessionId) return;
  await endSession(io, sessionId, reason);
}

async function createMatchedSession(
  io: Server,
  a: Peer,
  b: Peer,
  mode: SessionMode,
  sharedTags: string[],
): Promise<string> {
  const sessionId = randomUUID();

  let safeModeActive = false;
  if (mode === "VIDEO") {
    const [aNew, bNew] = await Promise.all([isNewAndFree(a.userId), isNewAndFree(b.userId)]);
    safeModeActive = aNew || bNew;
  }
  const safeMode: SafeModeState = { active: safeModeActive, aConsent: false, bConsent: false };

  sessions.set(sessionId, { id: sessionId, mode, a, b, interestTagsMatched: sharedTags, startedAt: Date.now(), safeMode });
  sessionBySocket.set(a.socketId, sessionId);
  sessionBySocket.set(b.socketId, sessionId);

  await prisma.chatSession.create({
    data: { id: sessionId, userAId: a.userId, userBId: b.userId, mode, interestTagsMatched: sharedTags },
  });

  io.to(a.socketId).emit("matched", { sessionId, isInitiator: true, sharedTags, safeMode: safeModeActive });
  io.to(b.socketId).emit("matched", { sessionId, isInitiator: false, sharedTags, safeMode: safeModeActive });
  return sessionId;
}

/** If both ex-partners tap Rematch within the window opened by
 * endSession's `skip`/`disconnect` case (PRD §5.1), reconnect them
 * directly — unless either has since moved on to someone else, in which
 * case this quietly does nothing rather than interrupting a live call. */
async function tryRematch(io: Server, aUserId: string, bUserId: string, mode: SessionMode) {
  const aSocket = socketsByUser.get(aUserId);
  const bSocket = socketsByUser.get(bUserId);
  if (!aSocket || !bSocket) return;
  if (sessionBySocket.has(aSocket.id) || sessionBySocket.has(bSocket.id)) return;

  removeBySocket(aSocket.id);
  removeBySocket(bSocket.id);
  await createMatchedSession(io, { socketId: aSocket.id, userId: aUserId }, { socketId: bSocket.id, userId: bUserId }, mode, []);
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

  void maybeRewardReferral(session.a.userId, sessionId);
  void maybeRewardReferral(session.b.userId, sessionId);

  if (REQUEUEABLE_REASONS.has(reasonA) && REQUEUEABLE_REASONS.has(reasonB)) {
    const timeout = setTimeout(() => postSessionWindows.delete(sessionId), POST_SESSION_WINDOW_MS);
    postSessionWindows.set(sessionId, {
      aUserId: session.a.userId,
      bUserId: session.b.userId,
      mode: session.mode,
      sharedTags: session.interestTagsMatched,
      durationMs: Date.now() - session.startedAt,
      aWantsRematch: false,
      bWantsRematch: false,
      aWantsCard: false,
      bWantsCard: false,
      aWantsFriend: false,
      bWantsFriend: false,
      timeout,
    });
  }
}

export function registerSocketServer(io: Server) {
  sharedState.ioRef = io;

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
      async (payload: { mode: SessionMode; interestTags?: string[]; language?: string; desiredGender?: GenderFilter }) => {
        const limit = rateLimit(`join-queue:${userId}`, 30, 10_000);
        if (!limit.allowed) return;

        const ban = await activeBan({ userId, deviceFingerprint: socket.data.deviceId, ipHash: socket.data.ipHash });
        if (ban) {
          socket.emit("session_ended", { sessionId: null, reason: "banned" });
          return;
        }

        const mode: SessionMode = payload.mode === "TEXT" ? "TEXT" : "VIDEO";
        const interestTags = (payload.interestTags ?? []).slice(0, 10).map((t) => t.toLowerCase().trim()).filter(Boolean);

        const requestedGender: GenderFilter =
          payload.desiredGender === "MALE" || payload.desiredGender === "FEMALE" || payload.desiredGender === "OTHER"
            ? payload.desiredGender
            : "ANY";
        const { desiredGender, downgraded } = await resolveGenderFilter(userId, requestedGender);
        if (downgraded) socket.emit("filter_downgraded", { filter: "gender" });

        const [selfUser, blockedUserIds] = await Promise.all([
          prisma.user.findUnique({ where: { id: userId }, select: { gender: true } }),
          getBlockedUserIds(userId),
        ]);

        const entry = {
          socketId: socket.id,
          userId,
          mode,
          interestTags,
          language: payload.language,
          gender: (selfUser?.gender as Gender | undefined) ?? undefined,
          desiredGender,
          blockedUserIds,
          joinedAt: Date.now(),
        };

        const candidate = claimMatch(entry);
        if (!candidate) {
          enqueue(entry);
          return;
        }

        const sharedTags = interestTags.filter((t) => candidate.interestTags.includes(t));
        const a: Peer = { socketId: candidate.socketId, userId: candidate.userId };
        const b: Peer = { socketId: socket.id, userId };
        await createMatchedSession(io, a, b, mode, sharedTags);
      },
    );

    socket.on("leave_queue", () => removeBySocket(socket.id));

    socket.on("rematch", (payload: { sessionId: string }) => {
      const win = postSessionWindows.get(payload.sessionId);
      if (!win) return;

      if (userId === win.aUserId) win.aWantsRematch = true;
      else if (userId === win.bUserId) win.bWantsRematch = true;
      else return;

      if (win.aWantsRematch && win.bWantsRematch) {
        clearTimeout(win.timeout);
        postSessionWindows.delete(payload.sessionId);
        void tryRematch(io, win.aUserId, win.bUserId, win.mode);
      }
    });

    socket.on("share_card", (payload: { sessionId: string }) => {
      const win = postSessionWindows.get(payload.sessionId);
      if (!win) return;

      if (userId === win.aUserId) win.aWantsCard = true;
      else if (userId === win.bUserId) win.bWantsCard = true;
      else return;

      if (win.aWantsCard && win.bWantsCard) {
        const card = {
          sharedTags: win.sharedTags,
          mode: win.mode,
          durationSeconds: Math.max(1, Math.round(win.durationMs / 1000)),
          vibe: pickVibeEmoji(),
        };
        const aSocket = socketsByUser.get(win.aUserId);
        const bSocket = socketsByUser.get(win.bUserId);
        if (aSocket) io.to(aSocket.id).emit("share_card_ready", { sessionId: payload.sessionId, card });
        if (bSocket) io.to(bSocket.id).emit("share_card_ready", { sessionId: payload.sessionId, card });
      }
    });

    socket.on("add_friend", async (payload: { sessionId: string }) => {
      const win = postSessionWindows.get(payload.sessionId);
      if (!win) return;

      if (userId === win.aUserId) win.aWantsFriend = true;
      else if (userId === win.bUserId) win.bWantsFriend = true;
      else return;

      if (win.aWantsFriend && win.bWantsFriend) {
        await makeFriends(win.aUserId, win.bUserId);
        const aSocket = socketsByUser.get(win.aUserId);
        const bSocket = socketsByUser.get(win.bUserId);
        if (aSocket) io.to(aSocket.id).emit("friend_added", { sessionId: payload.sessionId });
        if (bSocket) io.to(bSocket.id).emit("friend_added", { sessionId: payload.sessionId });
      }
    });

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

    socket.on("block", async (payload: { sessionId: string }) => {
      const session = sessions.get(payload.sessionId);
      if (!session) return;
      const peer = session.a.socketId === socket.id ? session.b : session.a;
      if (peer.socketId === socket.id) return;

      await createBlock(userId, peer.userId);
      await endSession(io, payload.sessionId, "block");
    });

    socket.on("safe_mode_consent", (payload: { sessionId: string }) => {
      const session = sessions.get(payload.sessionId);
      if (!session || !session.safeMode.active) return;

      const isA = session.a.socketId === socket.id;
      if (!isA && session.b.socketId !== socket.id) return;
      if (isA) session.safeMode.aConsent = true;
      else session.safeMode.bConsent = true;

      const bothConsented = session.safeMode.aConsent && session.safeMode.bConsent;
      if (bothConsented) session.safeMode.active = false;

      io.to(session.a.socketId).emit("safe_mode_status", {
        sessionId: payload.sessionId,
        selfConsented: session.safeMode.aConsent,
        peerConsented: session.safeMode.bConsent,
        cleared: bothConsented,
      });
      io.to(session.b.socketId).emit("safe_mode_status", {
        sessionId: payload.sessionId,
        selfConsented: session.safeMode.bConsent,
        peerConsented: session.safeMode.aConsent,
        cleared: bothConsented,
      });
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

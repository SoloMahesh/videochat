"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket/client";

export type ChatMode = "VIDEO" | "TEXT";
export type GenderFilter = "MALE" | "FEMALE" | "OTHER" | "ANY";
export type ReportReason = "NUDITY" | "HARASSMENT" | "MINOR_SUSPECTED" | "SPAM" | "OTHER";
export type CallStatus = "idle" | "searching" | "connected" | "banned" | "error";
export type ChatMessage = { from: "me" | "stranger"; text: string };
export type ShareCard = { sharedTags: string[]; mode: ChatMode; durationSeconds: number; vibe: string };
export type SafeModeState = { active: boolean; selfConsented: boolean; peerConsented: boolean };
export type SearchOptions = { mode: ChatMode; interestTags: string[]; language?: string; desiredGender?: GenderFilter };

function buildIceServers(): RTCIceServer[] {
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const servers: RTCIceServer[] = [{ urls: process.env.NEXT_PUBLIC_STUN_URL ?? "stun:stun.l.google.com:19302" }];
  if (turnUrl && process.env.NEXT_PUBLIC_TURN_USERNAME && process.env.NEXT_PUBLIC_TURN_CREDENTIAL) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

const REMATCH_WINDOW_MS = 30_000;

export function useWebRTC() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sharedTags, setSharedTags] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [rematch, setRematch] = useState<{ sessionId: string; requestedByMe: boolean } | null>(null);
  const [cardOffer, setCardOffer] = useState<{ sessionId: string; requestedByMe: boolean } | null>(null);
  const [shareCard, setShareCard] = useState<ShareCard | null>(null);
  const [safeMode, setSafeMode] = useState<SafeModeState | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastOptsRef = useRef<SearchOptions>({ mode: "VIDEO", interestTags: [] });
  const rematchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socketRef = useRef(getSocket());

  const teardownPeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    sessionIdRef.current = null;
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const ensureLocalMedia = useCallback(async (mode: ChatMode) => {
    if (mode === "TEXT") return null;
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  const createPeerConnection = useCallback((sessionId: string, mode: ChatMode) => {
    const socket = socketRef.current;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("signal", { sessionId, type: "ice-candidate", payload: e.candidate });
    };
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0] ?? null;
    };

    if (mode === "VIDEO" && localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current as MediaStream));
    }

    pcRef.current = pc;
    return pc;
  }, []);

  const clearRematchTimer = useCallback(() => {
    if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    rematchTimeoutRef.current = null;
  }, []);

  const requeue = useCallback(
    (endedSessionId: string | null, offerRematch: boolean) => {
      teardownPeer();
      setMessages([]);
      setWarning(null);
      setStatus("searching");
      clearRematchTimer();
      if (offerRematch && endedSessionId) {
        setRematch({ sessionId: endedSessionId, requestedByMe: false });
        setCardOffer({ sessionId: endedSessionId, requestedByMe: false });
        rematchTimeoutRef.current = setTimeout(() => {
          setRematch(null);
          setCardOffer(null);
        }, REMATCH_WINDOW_MS);
      } else {
        setRematch(null);
        setCardOffer(null);
      }
      socketRef.current.emit("join_queue", lastOptsRef.current);
    },
    [teardownPeer, clearRematchTimer],
  );

  const start = useCallback(
    async (opts: SearchOptions) => {
      lastOptsRef.current = opts;
      setStatus("searching");
      setMessages([]);
      setWarning(null);
      try {
        await ensureLocalMedia(opts.mode);
      } catch {
        setStatus("error");
        return;
      }
      const socket = socketRef.current;
      if (!socket.connected) socket.connect();
      socket.emit("join_queue", opts);
    },
    [ensureLocalMedia],
  );

  const skip = useCallback(() => {
    const endedSessionId = sessionIdRef.current;
    if (endedSessionId) socketRef.current.emit("skip", { sessionId: endedSessionId });
    requeue(endedSessionId, true);
  }, [requeue]);

  const report = useCallback(
    (reason: ReportReason) => {
      if (sessionIdRef.current) socketRef.current.emit("report", { sessionId: sessionIdRef.current, reason });
      requeue(null, false);
    },
    [requeue],
  );

  const block = useCallback(() => {
    if (sessionIdRef.current) socketRef.current.emit("block", { sessionId: sessionIdRef.current });
    requeue(null, false);
  }, [requeue]);

  const stop = useCallback(() => {
    if (sessionIdRef.current) socketRef.current.emit("skip", { sessionId: sessionIdRef.current });
    socketRef.current.emit("leave_queue");
    teardownPeer();
    stopLocalMedia();
    clearRematchTimer();
    setRematch(null);
    setCardOffer(null);
    setSafeMode(null);
    setStatus("idle");
  }, [teardownPeer, stopLocalMedia, clearRematchTimer]);

  const requestRematch = useCallback(() => {
    setRematch((prev) => {
      if (!prev) return prev;
      socketRef.current.emit("rematch", { sessionId: prev.sessionId });
      return { ...prev, requestedByMe: true };
    });
  }, []);

  const requestShareCard = useCallback(() => {
    setCardOffer((prev) => {
      if (!prev) return prev;
      socketRef.current.emit("share_card", { sessionId: prev.sessionId });
      return { ...prev, requestedByMe: true };
    });
  }, []);

  const dismissShareCard = useCallback(() => setShareCard(null), []);

  const consentSafeMode = useCallback(() => {
    if (!sessionIdRef.current) return;
    socketRef.current.emit("safe_mode_consent", { sessionId: sessionIdRef.current });
  }, []);

  const sendMessage = useCallback((text: string) => {
    if (!sessionIdRef.current || !text.trim()) return;
    socketRef.current.emit("chat_message", { sessionId: sessionIdRef.current, text });
    setMessages((prev) => [...prev, { from: "me", text }]);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;

    async function onMatched(data: { sessionId: string; isInitiator: boolean; sharedTags: string[]; safeMode: boolean }) {
      sessionIdRef.current = data.sessionId;
      setSharedTags(data.sharedTags);
      setStatus("connected");
      clearRematchTimer();
      setRematch(null);
      setCardOffer(null);
      setSafeMode(data.safeMode ? { active: true, selfConsented: false, peerConsented: false } : null);

      const pc = createPeerConnection(data.sessionId, lastOptsRef.current.mode);
      if (data.isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("signal", { sessionId: data.sessionId, type: "offer", payload: offer });
      }
    }

    async function onSignal(data: { sessionId: string; type: string; payload: unknown }) {
      const pc = pcRef.current;
      if (!pc || data.sessionId !== sessionIdRef.current) return;

      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { sessionId: data.sessionId, type: "answer", payload: answer });
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
      } else if (data.type === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.payload as RTCIceCandidateInit));
        } catch {
          // candidate arrived before remote description was set; safe to drop
        }
      }
    }

    function onChatMessage(data: { sessionId: string; text: string }) {
      if (data.sessionId !== sessionIdRef.current) return;
      setMessages((prev) => [...prev, { from: "stranger", text: data.text }]);
    }

    function onSessionEnded(data: { sessionId: string; reason: string }) {
      if (data.sessionId !== sessionIdRef.current) return;
      if (data.reason === "banned") {
        teardownPeer();
        stopLocalMedia();
        setStatus("banned");
        return;
      }
      requeue(data.sessionId, data.reason === "skip" || data.reason === "disconnect");
    }

    function onModerationFlag(data: { severity: "warn" | "ban" }) {
      if (data.severity === "warn") setWarning("Keep it appropriate — this stream was flagged.");
    }

    function onShareCardReady(data: { sessionId: string; card: ShareCard }) {
      setCardOffer(null);
      setShareCard(data.card);
    }

    function onFilterDowngraded() {
      setWarning("Not enough coins for that gender filter — searching without it this time.");
    }

    function onSafeModeStatus(data: { sessionId: string; selfConsented: boolean; peerConsented: boolean; cleared: boolean }) {
      if (data.sessionId !== sessionIdRef.current) return;
      setSafeMode(data.cleared ? null : { active: true, selfConsented: data.selfConsented, peerConsented: data.peerConsented });
    }

    function onConnectError() {
      setStatus("error");
    }

    socket.on("matched", onMatched);
    socket.on("signal", onSignal);
    socket.on("chat_message", onChatMessage);
    socket.on("session_ended", onSessionEnded);
    socket.on("moderation_flag", onModerationFlag);
    socket.on("share_card_ready", onShareCardReady);
    socket.on("filter_downgraded", onFilterDowngraded);
    socket.on("safe_mode_status", onSafeModeStatus);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("matched", onMatched);
      socket.off("signal", onSignal);
      socket.off("chat_message", onChatMessage);
      socket.off("session_ended", onSessionEnded);
      socket.off("moderation_flag", onModerationFlag);
      socket.off("share_card_ready", onShareCardReady);
      socket.off("filter_downgraded", onFilterDowngraded);
      socket.off("safe_mode_status", onSafeModeStatus);
      socket.off("connect_error", onConnectError);
    };
  }, [createPeerConnection, requeue, teardownPeer, stopLocalMedia, clearRematchTimer]);

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== "connected" && status !== "searching") return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") stop();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, stop]);

  return {
    status,
    messages,
    sharedTags,
    warning,
    localVideoRef,
    remoteVideoRef,
    start,
    skip,
    report,
    block,
    stop,
    sendMessage,
    rematch,
    requestRematch,
    cardOffer,
    shareCard,
    requestShareCard,
    dismissShareCard,
    safeMode,
    consentSafeMode,
    sessionId: sessionIdRef.current,
  };
}

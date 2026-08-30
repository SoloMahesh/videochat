"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { getSocket } from "@/lib/socket/client";

type Friend = { id: string; name: string | null; image: string | null };
type Message = { id: string; senderId: string; recipientId: string; text: string; createdAt: string };

export default function DmThreadPage() {
  const params = useParams<{ id: string }>();
  const friendId = params.id;
  const [friend, setFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [notFriends, setNotFriends] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/friends/${friendId}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(`/api/messages?with=${friendId}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([friendData, messagesData]) => {
        setFriend(friendData.friend);
        setMessages(messagesData.messages ?? []);
      })
      .catch(() => setNotFriends(true));
  }, [friendId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    function onDm(data: Message) {
      if (data.senderId !== friendId) return;
      setMessages((prev) => [...prev, data]);
    }
    socket.on("dm_message", onDm);
    return () => {
      socket.off("dm_message", onDm);
    };
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: friendId, text }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
    }
  }

  if (notFriends) {
    return (
      <>
        <AmbientBackground />
        <div className="flex min-h-screen items-center justify-center px-6 text-center font-mono text-sm text-ink-muted">
          You&rsquo;re not friends with this person (or never were) — DMs only work between mutual friends.
        </div>
      </>
    );
  }

  return (
    <>
      <AmbientBackground />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Link href="/friends" className="font-mono text-xs text-ink-muted hover:text-ink">
          ← Friends
        </Link>
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="text-lg">{friend?.image ?? "👤"}</span>
          {friend?.name ?? "Anonymous"}
        </span>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col px-6 pb-6" style={{ height: "calc(100vh - 100px)" }}>
        <div className="glass flex-1 overflow-y-auto rounded-xl2 p-4">
          {messages.map((m) => (
            <div key={m.id} className={`mb-2 flex ${m.senderId === friendId ? "justify-start" : "justify-end"}`}>
              <span
                className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                  m.senderId === friendId ? "bg-surface-2 text-ink" : "bg-accent text-white"
                }`}
              >
                {m.text}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            className="flex-1 rounded-full border border-line bg-surface-2 px-4 py-3 text-sm focus:border-accent focus:outline-none"
          />
          <button type="submit" className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white">
            Send
          </button>
        </form>
      </main>
    </>
  );
}

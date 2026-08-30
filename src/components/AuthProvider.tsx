"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

function GuestMergeOnSignIn() {
  const { status } = useSession();
  const merged = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !merged.current) {
      merged.current = true;
      fetch("/api/account/merge-guest", { method: "POST" }).catch(() => {
        merged.current = false;
      });
    }
    if (status === "unauthenticated") {
      merged.current = false;
    }
  }, [status]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GuestMergeOnSignIn />
      {children}
    </SessionProvider>
  );
}

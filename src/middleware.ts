import { NextResponse } from "next/server";

/**
 * Security headers for every response.
 *
 * script-src keeps 'unsafe-inline' rather than a per-request nonce: most
 * routes here are statically prerendered at build time (next build output
 * marks "/" and most pages "○ Static"), so a nonce minted per-request in
 * middleware can never match the nonce baked into HTML that was rendered
 * once at build time — verified live with Playwright, a nonce+strict-dynamic
 * CSP blocked every Next.js bootstrap script and broke the app entirely.
 * Host-restricting to 'self' plus the other locked-down directives below
 * still blocks the classes of attack that matter most for this app
 * (loading a third-party script, exfiltrating to a third-party origin,
 * framing the site).
 *
 * connect-src allows stun:/turn:/turns: because the TURN/STUN server URL
 * is operator-configured (NEXT_PUBLIC_STUN_URL / NEXT_PUBLIC_TURN_URL) and
 * can point anywhere the operator deploys coturn.
 */
export function middleware() {
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data:;
    font-src 'self';
    connect-src 'self' stun: turn: turns:;
    media-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), payment=(self)",
  );
  // includeSubDomains only — omit `preload` until the domain's HTTPS setup
  // is confirmed stable, since HSTS preload is very hard to undo later.
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

/*
 * OfflineBanner (P42-W5 / GAP-X2) — the merchant dashboard's honest
 * device-offline strip. Mirrors the storefront tracking page's family
 * pattern (tracking-client.tsx: the quiet WifiOff line + role=status),
 * promoted to the shell so every merchant surface carries it: when
 * navigator.onLine flips false, a thin muted strip appears under the
 * topbar — never a toast (it must persist while offline), never a
 * "saved" claim (it asserts nothing about pending writes; failures
 * still surface per-surface with retry).
 *
 * Server failure while online is a DIFFERENT state (per-surface
 * ErrorState with retry) and is deliberately not conflated here.
 */

function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  // SSR renders online (no false outage painted into the HTML); the
  // client snapshot corrects it right after hydration if truly offline.
  return true;
}

export function OfflineBanner() {
  const online = React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot,
  );

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-border bg-muted text-muted-foreground"
    >
      <p className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-1.5 px-4 py-1.5 text-[11px] font-medium sm:px-6 lg:px-8">
        <WifiOff className="size-3 shrink-0" aria-hidden="true" />
        لا يوجد اتصال بالإنترنت — تحقق من شبكتك
      </p>
    </div>
  );
}

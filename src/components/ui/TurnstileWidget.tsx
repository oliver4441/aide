"use client";

import { useCallback, useEffect, useRef } from "react";

interface TurnstileWidgetProps {
  action: "login" | "signup";
  onToken: (token: string | null) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/** A widget handle the form can use to reset and await a fresh token. */
export interface TurnstileHandle {
  reset: () => void;
  nextToken: (timeoutMs?: number) => Promise<string | null>;
}

/**
 * Cloudflare Turnstile widget. Renders only when a site key is configured;
 * the backend also fails open without a secret, so local/dev works keyless.
 *
 * Tokens are single-use; call handle.reset() after each submit so retries
 * always get a new token.
 */
export default function TurnstileWidget({
  action,
  onToken,
  handleRef,
}: TurnstileWidgetProps & { handleRef?: React.MutableRefObject<TurnstileHandle | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  const waitersRef = useRef<Array<(t: string | null) => void>>([]);
  onTokenRef.current = onToken;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const emit = useCallback((token: string | null) => {
    onTokenRef.current(token);
    if (token) {
      const waiters = waitersRef.current;
      waitersRef.current = [];
      waiters.forEach((w) => w(token));
    }
  }, []);

  useEffect(() => {
    if (!siteKey || !hostRef.current) return;

    const render = () => {
      if (!window.turnstile || !hostRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey,
        action,
        theme: "auto",
        callback: emit,
        "expired-callback": () => emit(null),
        "error-callback": () => emit(null),
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", render);
      widgetIdRef.current = undefined;
    };
  }, [siteKey, action, emit]);

  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      reset: () => {
        emit(null);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      },
      nextToken: (timeoutMs = 8000) =>
        new Promise((resolve) => {
          const timer = setTimeout(() => {
            waitersRef.current = waitersRef.current.filter((w) => w !== waiter);
            resolve(null);
          }, timeoutMs);
          const waiter = (t: string | null) => {
            clearTimeout(timer);
            resolve(t);
          };
          waitersRef.current.push(waiter);
        }),
    };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, emit]);

  if (!siteKey) return null;

  return (
    <div className="flex justify-center py-1" data-turnstile-action={action}>
      <div ref={hostRef} />
    </div>
  );
}

/** Reset the widget through its form-attached handle. */
export function resetTurnstile(form: HTMLElement | null) {
  const host = form?.querySelector<HTMLElement>("[data-turnstile-action] div");
  const reset = host && (host as any).__resetTurnstile;
  if (typeof reset === "function") reset();
}

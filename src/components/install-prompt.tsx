// InstallPrompt — small, tasteful "Add FED to Home screen" prompt.
//
// TWO paths:
//  1. iOS Safari — never fires `beforeinstallprompt`, so it's invisible to the
//     native flow. Instead we show a warm, dismissible card explaining the
//     manual Share → "Add to Home Screen" steps.
//  2. Android/desktop — uses the native `beforeinstallprompt` flow (unchanged).
//
// Renders nothing on the server. The prompt only appears once and disappears
// after install or dismiss (both paths remember dismissal via localStorage).
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fed_install_hint_dismissed";

/** True when running on an iOS device (iPhone/iPad/iPod, incl. iPadOS which
 *  reports itself as a Mac with touch). iOS never fires beforeinstallprompt. */
function isIOS(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS ≥13 on desktop-class Safari reports a Mac UA but has a touchscreen.
  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

/** True when the app is already running standalone from the home screen. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  } catch {
    /* ignore */
  }
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* storage unavailable — ignore */
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [settled, setSettled] = useState(false);
  // iOS manual-hint visibility: brief delay so it feels considered, never
  // flashing over the first paint.
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isIOS() || isStandalone() || wasDismissed()) {
      // On iOS we show a manual hint after a beat, but never standalone or if
      // the user already dismissed it.
      if (isIOS() && !isStandalone() && !wasDismissed()) {
        const t = setTimeout(() => setShowIos(true), 1500);
        return () => clearTimeout(t);
      }
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setSettled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissAll = () => {
    markDismissed();
    setShowIos(false);
    setSettled(true);
  };

  // iOS manual "Add to Home Screen" hint (beforeinstallprompt never fires here).
  if (showIos) {
    return (
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        <div className="card max-w-sm border-0 !p-4 shadow-glow">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-tight text-ink">
              Add FED to your Home Screen
            </p>
            <button
              type="button"
              onClick={dismissAll}
              aria-label="Dismiss"
              className="rounded-full p-1 text-ink-soft transition hover:bg-paper-deep"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Tap the{" "}
            <span className="font-semibold text-ink">Share</span> button{" "}
            <span aria-hidden className="inline-flex translate-y-[2px]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>{" "}
            in the toolbar, then choose{" "}
            <span className="font-semibold text-ink">“Add to Home Screen”</span>.
            Open FED in one tap, even offline.
          </p>
        </div>
      </div>
    );
  }

  if (!deferred || settled) return null;

  const dismiss = () => {
    markDismissed();
    setSettled(true);
  };

  const install = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setSettled(true);
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="card flex max-w-sm items-center gap-3 border-0 !p-3 pr-2 shadow-glow">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-ink">
            Add FED to your home screen
          </p>
          <p className="text-xs text-ink-soft">
            Open it in one tap, even offline.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="btn-primary shrink-0 !px-4 !py-2 text-sm"
        >
          Add
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1.5 text-ink-soft transition hover:bg-paper-deep"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

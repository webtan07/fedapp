// InstallPrompt — small, tasteful "Add FED to Home screen" prompt.
//
// Surfaces the browser's native `beforeinstallprompt` so a phone/desktop user
// can install FED to their home screen (standalone, no app store). Renders
// nothing on the server, and only appears once the browser actually fires the
// installable event — it disappears after the user installs or dismisses.
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [settled, setSettled] = useState(false);

  useEffect(() => {
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

  if (!deferred || settled) return null;

  const dismiss = () => setSettled(true);

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

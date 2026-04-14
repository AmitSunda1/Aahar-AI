import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallPrompt — shows a subtle "Add to Home Screen" pill when the browser
 * fires the beforeinstallprompt event. Dismissed after install or user ignores it.
 */
export const InstallPrompt = () => {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — hide the prompt entirely
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstallEvent(null);
      setIsInstalled(true);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    } else {
      setDismissed(true);
    }
  };

  if (!installEvent || dismissed || isInstalled) return null;

  return (
    <div
      className="fixed bottom-[132px] left-1/2 z-50 -translate-x-1/2 w-[calc(100%-32px)] max-w-[420px]"
      role="banner"
      aria-label="Install Aahar AI"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-primary/30 bg-grey-900/95 px-4 py-3 shadow-[0_8px_32px_rgba(11,95,255,0.2)] backdrop-blur-xl">
        {/* Icon */}
        <img
          src="/icons/icon-72x72.png"
          alt="Aahar AI"
          className="h-10 w-10 rounded-xl flex-shrink-0"
        />

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-base-white leading-tight">
            Add to Home Screen
          </p>
          <p className="text-xs text-grey-400 mt-0.5">
            Install for a faster, app-like experience
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-grey-500 hover:text-grey-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleInstall}
            className="rounded-xl bg-accent-primary px-3 py-2 text-sm font-semibold text-base-white transition-opacity active:opacity-80"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

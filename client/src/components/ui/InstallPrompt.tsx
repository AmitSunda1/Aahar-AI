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
  const [isReady, setIsReady] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  const dismissPrompt = () => {
    setDismissed(true);
    localStorage.setItem("aahar_install_prompt_dismissed", "1");
  };

  useEffect(() => {
    if (localStorage.getItem("aahar_install_prompt_dismissed") === "1") {
      setDismissed(true);
      return;
    }

    // Already running as installed PWA — hide the prompt entirely
    const runningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;

    if (runningStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setIsReady(true);
    };

    const onAppInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
      localStorage.setItem("aahar_install_prompt_dismissed", "1");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onAppInstalled);

    // Some browsers never dispatch beforeinstallprompt immediately.
    // We still surface a manual install hint after a short delay.
    const readyTimer = window.setTimeout(() => setIsReady(true), 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.clearTimeout(readyTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      setShowManualSteps(true);
      return;
    }

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallEvent(null);
        localStorage.setItem("aahar_install_prompt_dismissed", "1");
      } else {
        dismissPrompt();
      }
    } catch {
      setShowManualSteps(true);
    }
  };

  const isiOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);

  if (dismissed || isInstalled || !isReady) return null;

  return (
    <div
      className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[80] w-[calc(100%-24px)] max-w-[460px] -translate-x-1/2"
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
            {installEvent
              ? "Install for a faster, app-like experience"
              : isiOS
                ? "Tap Share, then choose Add to Home Screen"
                : "Open browser menu and tap Install app"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={dismissPrompt}
            className="p-1.5 text-grey-500 hover:text-grey-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
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

      {showManualSteps && (
        <div className="mt-3 rounded-2xl border border-grey-700/70 bg-grey-900/95 p-4 text-grey-200 shadow-card">
          <p className="text-sm font-semibold text-base-white">Install steps</p>
          {isiOS ? (
            <p className="mt-2 text-xs leading-5">
              In Safari: tap the Share icon, then tap Add to Home Screen.
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5">
              In your browser menu, choose Install app or Add to Home Screen.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowManualSteps(false)}
            className="mt-3 rounded-lg border border-grey-700/70 px-3 py-1.5 text-xs font-medium text-grey-300"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

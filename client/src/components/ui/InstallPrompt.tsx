import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallPrompt — shows an install sheet when the browser fires
 * beforeinstallprompt, with manual steps for browsers that need them.
 */
export const InstallPrompt = () => {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const isiOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
  const canShowNativeInstall = Boolean(installEvent);
  const shouldShowManualInstall = !canShowNativeInstall && isiOS;

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
      setShowManualSteps(false);
    };

    const onAppInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
      localStorage.setItem("aahar_install_prompt_dismissed", "1");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onAppInstalled);

    // iOS Safari does not support beforeinstallprompt, so we still show
    // the install prompt with manual instructions there.
    const readyTimer = window.setTimeout(() => {
      if (isiOS) {
        setIsReady(true);
      }
    }, 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.clearTimeout(readyTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) {
      if (shouldShowManualInstall) {
        setShowManualSteps(true);
      }
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
      if (shouldShowManualInstall) {
        setShowManualSteps(true);
      }
    }
  };

  if (dismissed || isInstalled || !isReady) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-[80] mx-auto w-full max-w-[450px] px-4"
      role="banner"
      aria-label="Install Aahar AI"
    >
      <div className="relative overflow-hidden rounded-[28px] border border-accent-primary/35 bg-[linear-gradient(145deg,rgba(28,28,30,0.98),rgba(9,13,24,0.96))] p-4 text-base-white shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-2xl animate-modal-sheet">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/70 to-transparent" />

        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-base-white/10 bg-base-white/8 shadow-[0_12px_30px_rgba(11,95,255,0.28)]">
            <img
              src="/icons/Aahar-ai-logo.webp"
              alt="Aahar AI"
              className="h-12 w-12 rounded-[16px] object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[18px] font-semibold leading-6 text-base-white">
              Install Aahar AI
            </p>
            <p className="mt-1 text-[13px] leading-5 text-grey-300">
              {canShowNativeInstall
                ? "Open it like a real app with faster access to meals, workouts, and progress."
                : isiOS
                  ? "Add it to your home screen for quick access from Safari."
                  : "Install is not available in this browser right now."}
            </p>
          </div>

          <button
            type="button"
            onClick={dismissPrompt}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-grey-700/60 bg-grey-900/70 text-grey-400 transition-all hover:text-base-white active:scale-90"
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
        </div>

        <div className="mt-5 flex justify-end">
          {canShowNativeInstall || shouldShowManualInstall ? (
            <button
              type="button"
              onClick={handleInstall}
              className="h-12 min-w-[132px] rounded-full bg-accent-primary px-5 text-[14px] font-semibold text-base-white shadow-[0_12px_30px_rgba(11,95,255,0.34)] transition-all hover:bg-[#245fff] active:scale-[0.98]"
            >
              {canShowNativeInstall ? "Install" : "Show steps"}
            </button>
          ) : null}
        </div>
      </div>

      {showManualSteps && (
        <div className="mt-3 rounded-[22px] border border-grey-700/70 bg-grey-900/95 p-4 text-grey-200 shadow-card-lg backdrop-blur-xl animate-soft-rise">
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
            className="mt-3 h-9 rounded-full border border-grey-700/70 px-4 text-xs font-semibold text-grey-300 transition-all active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

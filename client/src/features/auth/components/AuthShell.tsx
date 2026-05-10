import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import splashBg from "../../../assets/Sign-up-img.webp";
import splashLogo from "../../../assets/Splash-logo.webp";

interface AuthShellProps {
  children: ReactNode;
  showBack?: boolean;
}

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export const AuthShell = ({ children, showBack = true }: AuthShellProps) => {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-base-black text-base-white">
      <div className="absolute inset-0 z-0">
        <img
          src={splashBg}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.18)_34%,rgba(0,0,0,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_82%,rgba(11,95,255,0.28),transparent_36%)]" />
      </div>

      <header className="relative z-20 flex items-center justify-between px-5 pt-[max(22px,env(safe-area-inset-top))]">
        {showBack ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-base-white/[0.12] bg-base-black/35 text-base-white shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-md transition-all hover:bg-base-black/50 active:scale-95"
            aria-label="Go back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="h-11 w-11" />
        )}

        <img
          src={splashLogo}
          alt="Aahar AI"
          className="h-16 w-auto object-contain"
        />
      </header>

      <main className="relative z-10 mt-auto w-full px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-10">
        {children}
      </main>
    </div>
  );
};

export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => {
  return (
    <section className="mx-auto w-full max-w-md rounded-[28px] border border-base-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.88),rgba(8,10,16,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl animate-soft-rise">
      <div className="mb-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
          Aahar AI
        </p>
        <h1 className="text-[28px] font-semibold leading-9 text-base-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[14px] leading-6 text-grey-300">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
};


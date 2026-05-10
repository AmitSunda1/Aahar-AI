import { useNavigate } from "react-router-dom";
import splashBg from "../assets/Sign-up-img.webp";
import splashlogo from "../assets/Splash-logo.webp";


export const Splash = () => {
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
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0.18)_36%,rgba(0,0,0,0.92)_100%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(11,95,255,0.26),transparent_34%)]" />
            </div>

            <header className="relative z-20 flex items-center justify-between px-6 pt-[max(24px,env(safe-area-inset-top))]">
                <img
                    src={splashlogo}
                    alt="Aahar AI"
                    className="h-20 w-auto object-contain"
                />
                {/* <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="rounded-full border border-base-white/[0.14] bg-base-black/35 px-4 py-2 text-[13px] font-semibold text-base-white backdrop-blur-md transition-all active:scale-[0.98]"
                >
                    Sign in
                </button> */}
            </header>

            <main className="relative z-10 mt-auto px-6 pb-[max(30px,env(safe-area-inset-bottom))]">
                <div className="absolute inset-x-3 bottom-3 top-[-18px] -z-10 rounded-[34px] bg-base-black/42 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-[1px]" />
                <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-base-white/10 bg-base-white/[0.08] px-3 py-2 backdrop-blur-md animate-soft-rise">
                    <span className="h-2 w-2 rounded-full bg-accent-primary shadow-[0_0_18px_rgba(11,95,255,0.8)]" />
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-grey-200">
                        Built for Indian routines
                    </span>
                </div>

                <h1 className="max-w-[360px] text-[32px] font-semibold leading-[44px] tracking-normal text-base-white animate-soft-rise animate-stagger-1">
                    Nutrition and fitness that adapts to your day.
                </h1>

                <p className="mt-4 max-w-[340px] text-[15px] leading-6 text-grey-200 animate-soft-rise animate-stagger-2">
                    Plan meals, log progress, and keep workouts aligned with your body, goals, and schedule.
                </p>

                {/* <div className="mt-6 grid grid-cols-3 gap-2 animate-soft-rise animate-stagger-2">
                    <div className="rounded-[18px] border border-base-white/10 bg-base-white/[0.07] px-3 py-3 backdrop-blur-md">
                        <p className="text-[11px] font-semibold text-grey-400">Meals</p>
                        <p className="mt-1 text-[13px] font-semibold text-base-white">AI plans</p>
                    </div>
                    <div className="rounded-[18px] border border-base-white/10 bg-base-white/[0.07] px-3 py-3 backdrop-blur-md">
                        <p className="text-[11px] font-semibold text-grey-400">Workout</p>
                        <p className="mt-1 text-[13px] font-semibold text-base-white">Daily fit</p>
                    </div>
                    <div className="rounded-[18px] border border-base-white/10 bg-base-white/[0.07] px-3 py-3 backdrop-blur-md">
                        <p className="text-[11px] font-semibold text-grey-400">Progress</p>
                        <p className="mt-1 text-[13px] font-semibold text-base-white">Tracked</p>
                    </div>
                </div> */}

                <div className="mt-7 flex flex-col gap-3 animate-soft-rise animate-stagger-3">
                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="flex h-[54px] w-full items-center justify-center rounded-full bg-accent-primary text-[15px] font-semibold text-base-white shadow-[0_16px_38px_rgba(11,95,255,0.36)] transition-all hover:bg-[#245fff] active:scale-[0.98]"
                    >
                        Create your plan
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="flex h-[52px] w-full items-center justify-center rounded-full border border-base-white/[0.14] bg-base-black/35 text-[15px] font-semibold text-base-white backdrop-blur-md transition-all active:scale-[0.98]"
                    >
                        Continue with Email
                    </button>
                </div>

                <p className="mt-5 text-center text-[11px] leading-4 text-grey-500 animate-soft-rise animate-stagger-3">
                    Health details stay private and are only used to personalize your experience.
                </p>
            </main>
        </div>
    );
};

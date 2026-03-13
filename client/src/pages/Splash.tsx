import { useNavigate } from "react-router-dom";
import splashBg from "../assets/Sign-up-img.webp";

export const Splash = () => {
    const navigate = useNavigate();

    return (
        <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 w-full h-full z-0">
                <img
                    src={splashBg}
                    alt="Fitness Background"
                    className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full px-6 pb-8 flex flex-col text-left">
                <h1 className="text-[28px] leading-[36px] font-semibold tracking-normal uppercase mb-3">
                    AAHAR AI
                </h1>

                <p className="text-[18px] leading-[26px] font-medium mb-2 pr-4">
                    Your personal nutrition & fitness coach for Indian lifestyles.
                </p>

                <p className="text-[14px] leading-[22px] text-grey-300 mb-8 max-w-[90%]">
                    Personalized meals and workouts, built around your body and routine.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 w-full mt-4">
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full h-12 flex items-center justify-center bg-base-black/80 backdrop-blur-sm border border-grey-700/50 rounded-full text-[14px] leading-[20px] font-medium text-base-white transition-opacity active:opacity-70"
                    >
                        Continue with Email
                    </button>

                    <button
                        onClick={() => {
                            // Google OAuth placeholder
                            console.log("Google OAuth Placeholder");
                        }}
                        className="w-full h-12 flex items-center justify-center bg-base-white rounded-full text-[14px] leading-[20px] font-medium text-base-black transition-opacity active:opacity-70 shadow-card"
                    >
                        Continue with Google
                    </button>
                </div>

                <p className="text-[11px] leading-[14px] text-grey-500 text-center mt-6">
                    We don't store any health data until onboarding is complete.
                </p>
            </div>
        </div>
    );
};

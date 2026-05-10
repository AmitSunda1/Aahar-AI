import { useNavigate } from "react-router-dom";
import splashBg from "../assets/Sign-up-img.webp";
import splashlogo from "../assets/Splash-logo.webp";


export const Splash = () => {
    const navigate = useNavigate();

    return (
        <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
            {/* Header / Logo */}
            <div className="absolute -top-7 left-0 w-full px-6 pt-12 z-20 flex items-center">
                <img
                    src={splashlogo}
                    alt="Aahar AI"
                    className="h-23 w-auto object-contain animate-soft-drop"
                />
            </div>

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
                
                <p className="text-[18px] leading-[26px] font-medium mb-2 pr-4 animate-soft-rise animate-stagger-1">
                    Your personal nutrition & fitness coach for Indian lifestyles.
                </p>

                <p className="text-[14px] leading-[22px] text-grey-300 mb-8 max-w-[90%] animate-soft-rise animate-stagger-2">
                    Personalized meals and workouts, built around your body and routine.
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-3 w-full mt-4">
                    <button
                        onClick={() => navigate("/login")}
                        className="w-full h-12 flex items-center justify-center bg-base-black/80 backdrop-blur-sm border border-grey-700/50 rounded-full text-[14px] leading-[20px] font-medium text-base-white transition-all hover:border-grey-600/70 hover:bg-base-black/90 active:scale-[0.98] active:opacity-70 animate-soft-rise animate-stagger-3"
                    >
                        Continue with Email
                    </button>

                    {/* <button
                        onClick={() => {
                            // Google OAuth placeholder
                            console.log("Google OAuth Placeholder");
                        }}
                        className="w-full h-12 flex items-center justify-center bg-base-white rounded-full text-[14px] leading-[20px] font-medium text-base-black transition-opacity active:opacity-70 shadow-card"
                    >
                        Continue with Google
                    </button> */}
                </div>

                <p className="text-[11px] leading-[14px] text-grey-500 text-center mt-6 animate-soft-rise animate-stagger-3">
                    We don't store any health data until onboarding is complete.
                </p>
            </div>
        </div>
    );
};

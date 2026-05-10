import { SignupForm } from "../../features/auth";
import splashBg from "../../assets/Sign-up-img.webp";
import { useNavigate } from "react-router-dom";

export const Signup = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
      {/* Header / Back Button */}
      <div className="absolute top-0 left-0 w-full px-6 pt-12 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-1 py-2 rounded-full bg-transparent text-base-white hover:text-grey-300 transition-all active:scale-[0.96] animate-soft-drop"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span className="text-[15px] font-medium">Back</span>
        </button>
      </div>

      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={splashBg}
          alt="Fitness Background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>
      <SignupForm />
    </div>
  );
};

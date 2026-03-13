import { LoginForm } from "../../features/auth";
import splashBg from "../../assets/Sign-up-img.webp";

export const Login = () => {
  return (
    <div className="relative flex flex-col items-center justify-end w-full h-screen min-h-screen text-base-white overflow-hidden bg-base-black">
      <div className="absolute inset-0 w-full h-full z-0">
        <img
          src={splashBg}
          alt="Fitness Background"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>
      <LoginForm />
    </div>
  );
};

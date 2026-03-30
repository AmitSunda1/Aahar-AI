import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

interface TabItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const HomeIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 10.5L12 3L21 10.5V20C21 20.6 20.6 21 20 21H15V14H9V21H4C3.4 21 3 20.6 3 20V10.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogFoodIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 3V11C4 12.1 4.9 13 6 13V21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 3V11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 3V11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17 3C19.2 3 21 4.8 21 7V21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WorkoutIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="9"
      width="4"
      height="6"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <rect
      x="18"
      y="9"
      width="4"
      height="6"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M6 12H18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 8V16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 8V16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M4 21C4.8 17.6 7.9 15 12 15C16.1 15 19.2 17.6 20 21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CameraIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4 8.5C4 7.7 4.7 7 5.5 7H8L9.5 5H14.5L16 7H18.5C19.3 7 20 7.7 20 8.5V18.5C20 19.3 19.3 20 18.5 20H5.5C4.7 20 4 19.3 4 18.5V8.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const tabs: TabItem[] = [
  {
    to: "/dashboard",
    label: "Home",
    icon: <HomeIcon />,
  },
  {
    to: "/log-food",
    label: "Log Food",
    icon: <LogFoodIcon />,
  },
  {
    to: "/workout",
    label: "Workout",
    icon: <WorkoutIcon />,
  },
  {
    to: "/profile",
    label: "Profile",
    icon: <ProfileIcon />,
  },
];

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-base-black text-base-white">
      <main className="pb-[116px]">
        <Outlet />
      </main>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[450px] -translate-x-1/2 px-4 pb-safe pb-3">
        <div className="relative">
          <div className="flex h-[92px] items-end justify-between rounded-[24px] border border-grey-700/50 bg-grey-900/90 px-2 pb-2 shadow-card-lg backdrop-blur-xl">
            {tabs.slice(0, 2).map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => {
                  const active = isActive;
                  return `flex w-[88px] flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                    active
                      ? "text-base-white"
                      : "text-grey-500 hover:text-grey-300"
                  }`;
                }}
              >
                {tab.icon}
                <span className="text-label-sm">{tab.label}</span>
              </NavLink>
            ))}

            <div className="w-[88px]" />

            {tabs.slice(2).map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => {
                  const active = isActive;
                  return `flex w-[88px] flex-col items-center gap-1 rounded-xl py-2 transition-colors ${
                    active
                      ? "text-base-white"
                      : "text-grey-500 hover:text-grey-300"
                  }`;
                }}
              >
                {tab.icon}
                <span className="text-label-sm">{tab.label}</span>
              </NavLink>
            ))}
          </div>

          <NavLink
            to="/log-food/scan"
            className={({ isActive }) =>
              `absolute left-1/2 top-0 flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-[26px] items-center justify-center rounded-full border border-accent-primary/60 transition-all ${
                isActive
                  ? "bg-accent-primary text-base-white shadow-[0_8px_28px_rgba(11,95,255,0.35)]"
                  : "bg-base-black text-accent-primary hover:bg-accent-primary/10"
              }`
            }
            aria-label="Scan food"
          >
            <CameraIcon />
          </NavLink>
        </div>
      </div>
    </div>
  );
};

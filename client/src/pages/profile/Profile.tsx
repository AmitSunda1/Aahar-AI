import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../app/ThemeContext";
import { RevealSection } from "../../components/ui/RevealSection";
import { ProfileSkeleton } from "../../components/ui/skeletons/ProfileSkeleton";
import { TextInput } from "../../components/ui/TextInput";
import { Button } from "../../components/ui/Button";
import {
  useGetMeQuery,
  useLogoutMutation,
  useChangePasswordMutation,
} from "../../features/auth/authApi";
import { useGetHomeDashboardQuery } from "../../features/dashboard/dashboardApi";
import { useSaveOnboardingMutation } from "../../features/onboarding/onboardingApi";

const GENDER_OPTIONS = ["male", "female", "other"] as const;
const GOAL_OPTIONS = [
  "lose_weight",
  "maintain_weight",
  "gain_weight",
  "build_muscle",
] as const;
const ACTIVITY_OPTIONS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;
const DIETARY_OPTIONS = [
  "vegetarian",
  "vegan",
  "pescatarian",
  "gluten_free",
  "dairy_free",
  "nut_free",
  "soy_free",
] as const;

const LogoutIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M14 7L19 12L14 17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 12H9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 5H7.8C6.11984 5 5.27976 5 4.63803 5.32698C4.07354 5.6146 3.6146 6.07354 3.32698 6.63803C3 7.27976 3 8.11984 3 9.8V14.2C3 15.8802 3 16.7202 3.32698 17.362C3.6146 17.9265 4.07354 18.3854 4.63803 18.673C5.27976 19 6.11984 19 7.8 19H11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EditIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M14.5 4.5L19.5 9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 20L8.5 19.2L18.2 9.5C18.8 8.9 18.8 7.9 18.2 7.3L16.7 5.8C16.1 5.2 15.1 5.2 14.5 5.8L4.8 15.5L4 20Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type ProfileFormState = {
  name: string;
  gender: "male" | "female" | "other";
  age: string;
  heightValue: string;
  heightUnit: "cm" | "ft" | "in";
  weightValue: string;
  weightUnit: "kg" | "lb" | "lbs";
  goal: "lose_weight" | "maintain_weight" | "gain_weight" | "build_muscle";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dailySteps: string;
  dietaryPreferences: string[];
  medicalConditionsRaw: string;
};

export const Profile = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { data: meData, isLoading: isLoadingMe } = useGetMeQuery();
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    isFetching: isFetchingDashboard,
  } = useGetHomeDashboardQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [saveOnboarding, { isLoading: isSavingProfile }] =
    useSaveOnboardingMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const [activeModal, setActiveModal] = useState<"profile" | "password" | null>(
    null
  );
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    gender: "male",
    age: "",
    heightValue: "",
    heightUnit: "cm",
    weightValue: "",
    weightUnit: "kg",
    goal: "maintain_weight",
    activityLevel: "moderate",
    dailySteps: "",
    dietaryPreferences: ["vegetarian"],
    medicalConditionsRaw: "",
  });

  const sectionCardClass = isDark
    ? "rounded-[28px] border border-grey-700/40  p-5 shadow-card-lg"
    : "rounded-[28px] border border-[#d9e3f5] bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)]";
  const mutedPanelClass = isDark
    ? "rounded-[22px] border border-grey-700/30 bg-grey-900/45 p-4"
    : "rounded-[22px] border border-[#dbe4f2] bg-[#f8fbff] p-4";
  const selectClass = isDark
    ? "h-14 w-full rounded-card border border-grey-700/40 bg-grey-900 px-4 text-body-lg text-base-white outline-none transition-all focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
    : "h-14 w-full rounded-card border border-[#d8e2f0] bg-white px-4 text-body-lg text-[#1b2430] outline-none transition-all focus:ring-2 focus:ring-inset focus:ring-accent-primary/30";

  const isAnyModalOpen = activeModal !== null || isLogoutConfirmOpen;

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const user = meData?.data?.user;
  const currentWeightKg = dashboardData?.data?.currentWeightKg;

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      gender: user.gender ?? "male",
      age: user.age ? String(user.age) : "",
      heightValue: user.height?.value ? String(user.height.value) : "",
      heightUnit: (user.height?.unit as "cm" | "ft" | "in") ?? "cm",
      weightValue: user.weight?.value ? String(user.weight.value) : "",
      weightUnit: (user.weight?.unit as "kg" | "lb" | "lbs") ?? "kg",
      goal: user.goal ?? "maintain_weight",
      activityLevel: user.activityLevel ?? "moderate",
      dailySteps: user.dailySteps ? String(user.dailySteps) : "",
      dietaryPreferences:
        user.dietaryPreferences && user.dietaryPreferences.length > 0
          ? user.dietaryPreferences
          : ["vegetarian"],
      medicalConditionsRaw: (user.medicalConditions ?? []).join(", "),
    });
  }, [user]);

  useEffect(() => {
    if (!isAnyModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyModalOpen]);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      const message =
        err?.data?.message || "Failed to change password. Please try again.";
      setPasswordError(message);
    }
  };

  const toggleDietaryPreference = (value: (typeof DIETARY_OPTIONS)[number]) => {
    setForm((prev) => {
      const hasValue = prev.dietaryPreferences.includes(value);
      if (hasValue && prev.dietaryPreferences.length === 1) return prev;
      return {
        ...prev,
        dietaryPreferences: hasValue
          ? prev.dietaryPreferences.filter((item) => item !== value)
          : [...prev.dietaryPreferences, value],
      };
    });
  };

  const handleProfileSave = async () => {
    setProfileError(null);
    setProfileSuccess(null);

    if (
      !form.name.trim() ||
      !form.age ||
      !form.heightValue ||
      !form.weightValue ||
      !form.dailySteps
    ) {
      setProfileError("Please complete all required fields.");
      return;
    }

    try {
      await saveOnboarding({
        name: form.name.trim(),
        gender: form.gender,
        age: Number(form.age),
        height: {
          value: Number(form.heightValue),
          unit: form.heightUnit,
        },
        weight: {
          value: Number(form.weightValue),
          unit: form.weightUnit,
        },
        goal: form.goal,
        activityLevel: form.activityLevel,
        dailySteps: Number(form.dailySteps),
        dietaryPreferences:
          form.dietaryPreferences as import("../../features/onboarding/onboarding.types").DietaryPreference[],
        medicalConditions: form.medicalConditionsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }).unwrap();

      setProfileSuccess("Profile updated successfully.");
      setActiveModal(null);
    } catch (err: any) {
      const message =
        err?.data?.message || "Could not update profile. Please try again.";
      setProfileError(message);
    }
  };

  if (
    isLoadingMe ||
    ((isLoadingDashboard || isFetchingDashboard) && !dashboardData)
  ) {
    return <ProfileSkeleton />;
  }

  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const formatLabel = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  const profileItems = [
    { label: "Gender", value: user?.gender ? formatLabel(user.gender) : "Not set" },
    { label: "Age", value: user?.age ? `${user.age} years` : "Not set" },
    {
      label: "Height",
      value: user?.height ? `${user.height.value} ${user.height.unit}` : "Not set",
    },
    {
      label: "Weight",
      value: user?.weight ? `${user.weight.value} ${user.weight.unit}` : "Not set",
    },
    {
      label: "Current Weight",
      value:
        typeof currentWeightKg === "number" ? `${currentWeightKg} kg` : "Not logged",
    },
    { label: "Goal", value: user?.goal ? formatLabel(user.goal) : "Not set" },
    {
      label: "Activity",
      value: user?.activityLevel ? formatLabel(user.activityLevel) : "Not set",
    },
    {
      label: "Daily Steps",
      value:
        typeof user?.dailySteps === "number"
          ? `${user.dailySteps.toLocaleString()} steps`
          : "Not set",
    },
  ];

  const dietaryItems = user?.dietaryPreferences?.length
    ? user.dietaryPreferences.map(formatLabel)
    : [];
  const medicalItems = user?.medicalConditions?.length
    ? user.medicalConditions
    : [];
  const heroCardClass = isDark
    ? "rounded-[32px] border border-accent-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.26),rgba(13,16,24,0.96)_38%,rgba(11,11,11,1)_100%)] p-5 shadow-card-lg"
    : "rounded-[32px] border border-[#d9e3f5] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]";
  const profileBadgeClass = isDark
    ? "shrink-0 rounded-full border border-grey-700/40 bg-grey-900/40 px-3 py-1.5 text-caption text-grey-300"
    : "shrink-0 rounded-full border border-[#dce5f3] bg-[#f7faff] px-3 py-1.5 text-caption text-[#5f6c80]";
  const heroStatCardClass = isDark
    ? "rounded-[22px] border border-base-white/8 bg-base-white/6 p-4 backdrop-blur-sm"
    : "rounded-[22px] border border-[#dbe4f2] bg-white p-4";

  return (
    <div className="min-h-screen bg-base-black px-4 pb-safe pb-8 pt-5 text-base-white">
      <div className="mb-5 animate-soft-rise">
        <p className="text-label-sm uppercase tracking-[0.24em] text-accent-primary/80">
          Account
        </p>
        <h1 className="mt-2 text-h1">Profile</h1>
        <p className="mt-1 max-w-[28ch] text-body text-grey-500">
          A clean view of your identity, plan settings, and account security.
        </p>
      </div>

      <RevealSection className={`mb-5 ${heroCardClass}`} delay={60}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[26px] border border-accent-primary/30 bg-accent-primary/12 backdrop-blur-sm">
              <span className="text-[26px] font-semibold tracking-[0.06em] text-accent-primary">
                {getInitials()}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-caption uppercase tracking-[0.2em] text-grey-400">
                Member
              </p>
              <h2 className="mt-1 truncate text-h2">{user?.name || "User"}</h2>
              <p className="mt-1 truncate text-body text-grey-400">{user?.email}</p>
            </div>
          </div>

          <div className={profileBadgeClass}>
            {user?.isEmailVerified ? "Verified" : "Pending"}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className={heroStatCardClass}>
            <p className="text-caption uppercase tracking-[0.16em] text-grey-400">
              Dashboard Weight
            </p>
            <p className="mt-2 text-[24px] font-semibold leading-[28px]">
              {typeof currentWeightKg === "number" ? `${currentWeightKg} kg` : "--"}
            </p>
          </div>
          <div className={heroStatCardClass}>
            <p className="text-caption uppercase tracking-[0.16em] text-grey-400">
              Daily Steps
            </p>
            <p className="mt-2 text-[24px] font-semibold leading-[28px]">
              {typeof user?.dailySteps === "number"
                ? user.dailySteps.toLocaleString()
                : "--"}
            </p>
          </div>
        </div>
      </RevealSection>

      <RevealSection className={`${sectionCardClass} mb-5`} delay={120}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase tracking-[0.2em] text-grey-400">
              Personal
            </p>
            <h2 className="mt-1 text-h2">Profile Details</h2>           
          </div>

          <button
            onClick={() => {
              if (!isAnyModalOpen) setActiveModal("profile");
            }}
            disabled={isAnyModalOpen}
            className="flex h-12 items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/12 px-4 text-label-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/18 disabled:cursor-not-allowed disabled:opacity-60"
            title="Edit profile"
          >
              <EditIcon className="h-4 w-4" />
          </button>
        </div>

        {profileError && (
          <div className="mb-4 rounded-[18px] border border-semantic-error/35 bg-semantic-error/10 p-4 text-body text-semantic-error">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="mb-4 rounded-[18px] border border-semantic-success/35 bg-semantic-success/10 p-4 text-body text-semantic-success">
            {profileSuccess}
          </div>
        )}

        <div className="space-y-4">
          <div className={mutedPanelClass}>
            <p className="text-caption uppercase tracking-[0.18em] text-grey-400">
              Full Name
            </p>
            <p className="mt-2 text-body-lg text-base-white">
              {user?.name || "Not set"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {profileItems.map((item) => (
              <div key={item.label} className={mutedPanelClass}>
                <p className="text-caption uppercase tracking-[0.16em] text-grey-400">
                  {item.label}
                </p>
                <p className="mt-2 text-body text-base-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className={mutedPanelClass}>
            <p className="text-caption uppercase tracking-[0.16em] text-grey-400">
              Dietary Preferences
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dietaryItems.length ? (
                dietaryItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1.5 text-label-sm text-accent-primary"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-body text-grey-400">Not set</span>
              )}
            </div>
          </div>

          <div className={mutedPanelClass}>
            <p className="text-caption uppercase tracking-[0.16em] text-grey-400">
              Medical Conditions
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {medicalItems.length ? (
                medicalItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-grey-700/50 bg-grey-900/70 px-3 py-1.5 text-label-sm text-grey-300"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-body text-grey-400">None</span>
              )}
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection className={sectionCardClass} delay={180}>
        <button
          type="button"
          onClick={() => {
            if (!isAnyModalOpen) setActiveModal("password");
          }}
          disabled={isAnyModalOpen}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-caption uppercase tracking-[0.2em] text-grey-400">
              Security
            </p>
            <h2 className="mt-1 text-h2">Password</h2>
          </div>
          <span className="rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1 text-label-sm text-accent-primary">
            Update
          </span>
        </button>

        <p className="mt-2 max-w-[28ch] text-body text-grey-500">
          Keep your account secure with a fresh password you can remember.
        </p>

      </RevealSection>
      <section className="mx-2 p-1 animate-soft-rise animate-stagger-1">
        <button
          onClick={() => setIsLogoutConfirmOpen(true)}
          disabled={isLoggingOut || isAnyModalOpen}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-semantic-error/35 bg-semantic-error/10 text-body font-semibold text-semantic-error transition-colors hover:bg-semantic-error/16 disabled:opacity-50"
        >
          <LogoutIcon className="h-6 w-6" />
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </section>

      {activeModal === "profile" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-base-black/45 px-4 backdrop-blur-md animate-modal-overlay">
          <button
            type="button"
            aria-label="Close profile editor"
            className="absolute inset-0"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-[520px] max-h-[90vh] overflow-hidden rounded-[30px] border border-base-white/10 bg-[linear-gradient(180deg,rgba(28,28,30,0.92),rgba(15,18,26,0.9))] p-5 py-3 my-auto shadow-card-lg backdrop-blur-xl animate-modal-sheet">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-grey-700/70" />

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-caption uppercase tracking-[0.2em] text-grey-400">
                  Edit Profile
                </p>
                <p className="mt-1 text-body text-grey-400">
                  Update your onboarding details and save the changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-700/50 bg-grey-900/60 text-grey-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="mb-4 rounded-[18px] border border-semantic-error/35 bg-semantic-error/10 p-4 text-body text-semantic-error">
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="mb-4 rounded-[18px] border border-semantic-success/35 bg-semantic-success/10 p-4 text-body text-semantic-success">
                {profileSuccess}
              </div>
            )}

            <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Name
                </p>
                <TextInput
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Your name"
                  className="border border-grey-700/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Gender
                  </p>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        gender: e.target.value as ProfileFormState["gender"],
                      }))
                    }
                    className={selectClass}
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Age
                  </p>
                  <TextInput
                    type="number"
                    value={form.age}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, age: e.target.value }))
                    }
                    placeholder="Age"
                    className="border border-grey-700/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Height
                  </p>
                  <TextInput
                    type="number"
                    value={form.heightValue}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        heightValue: e.target.value,
                      }))
                    }
                    placeholder="Height"
                    className="border border-grey-700/40"
                  />
                </div>
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Unit
                  </p>
                  <select
                    value={form.heightUnit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        heightUnit: e.target.value as ProfileFormState["heightUnit"],
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Weight
                  </p>
                  <TextInput
                    type="number"
                    value={form.weightValue}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        weightValue: e.target.value,
                      }))
                    }
                    placeholder="Weight"
                    className="border border-grey-700/40"
                  />
                </div>
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Unit
                  </p>
                  <select
                    value={form.weightUnit}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        weightUnit: e.target.value as ProfileFormState["weightUnit"],
                      }))
                    }
                    className={selectClass}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Goal
                  </p>
                  <select
                    value={form.goal}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        goal: e.target.value as ProfileFormState["goal"],
                      }))
                    }
                    className={selectClass}
                  >
                    {GOAL_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                    Activity
                  </p>
                  <select
                    value={form.activityLevel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        activityLevel:
                          e.target.value as ProfileFormState["activityLevel"],
                      }))
                    }
                    className={selectClass}
                  >
                    {ACTIVITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Daily Steps
                </p>
                <TextInput
                  type="number"
                  value={form.dailySteps}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dailySteps: e.target.value }))
                  }
                  placeholder="Daily steps"
                  className="border border-grey-700/40"
                />
              </div>

              <div>
                <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Dietary Preferences
                </p>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((option) => {
                    const active = form.dietaryPreferences.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleDietaryPreference(option)}
                        className={`rounded-full border px-3 py-2 text-label-sm transition-colors ${
                          active
                            ? "border-accent-primary/30 bg-accent-primary/12 text-accent-primary"
                            : "border-grey-700/50 bg-grey-900/55 text-grey-300"
                        }`}
                      >
                        {formatLabel(option)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Medical Conditions
                </p>
                <TextInput
                  value={form.medicalConditionsRaw}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      medicalConditionsRaw: e.target.value,
                    }))
                  }
                  placeholder="Example: thyroid, diabetes"
                  className="border border-grey-700/40"
                />
                <p className="mt-2 text-caption text-grey-500">
                  Separate multiple conditions with commas.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveModal(null)}
                className="w-full border-grey-700/50 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileSave}
                loading={isSavingProfile}
                className="w-full bg-accent-primary text-black hover:bg-accent-primary/90"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "password" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-base-black/45 px-4 pb-6 pt-10 backdrop-blur-md animate-modal-overlay">
          <button
            type="button"
            aria-label="Close password modal"
            className="absolute inset-0"
            onClick={() => setActiveModal(null)}
          />

          <div className="relative w-full max-w-[420px] rounded-[30px] border border-base-white/10 bg-[linear-gradient(180deg,rgba(28,28,30,0.92),rgba(15,18,26,0.9))] p-5 shadow-card-lg backdrop-blur-xl animate-modal-sheet">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-grey-700/70" />

            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-caption uppercase tracking-[0.2em] text-grey-400">
                  Security
                </p>
                <p className="mt-1 text-body text-grey-400">
                  Change your password and keep your account secure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-grey-700/50 bg-grey-900/60 text-grey-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 rounded-[18px] border border-semantic-error/35 bg-semantic-error/10 p-4 text-body text-semantic-error">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 rounded-[18px] border border-semantic-success/35 bg-semantic-success/10 p-4 text-body text-semantic-success">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Current Password
                </label>
                <TextInput
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="border border-grey-700/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  New Password
                </label>
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="border border-grey-700/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-label-sm uppercase tracking-[0.14em] text-grey-400">
                  Confirm Password
                </label>
                <TextInput
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="border border-grey-700/40"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                loading={isChangingPassword}
                fullWidth
                className="mt-2 bg-white text-base-black hover:bg-accent-primary/90"
              >
                Change Password
              </Button>

              <p className="text-caption text-grey-500">
                Password must be at least 6 characters long. After changing it,
                you may need to sign in again.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-base-black/45 px-4 pb-6 pt-10 backdrop-blur-md animate-modal-overlay">
          <button
            type="button"
            aria-label="Close logout confirmation"
            className="absolute inset-0"
            onClick={() => setIsLogoutConfirmOpen(false)}
          />

          <div className="relative w-full max-w-[420px] rounded-[30px] border border-base-white/10 bg-[linear-gradient(180deg,rgba(28,28,30,0.92),rgba(15,18,26,0.9))] p-5 shadow-card-lg backdrop-blur-xl animate-modal-sheet">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-grey-700/70" />

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-semantic-error/25 bg-semantic-error/10 text-semantic-error">
                <LogoutIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-h3 text-base-white">Log out?</p>
                <p className="mt-1 text-body text-grey-400">
                  You will need to sign in again to access your dashboard,
                  meals, and profile settings.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="w-full border-grey-700/50 bg-transparent"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={async () => {
                  await handleLogout();
                  setIsLogoutConfirmOpen(false);
                }}
                disabled={isLoggingOut}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-card border border-semantic-error/25 bg-semantic-error/12 px-6 text-body-lg font-semibold text-semantic-error transition-colors hover:bg-semantic-error/18 disabled:opacity-50"
              >
                <LogoutIcon className="h-4.5 w-4.5" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader } from "../../components/ui/Loader";
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
  const navigate = useNavigate();
  const { data: meData, isLoading: isLoadingMe } = useGetMeQuery();
  const { data: dashboardData } = useGetHomeDashboardQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [saveOnboarding, { isLoading: isSavingProfile }] =
    useSaveOnboardingMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
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

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      navigate("/login");
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
        dietaryPreferences: form.dietaryPreferences as import("../../features/onboarding/onboarding.types").DietaryPreference[],
        medicalConditions: form.medicalConditionsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }).unwrap();

      setProfileSuccess("Profile updated successfully.");
      setIsEditingProfile(false);
    } catch (err: any) {
      const message =
        err?.data?.message || "Could not update profile. Please try again.";
      setProfileError(message);
    }
  };

  if (isLoadingMe) return <Loader />;

  // Generate avatar initials
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

  return (
    <div className="min-h-screen bg-base-black px-4 pb-8 pt-6 text-base-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-h1">Profile</h1>
        <p className="mt-1 text-body text-grey-500">
          Manage your account settings and personal information
        </p>
      </div>

      {/* User Profile Card */}
      <section className="mb-8 rounded-[28px] border border-grey-700/50 bg-[radial-gradient(circle_at_top_left,rgba(11,95,255,0.22),rgba(9,9,13,0.2)_38%,rgba(9,9,13,0.9)_100%)] p-6 shadow-card-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-primary/20 border border-accent-primary/40">
              <span className="text-[32px] font-semibold text-accent-primary">
                {getInitials()}
              </span>
            </div>

            {/* User Info */}
            <div>
              <h2 className="text-h2">{user?.name || "User"}</h2>
              <p className="mt-1 text-body text-grey-400">{user?.email}</p>
              <p className="mt-2 inline-flex rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-label-sm text-accent-primary">
                {user?.isEmailVerified ? "✓ Verified" : "Pending verification"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-12 px-5 rounded-full border border-semantic-error/40 bg-semantic-error/10 text-semantic-error font-semibold hover:bg-semantic-error/20 transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? "..." : "Logout"}
          </button>
        </div>
      </section>

      {/* Personal Information Section */}
      <section className="mb-8 rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-6 shadow-card-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-h2">Personal Information</h2>
            <p className="mt-1 text-body text-grey-500">
              10 onboarding fields used for your plan and dashboard
            </p>
          </div>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 transition-colors"
            title="Edit profile"
          >
            ✎
          </button>
        </div>

        {profileError && (
          <div className="mb-4 rounded-[16px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-semantic-error">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="mb-4 rounded-[16px] border border-semantic-success/40 bg-semantic-success/10 p-4 text-body text-semantic-success">
            {profileSuccess}
          </div>
        )}

        {!isEditingProfile ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-label-sm uppercase text-grey-400">Name</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.name || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">Gender</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.gender ? user.gender.replace("_", " ") : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">Age</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.age ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">Height</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.height
                  ? `${user.height.value} ${user.height.unit}`
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">Weight</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.weight
                  ? `${user.weight.value} ${user.weight.unit}`
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">
                Current Weight (Dashboard)
              </p>
              <p className="mt-2 text-body-lg text-base-white">
                {typeof currentWeightKg === "number"
                  ? `${currentWeightKg} kg`
                  : "Not logged"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">Goal</p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.goal ? user.goal.replace(/_/g, " ") : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">
                Activity Level
              </p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.activityLevel
                  ? user.activityLevel.replace(/_/g, " ")
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">
                Daily Steps
              </p>
              <p className="mt-2 text-body-lg text-base-white">
                {typeof user?.dailySteps === "number"
                  ? `${user.dailySteps.toLocaleString()} steps`
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase text-grey-400">
                Dietary Preferences
              </p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.dietaryPreferences?.length
                  ? user.dietaryPreferences.join(", ").replace(/_/g, " ")
                  : "Not set"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-label-sm uppercase text-grey-400">
                Medical Conditions
              </p>
              <p className="mt-2 text-body-lg text-base-white">
                {user?.medicalConditions?.length
                  ? user.medicalConditions.join(", ")
                  : "None"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-label-sm uppercase text-grey-400">Name</p>
              <TextInput
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
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
                  className="h-14 w-full rounded-card bg-grey-900 px-4 text-body-lg text-base-white outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Age
                </p>
                <TextInput
                  type="number"
                  value={form.age}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, age: e.target.value }))
                  }
                  placeholder="Age"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Height Value
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
                />
              </div>
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Height Unit
                </p>
                <select
                  value={form.heightUnit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      heightUnit: e.target
                        .value as ProfileFormState["heightUnit"],
                    }))
                  }
                  className="h-14 w-full rounded-card bg-grey-900 px-4 text-body-lg text-base-white outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
                >
                  <option value="cm">cm</option>
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Weight Value
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
                />
              </div>
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Weight Unit
                </p>
                <select
                  value={form.weightUnit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      weightUnit: e.target
                        .value as ProfileFormState["weightUnit"],
                    }))
                  }
                  className="h-14 w-full rounded-card bg-grey-900 px-4 text-body-lg text-base-white outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
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
                  className="h-14 w-full rounded-card bg-grey-900 px-4 text-body-lg text-base-white outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
                >
                  {GOAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-2 text-label-sm uppercase text-grey-400">
                  Activity
                </p>
                <select
                  value={form.activityLevel}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      activityLevel: e.target
                        .value as ProfileFormState["activityLevel"],
                    }))
                  }
                  className="h-14 w-full rounded-card bg-grey-900 px-4 text-body-lg text-base-white outline-none focus:ring-2 focus:ring-inset focus:ring-accent-primary/50"
                >
                  {ACTIVITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-label-sm uppercase text-grey-400">
                Daily Steps
              </p>
              <TextInput
                type="number"
                value={form.dailySteps}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dailySteps: e.target.value }))
                }
                placeholder="Daily steps"
              />
            </div>

            <div>
              <p className="mb-2 text-label-sm uppercase text-grey-400">
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
                      className={`rounded-full border px-3 py-2 text-label-sm ${
                        active
                          ? "border-accent-primary bg-accent-primary/20 text-accent-primary"
                          : "border-grey-700/60 bg-grey-900/50 text-grey-300"
                      }`}
                    >
                      {option.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-label-sm uppercase text-grey-400">
                Medical Conditions (comma separated)
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
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(false)}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileSave}
                loading={isSavingProfile}
                className="w-full"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Security Section - Change Password */}
      <section className="rounded-[26px] border border-grey-700/50 bg-gradient-to-r from-grey-900/80 to-grey-900/30 p-6 shadow-card-lg">
        <button
          type="button"
          onClick={() => setIsPasswordOpen((prev) => !prev)}
          className="text-h2 text-left text-accent-primary"
        >
          Change Password
        </button>

        {isPasswordOpen && passwordError && (
          <div className="mb-4 rounded-[16px] border border-semantic-error/40 bg-semantic-error/10 p-4 text-body text-semantic-error">
            {passwordError}
          </div>
        )}

        {isPasswordOpen && passwordSuccess && (
          <div className="mb-4 rounded-[16px] border border-semantic-success/40 bg-semantic-success/10 p-4 text-body text-semantic-success">
            {passwordSuccess}
          </div>
        )}

        {isPasswordOpen && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-label-lg uppercase text-grey-300 mb-2">
                Current Password
              </label>
              <TextInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block text-label-lg uppercase text-grey-300 mb-2">
                New Password
              </label>
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
              />
            </div>

            <div>
              <label className="block text-label-lg uppercase text-grey-300 mb-2">
                Confirm New Password
              </label>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              loading={isChangingPassword}
              fullWidth
              className="mt-6"
            >
              Change Password
            </Button>

            <p className="text-caption text-grey-500">
              Password must be at least 6 characters long. You'll need to log in
              again after changing it.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

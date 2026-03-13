import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { OnboardingDraft } from "./onboarding.types";

// Re-export for any consumers that still import from this module
export type {
  Gender,
  Goal,
  ActivityLevel,
  DietaryPreference,
  Measurement,
  OnboardingDraft,
} from "./onboarding.types";

interface OnboardingState {
  currentStep: number; // 1–10
  draft: OnboardingDraft;
}

// ─── SessionStorage Persistence ───────────────────────────────────────────────
// SessionStorage is cleared when the browser tab closes, which is ideal for
// onboarding: in-progress data survives page refreshes within the same session
// but is cleaned up automatically once the user is done or abandons the flow.

const STORAGE_KEY = "aahar_onboarding";

function loadFromStorage(): OnboardingState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { currentStep: 1, draft: {} };
}

function saveToStorage(state: OnboardingState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: OnboardingState = loadFromStorage();

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
      saveToStorage({ ...state });
    },
    updateDraft(state, action: PayloadAction<Partial<OnboardingDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
      saveToStorage({ ...state });
    },
    resetOnboarding(state) {
      state.currentStep = 1;
      state.draft = {};
      sessionStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { setStep, updateDraft, resetOnboarding } =
  onboardingSlice.actions;
export default onboardingSlice.reducer;

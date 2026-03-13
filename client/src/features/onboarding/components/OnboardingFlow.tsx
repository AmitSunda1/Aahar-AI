import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import { Step1Name } from "./steps/Step1Name";
import { Step2Gender } from "./steps/Step2Gender";
import { Step3Age } from "./steps/Step3Age";
import { Step4Height } from "./steps/Step4Height";
import { Step5Weight } from "./steps/Step5Weight";
import { Step6Goal } from "./steps/Step6Goal";
import { Step7ActivityLevel } from "./steps/Step7ActivityLevel";
import { Step8DailySteps } from "./steps/Step8DailySteps";
import { Step9DietaryPreferences } from "./steps/Step9DietaryPreferences";
import { Step10MedicalConditions } from "./steps/Step10MedicalConditions";

const STEPS = [
    Step1Name,
    Step2Gender,
    Step3Age,
    Step4Height,
    Step5Weight,
    Step6Goal,
    Step7ActivityLevel,
    Step8DailySteps,
    Step9DietaryPreferences,
    Step10MedicalConditions,
];

export const OnboardingFlow = () => {
    const currentStep = useSelector((s: RootState) => s.onboarding.currentStep);
    // Clamp to valid range
    const stepIndex = Math.max(0, Math.min(currentStep - 1, STEPS.length - 1));
    const StepComponent = STEPS[stepIndex];
    return <StepComponent />;
};


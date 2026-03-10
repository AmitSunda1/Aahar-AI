import { useState } from "react";


export const OnboardingFlow = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handleCompleteOnboarding = async () => {
        setIsLoading(true);
        setTimeout(() => {
            alert("Onboarding endpoint not implemented yet. Simulated completion.");
            setIsLoading(false);
        }, 1000);
    };



    return (
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">Welcome to Aahar AI!</h2>
            <p className="mb-8 text-gray-600">
                Please complete your onboarding to access the dashboard.
            </p>

            <button
                onClick={handleCompleteOnboarding}
                disabled={isLoading}
                className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 mb-4"
            >
                {isLoading ? "Completing..." : "Complete Onboarding"}
            </button>


        </div>
    );
};

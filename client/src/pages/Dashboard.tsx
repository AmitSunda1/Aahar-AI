import { AuthDashboard } from "../features/auth/components/AuthDashboard";

export const Dashboard = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
            <AuthDashboard />
        </div>
    );
};

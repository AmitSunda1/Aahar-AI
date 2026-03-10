import { useGetMeQuery, useLogoutMutation } from "../";

export const AuthDashboard = () => {
    const { data: meData } = useGetMeQuery();
    const [logout, { isLoading }] = useLogoutMutation();

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch (err) {
            console.error("Failed to logout:", err);
        }
    };

    return (
        <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-red-600 transition-colors border border-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                >
                    {isLoading ? "Logging out..." : "Logout"}
                </button>
            </div>

            <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="mb-4 text-lg font-medium text-gray-700">Welcome back!</h3>
                <p className="text-gray-600">
                    You are logged in as: <span className="font-semibold">{meData?.data?.user?.email}</span>
                </p>
                <p className="mt-2 text-sm text-green-600">
                    ✓ Onboarding completed
                </p>
            </div>
        </div>
    );
};

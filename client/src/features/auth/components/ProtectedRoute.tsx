import { Navigate, Outlet } from "react-router-dom";
import { useGetMeQuery } from "../authApi";

export const ProtectedRoute = () => {
    const { data, isLoading, isError } = useGetMeQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Loading auth state...</div>
            </div>
        );
    }

    if (isError || !data?.data?.user) {
        return <Navigate to="/login" replace />;
    }

    const { isCompletedOnboarding } = data.data.user;


    if (!isCompletedOnboarding && window.location.pathname !== "/onboarding") {
        return <Navigate to="/onboarding" replace />;
    }

    return <Outlet />;
};

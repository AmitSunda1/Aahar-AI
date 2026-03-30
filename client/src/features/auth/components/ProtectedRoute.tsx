import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useGetMeQuery } from "../authApi";
import { Loader } from "../../../components/ui/Loader";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { data, isLoading, isFetching, isError } = useGetMeQuery();
  const pathname = location.pathname;

  const isAuthenticating = (isLoading || isFetching) && !data;

  if (isAuthenticating) return <Loader />;

  if (isError || !data?.data?.user) {
    return <Navigate to="/login" replace />;
  }

  const { isCompletedOnboarding } = data.data.user;

  if (!isCompletedOnboarding && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (isCompletedOnboarding && pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

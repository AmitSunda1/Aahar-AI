import { Navigate, Outlet } from "react-router-dom";
import { useGetMeQuery } from "../authApi";
import { Loader } from "../../../components/ui/Loader";

export const ProtectedRoute = () => {
  const { data, isLoading, isFetching, isError } = useGetMeQuery();

  const isAuthenticating = (isLoading || isFetching) && !data;

  if (isAuthenticating) return <Loader />;

  if (isError || !data?.data?.user) {
    return <Navigate to="/login" replace />;
  }

  const { isCompletedOnboarding } = data.data.user;

  if (!isCompletedOnboarding && window.location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  if (isCompletedOnboarding && window.location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

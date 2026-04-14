import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useGetMeQuery } from "../authApi";
import { Loader } from "../../../components/ui/Loader";

const getQueryErrorStatus = (error: unknown): number | string | undefined => {
  if (!error || typeof error !== "object") return undefined;

  if ("status" in error) {
    const maybeStatus = (error as { status?: number | string }).status;
    return maybeStatus;
  }

  return undefined;
};

export const ProtectedRoute = () => {
  const location = useLocation();
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetMeQuery();
  const pathname = location.pathname;

  const isAuthenticating = (isLoading || isFetching) && !data;

  if (isAuthenticating) return <Loader />;

  if (isError) {
    const status = getQueryErrorStatus(error);

    // Redirect to login only when auth is truly invalid.
    if (status === 401 || status === 403) {
      return (
        <Navigate
          to="/login"
          replace
          state={{
            authError: "Your session has expired. Please sign in again.",
          }}
        />
      );
    }

    return (
      <div className="px-4 pt-6 text-base-white">
        <div className="rounded-[20px] border border-semantic-error/40 bg-semantic-error/10 p-4">
          <h2 className="text-h3">Unable to verify your session</h2>
          <p className="mt-2 text-body text-grey-300">
            We could not reach the server. Check your internet connection and
            try again.
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-4 h-11 rounded-full bg-accent-primary px-5 text-body font-semibold text-base-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.data?.user) {
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

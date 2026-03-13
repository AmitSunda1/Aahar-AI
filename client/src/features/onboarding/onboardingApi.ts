import { baseApi } from "../../app/api/baseApi";
import { authApi } from "../auth/authApi";
import type { OnboardingDraft } from "./onboarding.types";

interface OnboardingResponse {
  success: boolean;
  message: string;
  data: { user: Record<string, unknown> };
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    saveOnboarding: builder.mutation<OnboardingResponse, OnboardingDraft>({
      query: (body) => ({
        url: "/user/onboarding",
        method: "PATCH",
        body,
      }),
      // No invalidatesTags here — onQueryStarted patches the cache directly and
      // synchronously, so there's no need for an explicit refetch. Adding
      // invalidatesTags would racing the cache update and cause ProtectedRoute to
      // briefly see isCompletedOnboarding = false while the refetch is in flight.
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            authApi.util.updateQueryData("getMe", undefined, (draft: any) => {
              if (draft?.data?.user) {
                draft.data.user.isCompletedOnboarding = true;
                Object.assign(draft.data.user, data.data.user);
              }
            }),
          );
        } catch {
          // Do nothing on failed save, standard error handling applies
        }
      },
    }),
  }),
});

export const { useSaveOnboardingMutation } = onboardingApi;

import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";

export const onboardingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        completeOnboarding: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({
                url: "/onboarding/complete",
                method: "POST",
            }),
            // Invalidate the 'Me' query to refresh user state and reflect onboarding completion
            invalidatesTags: [ApiTags.ME],
        }),
    }),
});

export const { useCompleteOnboardingMutation } = onboardingApi;

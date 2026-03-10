import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";

interface User {
    _id: string;
    email: string;
    isCompletedOnboarding: boolean;
}

interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
    };
}

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, any>({
            query: (credentials) => ({
                url: "/auth/login",
                method: "POST",
                body: credentials,
            }),
            // When a user logs in successfully, we invalidate the 'Me' query to force a refetch
            invalidatesTags: [ApiTags.ME],
        }),
        signup: builder.mutation<AuthResponse, any>({
            query: (userData) => ({
                url: "/auth/signup",
                method: "POST",
                body: userData,
            }),
            invalidatesTags: [ApiTags.ME],
        }),
        logout: builder.mutation<{ success: boolean; message: string }, void>({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
            invalidatesTags: [ApiTags.ME],
        }),
        getMe: builder.query<AuthResponse, void>({
            query: () => "/auth/me",
            providesTags: [ApiTags.ME],
        }),
    }),
});

export const {
    useLoginMutation,
    useSignupMutation,
    useLogoutMutation,
    useGetMeQuery,
} = authApi;

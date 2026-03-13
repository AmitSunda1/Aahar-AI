import { baseApi } from "../../app/api/baseApi";
import { ApiTags } from "../../app/api/apiTags";

interface User {
    _id: string;
    email: string;
    isEmailVerified: boolean;
    isCompletedOnboarding: boolean;
}

interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: User;
    };
}

interface MessageResponse {
    success: boolean;
    message: string;
}

interface VerifyOtpRequest {
    email: string;
    otp: string;
}

interface ResendOtpRequest {
    email: string;
}

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, any>({
            query: (credentials) => ({
                url: "/auth/login",
                method: "POST",
                body: credentials,
            }),
            invalidatesTags: [ApiTags.ME],
        }),
        signup: builder.mutation<MessageResponse, any>({
            query: (userData) => ({
                url: "/auth/signup",
                method: "POST",
                body: userData,
            }),
        }),
        verifyOtp: builder.mutation<AuthResponse, VerifyOtpRequest>({
            query: (body) => ({
                url: "/auth/verify-otp",
                method: "POST",
                body,
            }),
            invalidatesTags: [ApiTags.ME],
        }),
        resendOtp: builder.mutation<MessageResponse, ResendOtpRequest>({
            query: (body) => ({
                url: "/auth/resend-otp",
                method: "POST",
                body,
            }),
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
    useVerifyOtpMutation,
    useResendOtpMutation,
    useLogoutMutation,
    useGetMeQuery,
} = authApi;
